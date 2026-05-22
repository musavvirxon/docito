import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface AdvancedMetrics {
  roi: number | null;
  roas: number | null;
  adRevenue: number;
  adCost: number;
  workingCapital: number | null;
  workingCapitalRatio: number | null;
  netProfitMargin: number | null;
  grossProfitMargin: number | null;
  ebitda: number | null;
  breakEvenUnits: number | null;
  revenueRunRate: number;
  cac: number | null;
  ltv: number | null;
  cacToLtvRatio: number | null;
}

export const useAdvancedFinancialMetrics = (
  revenue: number,
  entityType: 'doctor' | 'practice' | 'platform' = 'doctor',
  entityId?: string
) => {
  const { user } = useAuth();
  const [targetEntityId, setTargetEntityId] = useState<string | null>(entityId || null);

  useEffect(() => {
    const getEntityId = async () => {
      if (entityId || !user) {
        setTargetEntityId(entityId || null);
        return;
      }

      if (entityType === 'doctor') {
        const { data } = await supabase
          .from('doctors')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (data) setTargetEntityId(data.id);
      } else if (entityType === 'practice') {
        const { data } = await supabase
          .from('practices')
          .select('id')
          .eq('admin_id', user.id)
          .single();
        
        if (data) setTargetEntityId(data.id);
      }
    };

    getEntityId();
  }, [user, entityType, entityId]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['advanced-financial-metrics', entityType, targetEntityId, revenue],
    queryFn: async () => {
      if (!targetEntityId) throw new Error('No entity ID');

      // Fetch financial inputs
      const { data: inputsData, error: inputsError } = await supabase
        .from('financial_inputs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', targetEntityId)
        .maybeSingle();

      if (inputsError && inputsError.code !== 'PGRST116') {
        throw inputsError;
      }

      const inputs = inputsData || {
        ad_cost: null,
        cogs: null,
        operating_expenses: null,
        interest_expense: null,
        tax_expense: null,
        depreciation_expense: null,
        marketing_spend: null,
        current_assets: null,
        current_liabilities: null,
        fixed_costs: null,
        variable_cost_per_unit: null,
        price_per_unit: null,
        avg_customer_lifetime_months: null,
      };

      // Get additional revenue data for calculations
      let adRevenue = 0;
      let totalCustomers = 0;
      let avgRevenuePerCustomer = 0;

      if (entityType === 'doctor') {
        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select('patient_id, status')
          .eq('doctor_id', targetEntityId);

        const uniquePatients = new Set((appointmentsData || []).map(a => a.patient_id));
        totalCustomers = uniquePatients.size;
        avgRevenuePerCustomer = totalCustomers > 0 ? revenue / totalCustomers : 0;

        // Ad revenue calculation (assuming some portion of revenue comes from ads)
        adRevenue = inputs.ad_cost ? (inputs.ad_cost * 5) : 0; // Example: 5x return assumption if not tracked
      } else if (entityType === 'practice') {
        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select('patient_id, status')
          .eq('practice_id', targetEntityId);

        const uniquePatients = new Set((appointmentsData || []).map(a => a.patient_id));
        totalCustomers = uniquePatients.size;
        avgRevenuePerCustomer = totalCustomers > 0 ? revenue / totalCustomers : 0;

        adRevenue = inputs.ad_cost ? (inputs.ad_cost * 5) : 0;
      }

      // Calculate metrics
      const adCost = inputs.ad_cost || 0;
      const cogs = inputs.cogs || 0;
      const operatingExpenses = inputs.operating_expenses || 0;
      const interestExpense = inputs.interest_expense || 0;
      const taxExpense = inputs.tax_expense || 0;
      const depreciationExpense = inputs.depreciation_expense || 0;
      const marketingSpend = inputs.marketing_spend || adCost;
      const currentAssets = inputs.current_assets;
      const currentLiabilities = inputs.current_liabilities;
      const fixedCosts = inputs.fixed_costs;
      const variableCostPerUnit = inputs.variable_cost_per_unit;
      const pricePerUnit = inputs.price_per_unit;
      const avgCustomerLifetimeMonths = inputs.avg_customer_lifetime_months || 24;

      // Gross Profit = Revenue - COGS
      const grossProfit = revenue - cogs;
      
      // Gross Profit Margin = (Gross Profit / Revenue) * 100
      const grossProfitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : null;

      // Operating Income = Gross Profit - Operating Expenses
      const operatingIncome = grossProfit - operatingExpenses;

      // EBITDA = Operating Income + Depreciation
      const ebitda = operatingIncome + depreciationExpense;

      // Net Income = Operating Income - Interest - Taxes
      const netIncome = operatingIncome - interestExpense - taxExpense;

      // Net Profit Margin = (Net Income / Revenue) * 100
      const netProfitMargin = revenue > 0 ? (netIncome / revenue) * 100 : null;

      // ROI = (Net Income / Total Investment) * 100
      // Using operating expenses as proxy for investment
      const totalInvestment = operatingExpenses + adCost + marketingSpend;
      const roi = totalInvestment > 0 ? (netIncome / totalInvestment) * 100 : null;

      // ROAS = Ad Revenue / Ad Cost
      const roas = adCost > 0 ? adRevenue / adCost : null;

      // Working Capital = Current Assets - Current Liabilities
      const workingCapital = (currentAssets !== null && currentLiabilities !== null) 
        ? currentAssets - currentLiabilities 
        : null;

      // Working Capital Ratio = Current Assets / Current Liabilities
      const workingCapitalRatio = (currentAssets !== null && currentLiabilities !== null && currentLiabilities > 0)
        ? currentAssets / currentLiabilities
        : null;

      // Break-Even Point (Units) = Fixed Costs / (Price per Unit - Variable Cost per Unit)
      const breakEvenUnits = (fixedCosts !== null && pricePerUnit !== null && variableCostPerUnit !== null && (pricePerUnit - variableCostPerUnit) > 0)
        ? fixedCosts / (pricePerUnit - variableCostPerUnit)
        : null;

      // Revenue Run Rate = Current Monthly Revenue * 12
      const revenueRunRate = revenue * 12;

      // CAC = Total Marketing & Sales Costs / Number of New Customers
      const cac = totalCustomers > 0 ? marketingSpend / totalCustomers : null;

      // LTV = Average Revenue per Customer * Average Customer Lifetime (months)
      const ltv = avgRevenuePerCustomer * avgCustomerLifetimeMonths;

      // CAC to LTV Ratio
      const cacToLtvRatio = (cac !== null && cac > 0 && ltv > 0) ? ltv / cac : null;

      const metrics: AdvancedMetrics = {
        roi,
        roas,
        adRevenue,
        adCost,
        workingCapital,
        workingCapitalRatio,
        netProfitMargin,
        grossProfitMargin,
        ebitda,
        breakEvenUnits,
        revenueRunRate,
        cac,
        ltv: ltv > 0 ? ltv : null,
        cacToLtvRatio,
      };

      return metrics;
    },
    enabled: !!targetEntityId,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  return {
    metrics: data || {
      roi: null,
      roas: null,
      adRevenue: 0,
      adCost: 0,
      workingCapital: null,
      workingCapitalRatio: null,
      netProfitMargin: null,
      grossProfitMargin: null,
      ebitda: null,
      breakEvenUnits: null,
      revenueRunRate: 0,
      cac: null,
      ltv: null,
      cacToLtvRatio: null,
    },
    loading: isLoading,
    error: error?.message || null,
    refreshData: refetch,
  };
};
