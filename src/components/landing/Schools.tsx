'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, BookOpen, Lock, Server, FileCheck, Users } from 'lucide-react';

const trustItems = [
  {
    icon: ShieldCheck,
    title: 'KVKK Uyumlu',
    description: 'Tüm verileriniz Türkiye\'deki sunucularda, KVKK standartlarına uygun olarak saklanır.',
  },
  {
    icon: BookOpen,
    title: 'MEB Müfredatı',
    description: '%100 müfredat uyumlu içerik üretimi. Talim Terbiye Kurulu standartlarını esas alır.',
  },
  {
    icon: Lock,
    title: 'Uçtan Uca Şifreleme',
    description: 'Öğrenci ve öğretmen verileri 256-bit SSL sertifikası ile korunur.',
  },
];

export function Schools() {
  return (
    <section className="py-16 lg:py-24 relative bg-card/50 border-y border-border/50">
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            GÜVENLİK VE UYUM
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
            Okulunuz İçin <span className="text-primary">Kurumsal Güvence</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Eğitim teknolojilerinde güvenlik bir seçenek değil, zorunluluktur.
          </p>
        </motion.div>

        {/* Trust Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {trustItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-6 rounded-2xl bg-background border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <item.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="mt-16 p-8 rounded-3xl bg-primary/5 border border-primary/10 text-center">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Türkiye Sunucuları</span>
            </div>
            <div className="hidden md:block w-px h-8 bg-border" />
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">ISO 27001 Sertifikalı</span>
            </div>
            <div className="hidden md:block w-px h-8 bg-border" />
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">7/24 Teknik Destek</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
