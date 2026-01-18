'use client';

import { motion } from 'framer-motion';
import { 
  Video, 
  PenTool, 
  BookOpen, 
  Zap, 
  Target, 
  Shield,
  Sparkles,
  Users,
  Globe,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Video,
    title: 'Lipsync Teknolojisi',
    description: 'Dudak hareketleri mükemmel senkronize. Videonuz tamamen doğal görünür, sanki gerçekten siz konuşuyorsunuz.',
    gradient: 'from-blue-500/20 to-indigo-500/20',
    iconColor: 'text-blue-500',
    borderColor: 'group-hover:border-blue-500/50',
    size: 'lg:col-span-2 lg:row-span-2',
    featured: true,
  },
  {
    icon: PenTool,
    title: 'Soru Çözümü',
    description: 'Her derste interaktif problem çözme. Tablet üzerinde yazarak çözüm gösterimi.',
    gradient: 'from-orange-500/20 to-red-500/20',
    iconColor: 'text-orange-500',
    borderColor: 'group-hover:border-orange-500/50',
    size: 'lg:col-span-1',
  },
  {
    icon: BookOpen,
    title: 'Müfredata Uygun',
    description: 'MEB müfredatıyla tam uyumlu içerik üretimi.',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-500',
    borderColor: 'group-hover:border-emerald-500/50',
    size: 'lg:col-span-1',
  },
  {
    icon: Zap,
    title: 'Dakikalar İçinde',
    description: 'Saatler değil, dakikalar içinde hazır. Zamandan %90 tasarruf edin.',
    gradient: 'from-amber-500/20 to-yellow-500/20',
    iconColor: 'text-amber-500',
    borderColor: 'group-hover:border-amber-500/50',
    size: 'lg:col-span-1',
  },
  {
    icon: Target,
    title: 'Kişiselleştirilmiş',
    description: 'Her sınıf seviyesine, her konuya özel videolar.',
    gradient: 'from-rose-500/20 to-pink-500/20',
    iconColor: 'text-rose-500',
    borderColor: 'group-hover:border-rose-500/50',
    size: 'lg:col-span-1',
  },
  {
    icon: Shield,
    title: 'Güvenli Altyapı',
    description: 'Okul verileri tamamen korumalı. KVKK uyumlu, güvenli veri merkezi.',
    gradient: 'from-cyan-500/20 to-sky-500/20',
    iconColor: 'text-cyan-500',
    borderColor: 'group-hover:border-cyan-500/50',
    size: 'lg:col-span-1 lg:row-span-2',
  },
  {
    icon: Users,
    title: 'Öğrenci Takibi',
    description: 'Hangi öğrenci hangi videoyu izledi? Detaylı analitik paneli.',
    gradient: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-500',
    borderColor: 'group-hover:border-violet-500/50',
    size: 'lg:col-span-1',
  },
  {
    icon: Globe,
    title: 'Çoklu Dil',
    description: 'Türkçe ve İngilizce içerik desteği.',
    gradient: 'from-fuchsia-500/20 to-pink-500/20',
    iconColor: 'text-fuchsia-500',
    borderColor: 'group-hover:border-fuchsia-500/50',
    size: 'lg:col-span-1',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export function Features() {
  return (
    <section id="features" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Özellikler
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Eğitimi <span className="text-primary">Dönüştüren</span> Özellikler
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            AI destekli platformumuz, video oluşturmayı çocuk oyuncağına çevirir.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className={cn(
                'group relative overflow-hidden rounded-2xl border border-border bg-card p-6 lg:p-8 transition-all duration-300 hover:shadow-xl',
                feature.size,
                feature.borderColor
              )}
            >
              {/* Gradient Background */}
              <div className={cn(
                'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br',
                feature.gradient
              )} />
              
              {/* Content */}
              <div className="relative z-10">
                {/* Icon */}
                <div className={cn(
                  'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110',
                  feature.gradient
                )}>
                  <feature.icon className={cn('w-6 h-6', feature.iconColor)} />
                </div>

                {/* Title */}
                <h3 className={cn(
                  'font-semibold mb-2',
                  feature.featured ? 'text-2xl' : 'text-lg'
                )}>
                  {feature.title}
                </h3>

                {/* Description */}
                <p className={cn(
                  'text-muted-foreground',
                  feature.featured ? 'text-base' : 'text-sm'
                )}>
                  {feature.description}
                </p>

                {/* Featured Card Extra Content */}
                {feature.featured && (
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-muted/50">
                      <div className="text-2xl font-bold text-primary">98%</div>
                      <div className="text-xs text-muted-foreground">Senkronizasyon Doğruluğu</div>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50">
                      <div className="text-2xl font-bold text-primary">4K</div>
                      <div className="text-xs text-muted-foreground">Video Kalitesi</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Decorative Corner */}
              <div className="absolute -bottom-2 -right-2 w-24 h-24 bg-gradient-to-tl from-primary/5 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-border"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: BarChart3, value: '%90', label: 'Zaman Tasarrufu' },
              { icon: Video, value: '10dk', label: 'Ortalama Oluşturma' },
              { icon: Users, value: '4.9/5', label: 'Kullanıcı Puanı' },
              { icon: Shield, value: '%100', label: 'Veri Güvenliği' },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center">
                <stat.icon className="w-6 h-6 text-primary mb-2" />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
