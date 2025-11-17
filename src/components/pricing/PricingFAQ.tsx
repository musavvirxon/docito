import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

export const PricingFAQ = () => {
  const { t } = useTranslation('pricing');
  
  const faqs = [
    {
      question: t('faq.questions.changePlan.q'),
      answer: t('faq.questions.changePlan.a')
    },
    {
      question: t('faq.questions.paymentMethods.q'),
      answer: t('faq.questions.paymentMethods.a')
    },
    {
      question: t('faq.questions.freeTrial.q'),
      answer: t('faq.questions.freeTrial.a')
    },
    {
      question: t('faq.questions.dataDowngrade.q'),
      answer: t('faq.questions.dataDowngrade.a')
    },
    {
      question: t('faq.questions.refunds.q'),
      answer: t('faq.questions.refunds.a')
    },
    {
      question: t('faq.questions.hiddenFees.q'),
      answer: t('faq.questions.hiddenFees.a')
    },
    {
      question: t('faq.questions.yearlyDiscount.q'),
      answer: t('faq.questions.yearlyDiscount.a')
    },
    {
      question: t('faq.questions.separatePlans.q'),
      answer: t('faq.questions.separatePlans.a')
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl md:text-4xl font-bold">
          {t('faq.title')}
        </h2>
        <p className="text-muted-foreground text-lg">
          {t('faq.subtitle')}
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('faq.cardTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};
