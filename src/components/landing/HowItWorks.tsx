'use client';

import { motion } from 'framer-motion';
import {
  Upload,
  Settings2,
  Wand2,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const features = [
  {
    title: 'Stüdyo Kalitesi, Sıfır Ekipman',
    description: 'Öğretmeniniz sadece kameraya konuşur. Işık, kurgu veya tekrar çekim derdi yok. 2 dakikalık doğal bir kayıt yeterli.',
    icon: Upload,
    className: "md:col-span-2",
    gradient: "from-blue-50 to-indigo-50",
    iconColor: "text-blue-600",
    tips: ['Telefon kamerası yeterli', 'Tek seferlik kayıt']
  },
  {
    title: 'Müfredat Kontrolü',
    description: 'AI, belirlediğiniz pedagojik sınırlardan asla dışarı çıkmaz. %100 MEB uyumlu.',
    icon: Settings2,
    className: "md:col-span-1",
    gradient: "from-purple-50 to-fuchsia-50",
    iconColor: "text-purple-600",
    tips: ['Soru-Cevap ekleme']
  },
  {
    title: 'Dijital İkiz Teknolojisi',
    description: 'Öğretmeninizin sesi ve görüntüsü ile yüzlerce farklı ders videosunu dakikalar içinde oluşturun.',
    icon: Wand2,
    className: "md:col-span-1",
    gradient: "from-amber-50 to-orange-50",
    iconColor: "text-amber-600",
    tips: ['Kişiselleştirilmiş hitap']
  },
  {
    title: 'Veriye Dayalı Eğitim',
    description: 'Videoları interaktif hale getirin. Hangi öğrenci nerede takıldı, anlık görün.',
    icon: BarChart3,
    className: "md:col-span-2",
    gradient: "from-emerald-50 to-teal-50",
    iconColor: "text-emerald-600",
    tips: ['Detaylı izleme raporları', 'Quiz entegrasyonu', 'Öğrenci bazlı analiz']
  }
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section-padding relative bg-white overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60" />
      <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-64 h-64 bg-orange-50 rounded-full blur-3xl opacity-60" />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 lg:mb-24">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <Badge variant="outline" className="mb-4 bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 transition-colors">
              <Sparkles className="w-3 h-3 mr-1" />
              NASIL ÇALIŞIR?
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
              Eğitim Fabrikası <br className="hidden lg:block" />
              <span className="text-indigo-600">Nasıl İşler?</span>
            </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-lg text-slate-600 max-w-md leading-relaxed"
          >
            Karmaşık prodüksiyon süreçlerini unutun.
            Modern okulun ihtiyacı olan hızı ve kaliteyi yakalayın.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                feature.className
              )}
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-100 transition-opacity", feature.gradient)} />

              <div className="relative z-10 flex flex-col h-full">
                <div className={cn("w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6", feature.iconColor)}>
                  <feature.icon className="w-6 h-6" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed flex-grow">{feature.description}</p>

                <div className="mt-6 pt-6 border-t border-slate-200/60 flex flex-wrap gap-3">
                  {feature.tips.map((tip) => (
                    <div key={tip} className="flex items-center text-xs font-semibold text-slate-500 bg-white/60 px-2 py-1 rounded-md">
                      <CheckCircle2 className={cn("w-3 h-3 mr-1.5", feature.iconColor)} />
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
