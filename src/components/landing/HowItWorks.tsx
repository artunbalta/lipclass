'use client';

import { motion } from 'framer-motion';
import { 
  Upload, 
  MessageSquareText, 
  Wand2, 
  Share2, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Referans Videonuzu Yükleyin',
    description: 'Kendinizi tanıtan 2-3 dakikalık bir video çekin. İyi aydınlatma ve net ses yeterli.',
    color: 'from-blue-500 to-indigo-500',
    tips: ['Düz arka plan tercih edin', 'Doğal ışık kullanın', 'Net konuşun'],
  },
  {
    number: '02',
    icon: MessageSquareText,
    title: 'Ders Konusunu ve Promptu Girin',
    description: 'Hangi konuyu, hangi sınıfa anlatmak istediğinizi belirtin. AI gerisini halleder.',
    color: 'from-purple-500 to-pink-500',
    tips: ['MEB müfredatına uygun konular', 'Detaylı prompt yazın', 'Soru sayısını belirleyin'],
  },
  {
    number: '03',
    icon: Wand2,
    title: 'AI Videonuzu Oluşturur',
    description: 'Yapay zeka içeriği oluşturur, sese dönüştürür ve yüzünüzle senkronize eder.',
    color: 'from-orange-500 to-red-500',
    tips: ['LLM ile içerik üretimi', 'TTS ile ses oluşturma', 'Lipsync teknolojisi'],
  },
  {
    number: '04',
    icon: Share2,
    title: 'Öğrencilerinizle Paylaşın',
    description: 'Videoyu indirin veya doğrudan platform üzerinden öğrencilerinize gönderin.',
    color: 'from-emerald-500 to-teal-500',
    tips: ['Link ile paylaşım', 'QR kod oluşturma', 'İstatistik takibi'],
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-muted/30" />
      <div className="absolute inset-0 dot-pattern" />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16 lg:mb-24"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Nasıl Çalışır?
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            4 Adımda <span className="text-primary">Ders Videosu</span> Oluşturun
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Karmaşık video düzenleme yazılımlarına son. 
            Sadece birkaç dakikada profesyonel ders videoları hazırlayın.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line - Desktop */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                {/* Arrow - Desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-12 -right-3 z-10">
                    <ArrowRight className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}

                <div className="relative bg-card rounded-2xl p-6 lg:p-8 border border-border shadow-sm hover:shadow-lg transition-all duration-300 group h-full">
                  {/* Step Number */}
                  <div className="absolute -top-4 -left-2 lg:-left-4">
                    <span className={cn(
                      'text-6xl lg:text-7xl font-bold opacity-10 bg-gradient-to-br bg-clip-text text-transparent',
                      step.color
                    )}>
                      {step.number}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className={cn(
                    'relative z-10 w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110',
                    step.color
                  )}>
                    <step.icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold mb-3 relative z-10">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4 relative z-10">
                    {step.description}
                  </p>

                  {/* Tips */}
                  <ul className="space-y-2 relative z-10">
                    {step.tips.map((tip) => (
                      <li 
                        key={tip} 
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-16"
        >
          <p className="text-muted-foreground mb-4">
            Hemen denemeye başlayın. Kredi kartı gerekmez.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <a 
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
              >
                Ücretsiz Hesap Oluştur
                <ArrowRight className="w-5 h-5" />
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
