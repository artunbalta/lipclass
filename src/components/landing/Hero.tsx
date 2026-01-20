'use client';

import { motion } from 'framer-motion';
import { Play, ArrowRight, Sparkles, Zap, Users, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import Image from 'next/image';

const floatingBadges = [
  { label: '10x Daha Hızlı', icon: Zap, position: 'top-20 -left-4 lg:left-8' },
  { label: 'Müfredata Uygun', icon: Users, position: 'top-40 -right-4 lg:right-8' },
  { label: 'AI Destekli', icon: Sparkles, position: 'bottom-20 -left-4 lg:left-16' },
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Effects - Removed for Aurora Background */}

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
        <div className="max-w-5xl mx-auto">
          {/* Floating Badges */}
          {floatingBadges.map((badge, index) => (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + index * 0.2, duration: 0.5 }}
              className={`absolute hidden lg:flex ${badge.position} z-10`}
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3 + index, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Badge 
                  variant="secondary" 
                  className="px-4 py-2 text-sm font-medium shadow-lg bg-card border border-border flex items-center gap-2"
                >
                  <badge.icon className="w-4 h-4 text-primary" />
                  {badge.label}
                </Badge>
              </motion.div>
            </motion.div>
          ))}

          {/* Main Content */}
          <div className="text-center">
            {/* Top Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge 
                variant="outline" 
                className="mb-6 px-4 py-2 text-sm font-medium border-primary/30 bg-primary/5"
              >
                <Sparkles className="w-4 h-4 mr-2 text-primary" />
                Türkiye&apos;nin İlk AI Eğitim Video Platformu
              </Badge>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6"
            >
              <span className="block">Bir Video Çek,</span>
              <span className="block mt-2 bg-gradient-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent">
                Binlerce Ders Oluştur
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
            >
              Referans videonuzu yükleyin, konu ve promptu girin. 
              AI sizin için mükemmel senkronize, müfredata uygun ders videoları oluştursun.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            >
              <Link href="/signup">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto text-base px-8 py-6 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 gap-2"
                >
                  Ücretsiz Dene
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg"
                className="w-full sm:w-auto text-base px-8 py-6 border-2 hover:bg-muted/50 gap-2"
              >
                <Play className="w-5 h-5" />
                Demo İzle
              </Button>
            </motion.div>

            {/* Hero Visual - Container Scroll Animation */}
            <div className="relative max-w-4xl mx-auto mt-12">
              <ContainerScroll
                titleComponent={
                  <>
                    <h1 className="text-4xl font-semibold text-foreground">
                      Eğitimde Yeni Bir Dönem <br />
                      <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none bg-gradient-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent">
                        AI ile Başlıyor
                      </span>
                    </h1>
                  </>
                }
              >
                <div className="relative w-full h-full min-h-[400px] md:min-h-[600px] flex items-center justify-center">
                  <Image
                    src="/headeranimation.png"
                    alt="LipClass - AI Eğitim Video Platformu"
                    fill
                    className="rounded-2xl object-contain"
                    draggable={false}
                    priority
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1400px"
                  />
                </div>
              </ContainerScroll>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-8 lg:gap-16"
            >
              {[
                { value: '500+', label: 'Öğretmen' },
                { value: '10,000+', label: 'Video' },
                { value: '50+', label: 'Okul' },
                { value: '100,000+', label: 'Öğrenci' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-2xl lg:text-3xl font-bold text-foreground">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
