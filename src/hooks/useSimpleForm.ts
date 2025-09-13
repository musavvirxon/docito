import { useState, useCallback } from 'react';
import { DISABLE_VALIDATION, DUMMY_DATA } from '@/config/quickDevConfig';
import { useToast } from '@/hooks/use-toast';

type FormType = 'patient' | 'doctor' | 'practice';

export const useSimpleForm = <T extends Record<string, any>>(
  initialState: T,
  formType?: FormType
) => {
  const [formData, setFormData] = useState<T>(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const updateField = useCallback((field: keyof T, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const updateFields = useCallback((fields: Partial<T>) => {
    setFormData(prev => ({
      ...prev,
      ...fields
    }));
  }, []);

  const fillDummyData = useCallback(() => {
    if (DISABLE_VALIDATION && formType && DUMMY_DATA[formType]) {
      const dummyData = DUMMY_DATA[formType] as unknown as Partial<T>;
      setFormData(prev => ({
        ...prev,
        ...dummyData
      }));
      toast({
        title: "Dummy Data Filled",
        description: "Form filled with test data for development",
        duration: 2000,
      });
    }
  }, [formType, toast]);

  const resetForm = useCallback(() => {
    setFormData(initialState);
  }, [initialState]);

  const isValid = useCallback(() => {
    // In dev mode with validation disabled, always return true
    if (DISABLE_VALIDATION) {
      return true;
    }
    
    // Basic validation logic for production
    const requiredFields = Object.keys(initialState).filter(key => 
      typeof initialState[key as keyof T] === 'string' && 
      key.includes('email') || key.includes('password') || key.includes('name')
    );
    
    return requiredFields.every(field => 
      formData[field as keyof T] && 
      String(formData[field as keyof T]).trim() !== ''
    );
  }, [formData, initialState]);

  const handleSubmit = useCallback(async (
    submitFn: (data: T) => Promise<void>,
    options?: { skipValidation?: boolean }
  ) => {
    if (!DISABLE_VALIDATION && !options?.skipValidation && !isValid()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    try {
      await submitFn(formData);
      return true;
    } catch (error) {
      console.error('Form submission error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [formData, isValid, toast]);

  return {
    formData,
    updateField,
    updateFields,
    fillDummyData,
    resetForm,
    isValid: isValid(),
    isLoading,
    setIsLoading,
    handleSubmit,
    isDevMode: DISABLE_VALIDATION,
    canFillDummy: DISABLE_VALIDATION && formType && !!DUMMY_DATA[formType]
  };
};