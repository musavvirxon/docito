import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

const faqs = [
  {
    question: 'How do I book an appointment?',
    answer: 'Simply search for a doctor by specialty or location, view their available slots, and book instantly. You\'ll receive immediate confirmation via email and SMS.',
  },
  {
    question: 'Is my health data secure?',
    answer: 'Absolutely. We use bank-level encryption and are fully HIPAA compliant. Your data is stored in secure, certified data centers with 24/7 monitoring.',
  },
  {
    question: 'Can I use my insurance?',
    answer: 'Yes! We work with all major insurance providers. Our system automatically verifies your coverage and handles direct billing so you don\'t have to deal with paperwork.',
  },
  {
    question: 'How do doctors join the platform?',
    answer: 'Healthcare providers can sign up for free and complete our verification process. We verify credentials, licenses, and certifications to ensure quality care for patients.',
  },
  {
    question: 'Is there a mobile app?',
    answer: 'Our mobile app is coming soon for iOS and Android. In the meantime, our website is fully optimized for mobile devices with all features accessible.',
  },
  {
    question: 'What if I need to cancel or reschedule?',
    answer: 'You can easily cancel or reschedule appointments through your dashboard up to 24 hours before the appointment time. Some providers may have different policies.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-muted/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground font-light">
            Everything you need to know about Docito
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 text-left"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-medium text-foreground pr-4">{faq.question}</h3>
                  <motion.div
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </motion.div>
                </div>
                <motion.div
                  initial={false}
                  animate={{
                    height: openIndex === index ? 'auto' : 0,
                    opacity: openIndex === index ? 1 : 0,
                    marginTop: openIndex === index ? 16 : 0,
                  }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <p className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </motion.div>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
