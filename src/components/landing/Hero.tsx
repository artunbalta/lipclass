'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, Users, Play, School, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';
import GlitchText from '@/components/ui/GlitchText';

import { useState, useEffect } from 'react';

const floatingBadges = [
  { label: 'Öğretmen Zamanı x10', icon: Clock, position: 'top-20 -left-6 lg:left-0 rotate-[-4deg]' },
  { label: '%100 Müfredat Uyumu', icon: School, position: 'top-32 -right-6 lg:right-0 rotate-[4deg]' },
  { label: 'Sıfır Tükenmişlik', icon: Zap, position: 'bottom-32 -left-2 lg:left-12 rotate-[-2deg]' },
];

export function Hero() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);
  const words = ["Otonom", "Kişiselleştirilmiş", "Sınırsız"];

  useEffect(() => {
    const interval = setInterval(() => {
      // Start glitching
      setIsGlitching(true);

      // Change word after a short delay during the glitch
      setTimeout(() => {
        setCurrentWordIndex((prev) => (prev + 1) % words.length);

        // Stop glitching after the word has changed and settled
        setTimeout(() => {
          setIsGlitching(false);
        }, 500); // Glitch duration after swap
      }, 300); // Delay before swap (glitch ramping up)

    }, 3500); // Total cycle time
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white">
      {/* Background Decor - Subtle & Premium */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-50/50 blur-[120px]" />
        <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-50/40 blur-[100px]" />
      </div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Floating Badges (Desktop Only) */}
          <div className="hidden lg:block absolute inset-0 pointer-events-none max-w-7xl mx-auto">
            {floatingBadges.map((badge, index) => (
              <motion.div
                key={badge.label}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.15, duration: 0.8, ease: "easeOut" }}
                className={`absolute ${badge.position}`}
              >
                <div className="bg-white/80 backdrop-blur-md border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)] px-4 py-2.5 rounded-2xl flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                    <badge.icon className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{badge.label}</span>
                </div>
              </motion.div>
            ))}
          </div>


          <div className="relative z-20 flex flex-col items-center">
            {/* Top Pill */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-xs font-bold tracking-wide uppercase text-indigo-700">
                  EĞİTİMİN GELECEĞİ
                </span>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.1] flex flex-col items-center justify-center gap-2"
            >
              <span className="block mb-2">Öğretimin Geleceği:</span>
              <div className="h-[1.2em] flex items-center justify-center text-indigo-600 min-w-[260px] sm:min-w-[300px]"> {/* Fixed height prevents layout shift */}
                <GlitchText
                  speed={1}
                  enableShadows={true}
                  enableOnHover={false}
                  isActive={isGlitching}
                >
                  {words[currentWordIndex]}
                </GlitchText>
              </div>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
            >
              Aynı dersi tekrar tekrar anlatmak tarih oldu.
              Tek bir video ile tüm müfredatı, her seviye için
              özelleştirilmiş derslere dönüştürün.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
            >
              <Link href="/signup" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-14 px-8 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                >
                  <Play className="w-5 h-5 mr-2 fill-current" />
                  İlk Dersi Oluşturun
                </Button>
              </Link>
              <Link href="#demo" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto h-14 px-8 text-lg font-semibold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-2xl transition-all duration-300"
                >
                  Demoyu İncele
                </Button>
              </Link>
            </motion.div>

            {/* Social Proof Text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-12 flex flex-col items-center gap-3"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden relative">
                    <Image
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`}
                      alt="user"
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600">+50</div>
              </div>
              <p className="text-sm font-medium text-slate-500">
                <span className="text-indigo-600 font-bold">50+ Okul</span> ve <span className="text-indigo-600 font-bold">500+ Öğretmen</span> tarafından kullanılıyor
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
