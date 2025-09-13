import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, Phone, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
}

const bookingFAQs: FAQItem[] = [
  {
    question: "How do I book an appointment?",
    answer: "Select a procedure, choose your preferred date and time, fill in your contact information, and submit. You'll receive a confirmation email with your appointment details."
  },
  {
    question: "Can I cancel or reschedule my appointment?",
    answer: "Yes, you can cancel or reschedule up to 24 hours before your appointment through your patient dashboard or by calling our office."
  },
  {
    question: "What should I bring to my appointment?",
    answer: "Please bring a valid ID, insurance card (if applicable), and any relevant medical records or test results related to your visit."
  },
  {
    question: "How early should I arrive?",
    answer: "Please arrive 15 minutes before your scheduled appointment time to complete any necessary paperwork."
  },
  {
    question: "What if I'm running late?",
    answer: "Please call the office immediately if you're running late. We'll do our best to accommodate you, but may need to reschedule if you're more than 15 minutes late."
  },
  {
    question: "Do you accept my insurance?",
    answer: "We accept most major insurance plans. Please verify coverage with your insurance provider before your appointment, or contact our office for assistance."
  }
];

interface BookingHelpProps {
  className?: string;
}

export const BookingHelp = ({ className }: BookingHelpProps) => {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (openItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {bookingFAQs.map((faq, index) => (
            <Collapsible
              key={index}
              open={openItems.has(index)}
              onOpenChange={() => toggleItem(index)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between text-left h-auto py-3 px-3 hover:bg-muted/50"
                >
                  <span className="font-medium text-sm">{faq.question}</span>
                  {openItems.has(index) ? (
                    <ChevronUp className="w-4 h-4 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 shrink-0" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle>Need More Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground mb-4">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2 h-auto py-3"
              onClick={() => window.open('tel:+1-555-123-4567')}
            >
              <Phone className="w-4 h-4" />
              <div className="text-left">
                <div className="font-medium text-xs">Call Us</div>
                <div className="text-xs text-muted-foreground">(555) 123-4567</div>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2 h-auto py-3"
              onClick={() => window.open('mailto:support@medicalbook.com')}
            >
              <Mail className="w-4 h-4" />
              <div className="text-left">
                <div className="font-medium text-xs">Email Us</div>
                <div className="text-xs text-muted-foreground">support@medicalbook.com</div>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2 h-auto py-3"
            >
              <MessageCircle className="w-4 h-4" />
              <div className="text-left">
                <div className="font-medium text-xs">Live Chat</div>
                <div className="text-xs text-muted-foreground">Available 24/7</div>
              </div>
            </Button>
          </div>
          
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Office Hours:</strong> Monday-Friday 8:00 AM - 6:00 PM EST<br />
              <strong>Emergency:</strong> For medical emergencies, call 911 or go to your nearest emergency room.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};