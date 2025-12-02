import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface FinancialInputsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  entityType?: 'doctor' | 'practice' | 'platform';
  entityId?: string;
}

const FinancialInputsModal = ({ 
  open, 
  onOpenChange, 
  onSave,
  entityType = 'doctor',
  entityId
}: FinancialInputsModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const [inputs, setInputs] = useState({
    adCost: "",
    cogs: "",
    operatingExpenses: "",
    interestExpense: "",
    taxExpense: "",
    depreciationExpense: "",
    marketingSpend: "",
    currentAssets: "",
    currentLiabilities: "",
    fixedCosts: "",
    variableCostPerUnit: "",
    pricePerUnit: "",
    avgCustomerLifetimeMonths: "",
  });

  useEffect(() => {
    if (open) {
      loadExistingInputs();
    }
  }, [open, user, entityId]);

  const loadExistingInputs = async () => {
    if (!user) return;
    
    setLoadingData(true);
    try {
      let query = supabase
        .from('financial_inputs')
        .select('*')
        .eq('entity_type', entityType);

      if (entityId) {
        query = query.eq('entity_id', entityId);
      } else if (entityType === 'doctor') {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (doctorData) {
          query = query.eq('entity_id', doctorData.id);
        }
      } else if (entityType === 'practice') {
        const { data: practiceData } = await supabase
          .from('practices')
          .select('id')
          .eq('admin_id', user.id)
          .single();
        
        if (practiceData) {
          query = query.eq('entity_id', practiceData.id);
        }
      }

      const { data, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setInputs({
          adCost: data.ad_cost?.toString() || "",
          cogs: data.cogs?.toString() || "",
          operatingExpenses: data.operating_expenses?.toString() || "",
          interestExpense: data.interest_expense?.toString() || "",
          taxExpense: data.tax_expense?.toString() || "",
          depreciationExpense: data.depreciation_expense?.toString() || "",
          marketingSpend: data.marketing_spend?.toString() || "",
          currentAssets: data.current_assets?.toString() || "",
          currentLiabilities: data.current_liabilities?.toString() || "",
          fixedCosts: data.fixed_costs?.toString() || "",
          variableCostPerUnit: data.variable_cost_per_unit?.toString() || "",
          pricePerUnit: data.price_per_unit?.toString() || "",
          avgCustomerLifetimeMonths: data.avg_customer_lifetime_months?.toString() || "",
        });
      }
    } catch (error) {
      console.error('Error loading financial inputs:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let targetEntityId = entityId;

      if (!targetEntityId) {
        if (entityType === 'doctor') {
          const { data: doctorData } = await supabase
            .from('doctors')
            .select('id')
            .eq('user_id', user.id)
            .single();
          
          if (doctorData) {
            targetEntityId = doctorData.id;
          }
        } else if (entityType === 'practice') {
          const { data: practiceData } = await supabase
            .from('practices')
            .select('id')
            .eq('admin_id', user.id)
            .single();
          
          if (practiceData) {
            targetEntityId = practiceData.id;
          }
        }
      }

      if (!targetEntityId) {
        throw new Error('Could not determine entity ID');
      }

      const dataToSave = {
        entity_type: entityType,
        entity_id: targetEntityId,
        ad_cost: inputs.adCost ? parseFloat(inputs.adCost) : null,
        cogs: inputs.cogs ? parseFloat(inputs.cogs) : null,
        operating_expenses: inputs.operatingExpenses ? parseFloat(inputs.operatingExpenses) : null,
        interest_expense: inputs.interestExpense ? parseFloat(inputs.interestExpense) : null,
        tax_expense: inputs.taxExpense ? parseFloat(inputs.taxExpense) : null,
        depreciation_expense: inputs.depreciationExpense ? parseFloat(inputs.depreciationExpense) : null,
        marketing_spend: inputs.marketingSpend ? parseFloat(inputs.marketingSpend) : null,
        current_assets: inputs.currentAssets ? parseFloat(inputs.currentAssets) : null,
        current_liabilities: inputs.currentLiabilities ? parseFloat(inputs.currentLiabilities) : null,
        fixed_costs: inputs.fixedCosts ? parseFloat(inputs.fixedCosts) : null,
        variable_cost_per_unit: inputs.variableCostPerUnit ? parseFloat(inputs.variableCostPerUnit) : null,
        price_per_unit: inputs.pricePerUnit ? parseFloat(inputs.pricePerUnit) : null,
        avg_customer_lifetime_months: inputs.avgCustomerLifetimeMonths ? parseFloat(inputs.avgCustomerLifetimeMonths) : null,
      };

      const { error } = await supabase
        .from('financial_inputs')
        .upsert(dataToSave, {
          onConflict: 'entity_type,entity_id'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Financial inputs saved successfully",
      });

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving financial inputs:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save financial inputs",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Financial Inputs</DialogTitle>
          <DialogDescription>
            Enter financial data that cannot be automatically calculated. Leave fields blank if not applicable.
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Advertising & Marketing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adCost">Ad Cost (Monthly)</Label>
                  <Input
                    id="adCost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={inputs.adCost}
                    onChange={(e) => setInputs({ ...inputs, adCost: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marketingSpend">Marketing Spend (Monthly)</Label>
                  <Input
                    id="marketingSpend"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={inputs.marketingSpend}
                    onChange={(e) => setInputs({ ...inputs, marketingSpend: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Costs & Expenses</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cogs">COGS (Cost of Goods Sold)</Label>
                  <Input
                    id="cogs"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={inputs.cogs}
                    onChange={(e) => setInputs({ ...inputs, cogs: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="operatingExpenses">Operating Expenses (Monthly)</Label>
                  <Input
                    id="operatingExpenses"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={inputs.operatingExpenses}
                    onChange={(e) => setInputs({ ...inputs, operatingExpenses: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interestExpense">Interest Expense (Monthly)</Label>
                  <Input
                    id="interestExpense"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={inputs.interestExpense}
                    onChange={(e) => setInputs({ ...inputs, interestExpense: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxExpense">Tax Expense (Monthly)</Label>
                  <Input
                    id="taxExpense"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={inputs.taxExpense}
                    onChange={(e) => setInputs({ ...inputs, taxExpense: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depreciationExpense">Depreciation (Monthly)</Label>
                  <Input
                    id="depreciationExpense"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={inputs.depreciationExpense}
                    onChange={(e) => setInputs({ ...inputs, depreciationExpense: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Working Capital</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentAssets">Current Assets</Label>
                  <Input
                    id="currentAssets"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={inputs.currentAssets}
                    onChange={(e) => setInputs({ ...inputs, currentAssets: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentLiabilities">Current Liabilities</Label>
                  <Input
                    id="currentLiabilities"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={inputs.currentLiabilities}
                    onChange={(e) => setInputs({ ...inputs, currentLiabilities: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Break-Even Analysis</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fixedCosts">Fixed Costs (Monthly)</Label>
                  <Input
                    id="fixedCosts"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={inputs.fixedCosts}
                    onChange={(e) => setInputs({ ...inputs, fixedCosts: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="variableCostPerUnit">Variable Cost per Unit</Label>
                  <Input
                    id="variableCostPerUnit"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={inputs.variableCostPerUnit}
                    onChange={(e) => setInputs({ ...inputs, variableCostPerUnit: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePerUnit">Price per Unit</Label>
                  <Input
                    id="pricePerUnit"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={inputs.pricePerUnit}
                    onChange={(e) => setInputs({ ...inputs, pricePerUnit: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Customer Metrics</h3>
              <div className="space-y-2">
                <Label htmlFor="avgCustomerLifetimeMonths">Average Customer Lifetime (Months)</Label>
                <Input
                  id="avgCustomerLifetimeMonths"
                  type="number"
                  step="1"
                  placeholder="12"
                  value={inputs.avgCustomerLifetimeMonths}
                  onChange={(e) => setInputs({ ...inputs, avgCustomerLifetimeMonths: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || loadingData}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Inputs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FinancialInputsModal;
