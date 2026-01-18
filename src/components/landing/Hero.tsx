'use client';

import { motion } from 'framer-motion';
import { Play, ArrowRight, Sparkles, Zap, Users, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const floatingBadges = [
  { label: '10x Daha Hızlı', icon: Zap, position: 'top-20 -left-4 lg:left-8' },
  { label: 'Müfredata Uygun', icon: Users, position: 'top-40 -right-4 lg:right-8' },
  { label: 'AI Destekli', icon: Sparkles, position: 'bottom-20 -left-4 lg:left-16' },
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute inset-0 hero-pattern" />
      
      {/* Animated Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] animate-pulse delay-1000" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 grid-pattern opacity-30" />

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

            {/* Hero Visual - Mock Video Player */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="relative max-w-4xl mx-auto"
            >
              {/* Browser Frame */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border bg-card">
                {/* Browser Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-background rounded-lg px-4 py-1.5 text-sm text-muted-foreground text-center">
                      app.lipclass.com/dashboard
                    </div>
                  </div>
                </div>
                
                {/* Video Preview Area */}
                <div className="relative aspect-video bg-gradient-to-br from-slate-900 to-slate-800">
                  {/* Mock Video Content */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* Play Button Overlay */}
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center cursor-pointer shadow-lg shadow-primary/30"
                    >
                      <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
                    </motion.div>
                  </div>
                  
                  {/* Mock Teacher Silhouette */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-64 bg-gradient-to-t from-slate-700 to-transparent rounded-t-full opacity-50" />
                  
                  {/* Mock UI Elements */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full bg-red-500/80 text-white text-xs font-medium flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      CANLI
                    </div>
                  </div>
                  
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="bg-black/50 text-white border-0">
                      AI Oluşturuluyor...
                    </Badge>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: '65%' }}
                      transition={{ duration: 2, delay: 1, ease: 'easeOut' }}
                      className="h-full bg-primary"
                    />
                  </div>
                  
                  {/* Tablet Drawing Area Mock */}
                  <div className="absolute bottom-8 right-8 w-48 h-32 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 p-3">
                    <div className="text-xs text-white/60 mb-2">Soru Çözümü</div>
                    <svg className="w-full h-16" viewBox="0 0 100 40">
                      <motion.path
                        d="M 10 30 Q 30 10 50 25 T 90 15"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2, delay: 1.5 }}
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-accent/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-primary/20 rounded-full blur-2xl" />
            </motion.div>

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
