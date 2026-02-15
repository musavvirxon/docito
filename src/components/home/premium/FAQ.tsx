import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const faqKeys = ["bookAppointment", "secureData", "useInsurance", "doctorsJoin", "mobileApp", "cancelReschedule"] as const;

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { t } = useTranslation("premium");

  return (
    <section className="py-24 bg-muted/30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">{t("faq.title", "Frequently Asked Questions")}</h2>
          <p className="text-lg text-muted-foreground font-light">{t("faq.subtitle", "Everything you need to know about Docito")}</p>
        </motion.div>

        <div className="space-y-4">
          {faqKeys.map((key, index) => (
            <motion.div key={key} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: index * 0.05 }}>
              <button onClick={() => setOpenIndex(openIndex === index ? null : index)} className="w-full p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 text-left">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-medium text-foreground pr-4">{t(`faq.items.${key}.question`)}</h3>
                  <motion.div animate={{ rotate: openIndex === index ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </motion.div>
                </div>
                <motion.div initial={false} animate={{ height: openIndex === index ? 'auto' : 0, opacity: openIndex === index ? 1 : 0, marginTop: openIndex === index ? 16 : 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                  <p className="text-muted-foreground leading-relaxed">{t(`faq.items.${key}.answer`)}</p>
                </motion.div>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
