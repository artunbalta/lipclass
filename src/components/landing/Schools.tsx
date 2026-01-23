'use client';

import { motion } from 'framer-motion';
import { InfiniteSlider } from '@/components/ui/infinite-slider';
import Image from 'next/image';

// Örnek okul logoları - gerçek projede bunlar gerçek okul logoları olacak
const schools = [
  {
    name: 'Özel Okul 1',
    logo: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=200&h=120&fit=crop',
  },
  {
    name: 'Özel Okul 2',
    logo: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=200&h=120&fit=crop',
  },
  {
    name: 'Özel Okul 3',
    logo: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=200&h=120&fit=crop',
  },
  {
    name: 'Özel Okul 4',
    logo: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=200&h=120&fit=crop',
  },
  {
    name: 'Özel Okul 5',
    logo: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=200&h=120&fit=crop',
  },
  {
    name: 'Özel Okul 6',
    logo: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&h=120&fit=crop',
  },
];

export function Schools() {
  return (
    <section className="py-16 lg:py-24 relative overflow-hidden">
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Güvenilir Platform
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Çalıştığımız <span className="text-primary">Okullar</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Türkiye&apos;nin önde gelen eğitim kurumları LipClass ile ders videoları oluşturuyor.
          </p>
        </motion.div>

        {/* Infinite Slider */}
        <div className="relative">
          <InfiniteSlider
            gap={48}
            duration={30}
            durationOnHover={60}
            className="w-full"
          >
            {schools.map((school, index) => (
              <motion.div
                key={`${school.name}-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-center justify-center h-24 w-48 px-6 bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <Image
                  src={school.logo}
                  alt={school.name}
                  width={120}
                  height={60}
                  className="object-contain max-h-16 w-auto grayscale hover:grayscale-0 transition-all duration-300"
                />
              </motion.div>
            ))}
          </InfiniteSlider>
        </div>
      </div>
    </section>
  );
}
