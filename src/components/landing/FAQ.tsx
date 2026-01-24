'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: 'LipClass nasıl çalışır?',
    answer: 'Referans videonuzu yükleyin, konu ve prompt bilgilerini girin. AI sizin için mükemmel senkronize, müfredata uygun ders videoları oluşturur. Sistem, lipsync teknolojisi ile dudak hareketlerini senkronize eder ve profesyonel videolar üretir.',
  },
  {
    question: 'Hangi dersler için kullanabilirim?',
    answer: 'LipClass tüm dersler için kullanılabilir. Matematik, Fen Bilimleri, Sosyal Bilgiler, Türkçe, İngilizce ve daha fazlası için müfredata uygun içerikler oluşturabilirsiniz.',
  },
  {
    question: 'Videolar ne kadar sürede hazır olur?',
    answer: 'Video oluşturma süreci genellikle 5-10 dakika içinde tamamlanır. Video uzunluğu ve içerik karmaşıklığına göre bu süre değişebilir.',
  },
  {
    question: 'Ücretsiz deneme var mı?',
    answer: 'Evet, ücretsiz hesap açarak platformumuzu deneyebilirsiniz. Ücretsiz plan ile sınırlı sayıda video oluşturabilir ve platformun tüm özelliklerini test edebilirsiniz.',
  },
  {
    question: 'Oluşturduğum videoları nasıl paylaşabilirim?',
    answer: 'Oluşturduğunuz videoları öğrencilerinizle direkt olarak paylaşabilir veya özel bir link ile erişim sağlayabilirsiniz. Videolarınız güvenli bir şekilde saklanır ve istediğiniz zaman erişebilirsiniz.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 lg:py-32 relative">
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider mb-4">
            <HelpCircle className="w-4 h-4" />
            Sık Sorulan Sorular
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Merak Ettikleriniz
          </h2>
          <p className="text-lg text-muted-foreground">
            LipClass hakkında en çok sorulan sorular ve cevapları
          </p>
        </motion.div>

        {/* FAQ Items */}
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:shadow-md">
                <button
                  onClick={() => toggleQuestion(index)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl"
                >
                  <span className="font-semibold text-lg pr-4">{faq.question}</span>
                  <ChevronDown
                    className={cn(
                      'w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200',
                      openIndex === index && 'transform rotate-180'
                    )}
                  />
                </button>
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-0">
                        <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
