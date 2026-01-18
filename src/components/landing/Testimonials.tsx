'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MOCK_TESTIMONIALS, LANDING_STATS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const schoolLogos = [
  'Atatürk Ortaokulu',
  'Cumhuriyet İlkokulu',
  'Fatih Koleji',
  'Mehmet Akif Ersoy Ortaokulu',
  'İstanbul Anadolu Lisesi',
  'Ankara Fen Lisesi',
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-muted/30" />

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
            Müşteri Yorumları
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Öğretmenler <span className="text-primary">Ne Diyor?</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Binlerce öğretmen LipClass ile zamandan tasarruf ediyor ve 
            öğrencilerine daha kaliteli içerik sunuyor.
          </p>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 mb-16"
        >
          {LANDING_STATS.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
              className="text-center p-6 rounded-2xl bg-card border border-border"
            >
              <div className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {MOCK_TESTIMONIALS.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative group"
            >
              <div className="relative h-full p-6 lg:p-8 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-xl">
                {/* Quote Icon */}
                <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/10" />

                {/* Rating */}
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'w-4 h-4',
                        i < testimonial.rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-muted-foreground/30'
                      )}
                    />
                  ))}
                </div>

                {/* Content */}
                <p className="text-foreground/80 mb-6 leading-relaxed">
                  &ldquo;{testimonial.content}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                    <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </div>
                    <div className="text-xs text-primary">
                      {testimonial.school}
                    </div>
                  </div>
                </div>

                {/* Decorative Gradient */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* School Logos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 lg:mt-24"
        >
          <p className="text-center text-sm text-muted-foreground mb-8">
            Türkiye&apos;nin önde gelen okulları tarafından tercih ediliyor
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
            {schoolLogos.map((school, index) => (
              <motion.div
                key={school}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="px-6 py-3 rounded-lg bg-card border border-border text-muted-foreground text-sm font-medium hover:border-primary/30 hover:text-foreground transition-all duration-300"
              >
                {school}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Video Testimonial CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            500+ öğretmen şu anda aktif olarak kullanıyor
          </div>
        </motion.div>
      </div>
    </section>
  );
}
