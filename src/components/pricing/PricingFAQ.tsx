import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const PricingFAQ = () => {
  const faqs = [
    {
      question: "Can I change my plan at any time?",
      answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges or credits."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, Mastercard, American Express, Discover), as well as bank transfers for enterprise plans."
    },
    {
      question: "Is there a free trial available?",
      answer: "Yes! All new users start with our Access plan which is completely free. You can upgrade to a paid plan at any time to unlock additional features."
    },
    {
      question: "What happens to my data if I downgrade?",
      answer: "Your data is always safe with us. If you downgrade to a plan with less storage, you'll have 30 days to download or delete excess data before older records are archived."
    },
    {
      question: "Do you offer refunds?",
      answer: "Yes, we offer a 30-day money-back guarantee on all paid plans. If you're not satisfied, we'll refund your payment in full, no questions asked."
    },
    {
      question: "Are there any setup fees or hidden charges?",
      answer: "No! The price you see is the price you pay. There are no setup fees, cancellation fees, or hidden charges of any kind."
    },
    {
      question: "How does the yearly discount work?",
      answer: "When you choose yearly billing, you save 10% compared to monthly billing. You'll be charged once per year instead of every month."
    },
    {
      question: "Can doctors and clinics have different plans?",
      answer: "Absolutely! Doctors and clinics operate independently with their own separate subscription plans tailored to their specific needs."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl md:text-4xl font-bold">
          Frequently Asked Questions
        </h2>
        <p className="text-muted-foreground text-lg">
          Everything you need to know about our pricing
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Common Questions</CardTitle>
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
