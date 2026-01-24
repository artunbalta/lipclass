'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TestimonialCard } from '@/components/ui/twitter-testimonial-cards';
import type { TestimonialCardProps } from '@/components/ui/twitter-testimonial-cards';
import { cn } from '@/lib/utils';

// LipClass'a özel kullanıcı yorumları - Gerçek kullanım senaryoları
// Toplam 9 kart: Sol (3) + Orta (3) + Sağ (3)
const testimonialCards: TestimonialCardProps[] = [
  // Sol taraf - 3 kart
  {
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ali",
    username: "Ali Çelik",
    handle: "@ali_fizik",
    content: "Fizik derslerinde deney videoları hazırlamak çok zaman alıyordu. LipClass sayesinde teorik anlatımları hızlıca oluşturuyorum, deneyleri de ekleyebiliyorum. Öğrencilerim çok memnun! ⚡",
    date: "20 Oca, 2026",
    verified: true,
    likes: 198,
    retweets: 35,
    tweetUrl: "#",
  },
  {
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Canan",
    username: "Canan Arslan",
    handle: "@canan_tarih",
    content: "Tarih derslerinde görsel materyal bulmak zordu. LipClass'ın AI'ı konuya uygun içerik üretiyor ve videolarım çok profesyonel görünüyor. Öğrencilerim dersleri daha iyi anlıyor. 📚",
    date: "19 Oca, 2026",
    verified: true,
    likes: 176,
    retweets: 28,
    tweetUrl: "#",
  },
  {
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emre",
    username: "Emre Şahin",
    handle: "@emre_ingilizce",
    content: "İngilizce derslerinde telaffuz çok önemli. LipClass'ın TTS teknolojisi mükemmel, öğrencilerim doğru telaffuzu öğreniyor. Farklı seviyeler için videolar oluşturmak artık çok kolay! 🗣️",
    date: "17 Oca, 2026",
    verified: true,
    likes: 221,
    retweets: 39,
    tweetUrl: "#",
  },
  // Orta - 3 kart
  {
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ayse",
    username: "Ayşe Yılmaz",
    handle: "@ayse_matematik",
    content: "8. sınıf matematik derslerim için haftalık 5-6 video hazırlıyordum. LipClass ile aynı işi 30 dakikada bitiriyorum. Referans videomu bir kez yükledim, artık sadece konu ve prompt yazıyorum. Öğrencilerim videoların kalitesine hayran! 🎯",
    date: "18 Oca, 2026",
    verified: true,
    likes: 234,
    retweets: 42,
    tweetUrl: "#",
  },
  {
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mehmet",
    username: "Mehmet Demir",
    handle: "@mehmet_fenbilgisi",
    content: "Fen bilgisi derslerinde görsel içerik çok önemli. LipClass'ın AI'ı MEB müfredatına uygun içerik üretiyor ve lipsync teknolojisi sayesinde videolarım çok doğal görünüyor. Öğrencilerim 'Hocam nasıl bu kadar hızlı video çekiyorsunuz?' diye soruyor 😄",
    date: "16 Oca, 2026",
    verified: true,
    likes: 189,
    retweets: 31,
    tweetUrl: "#",
  },
  {
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zeynep",
    username: "Zeynep Kaya",
    handle: "@zeynep_turkce",
    content: "Türkçe derslerinde farklı sınıflar için aynı konuyu anlatmak zorundaydım. LipClass ile bir referans video yükledim, şimdi 5. sınıftan 8. sınıfa kadar her seviyeye uygun videolar oluşturuyorum. TTS kalitesi mükemmel, öğrenciler gerçek sesim olduğunu düşünüyor! 🎤",
    date: "14 Oca, 2026",
    verified: true,
    likes: 267,
    retweets: 58,
    tweetUrl: "#",
  },
  // Sağ taraf - 3 kart
  {
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Burcu",
    username: "Burcu Öztürk",
    handle: "@burcu_kimya",
    content: "Kimya derslerinde deney güvenliği çok önemli. LipClass ile teorik anlatımları hazırlayıp, deney videolarını da ekleyebiliyorum. Öğrencilerim hem teorik hem pratik bilgiyi alıyor. 🧪",
    date: "15 Oca, 2026",
    verified: true,
    likes: 203,
    retweets: 37,
    tweetUrl: "#",
  },
  {
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Deniz",
    username: "Deniz Yıldız",
    handle: "@deniz_cografya",
    content: "Coğrafya derslerinde harita ve görsel materyal hazırlamak zaman alıyordu. LipClass ile konu anlatımlarını hızlıca oluşturuyorum. AI'ın ürettiği içerikler MEB müfredatına uygun. 🌍",
    date: "13 Oca, 2026",
    verified: true,
    likes: 192,
    retweets: 29,
    tweetUrl: "#",
  },
  {
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fatih",
    username: "Fatih Korkmaz",
    handle: "@fatih_biyoloji",
    content: "Biyoloji derslerinde animasyonlu içerikler çok etkili. LipClass'ın AI teknolojisi sayesinde karmaşık konuları basit ve anlaşılır şekilde anlatabiliyorum. Öğrencilerim dersleri çok seviyor! 🧬",
    date: "12 Oca, 2026",
    verified: true,
    likes: 245,
    retweets: 45,
    tweetUrl: "#",
  },
];

// Her sütun için stacked testimonial component
function StackedTestimonials({ 
  cards, 
  columnIndex 
}: { 
  cards: TestimonialCardProps[]; 
  columnIndex: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const getCardClassName = (index: number, baseClassName: string) => {
    const focusedIndex = hoveredIndex ?? activeIndex;
    
    // Stacked görünüm için offset'ler
    if (focusedIndex === 0 && index === 1) {
      return baseClassName + " !translate-y-20 sm:!translate-y-32 !translate-x-14 sm:!translate-x-24";
    }
    if (focusedIndex === 0 && index === 2) {
      return baseClassName + " !translate-y-28 sm:!translate-y-44 !translate-x-24 sm:!translate-x-40";
    }
    if (focusedIndex === 1 && index === 2) {
      return baseClassName + " !translate-y-24 sm:!translate-y-40 !translate-x-24 sm:!translate-x-40";
    }
    return baseClassName;
  };

  const handleTap = (index: number) => {
    if (activeIndex === index) {
      return;
    }
    setActiveIndex(index);
  };

  // Her kart için stacked className'leri
  const stackedClassNames = [
    "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-2xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/60 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-500 hover:grayscale-0 before:left-0 before:top-0",
    "[grid-area:stack] translate-x-8 sm:translate-x-16 translate-y-6 sm:translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-2xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/60 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-500 hover:grayscale-0 before:left-0 before:top-0",
    "[grid-area:stack] translate-x-16 sm:translate-x-32 translate-y-12 sm:translate-y-20 hover:translate-y-6 sm:hover:translate-y-10",
  ];

  return (
    <div className="grid [grid-template-areas:'stack'] place-items-center opacity-100 animate-in fade-in-0 duration-700 min-h-[500px] scale-[0.96]">
      {cards.map((cardProps, index) => (
        <TestimonialCard
          key={`${columnIndex}-${index}`}
          {...cardProps}
          className={getCardClassName(index, stackedClassNames[index] || "")}
          onHover={() => setHoveredIndex(index)}
          onLeave={() => setHoveredIndex(null)}
          isActive={activeIndex === index}
          onTap={() => handleTap(index)}
        />
      ))}
    </div>
  );
}

export function Testimonials() {
  // Kartları 3 sütuna böl: Sol (0-2), Orta (3-5), Sağ (6-8)
  const leftColumn = testimonialCards.slice(0, 3);
  const middleColumn = testimonialCards.slice(3, 6);
  const rightColumn = testimonialCards.slice(6, 9);

  return (
    <section className="py-16 lg:py-24 relative">
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
            Kullanıcı Yorumları
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Öğretmenlerimiz <span className="text-primary">Ne Diyor?</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Binlerce öğretmen LipClass ile ders videoları oluşturuyor. 
            İşte onların deneyimleri.
          </p>
        </motion.div>

        {/* 3 Sütunlu Stacked Layout - Geniş Aralıklı */}
        <div className="relative w-full min-h-[600px]">
          {/* Sol Sütun - Stacked - Daha Sola */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="absolute -left-12 md:-left-16 lg:-left-24 xl:-left-32 top-[35%] -translate-y-1/2 -translate-x-16"
          >
            <StackedTestimonials cards={leftColumn} columnIndex={0} />
          </motion.div>

          {/* Orta Sütun - Stacked - Sola Kaydırılmış */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="absolute left-[45%] -translate-x-1/2 top-[35%] -translate-y-1/2"
          >
            <StackedTestimonials cards={middleColumn} columnIndex={1} />
          </motion.div>

          {/* Sağ Sütun - Stacked - Sola Kaydırılmış */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="absolute -right-12 md:-right-16 lg:-right-24 xl:-right-32 top-[35%] -translate-y-1/2 -translate-x-16"
          >
            <StackedTestimonials cards={rightColumn} columnIndex={2} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
