import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Quote } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';

interface Testimonial {
  name: string;
  role: string;
  avatar: string;
  content: string;
}

const testimonials: Testimonial[] = [
  {
    name: "Uğur Sorar",
    role: "Matematik Öğretmeni",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=al",
    content: "8. sınıf matematik derslerim için haftalık 5-6 video hazırlıyordum. Chalk ile aynı işi 30 dakikada bitiriyorum! Öğrencilerim videoların kalitesine hayran.",
  },
  {
    name: "Arda Aslantaş",
    role: "Fizik Öğretmeni",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=u",
    content: "Fizik derslerinde deney videoları hazırlamak çok zaman alıyordu. Chalk sayesinde teorik anlatımları hızlıca oluşturup, deneylere vakit ayırabiliyorum.",
  },
  {
    name: "Ayşe Korkmaz",
    role: "Türkçe Öğretmeni",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ayse",
    content: "TTS kalitesi o kadar iyi ki, öğrencilerim gerçek sesim olduğunu düşünüyor! 5. sınıftan 8. sınıfa kadar her seviyeye uygun içerik üretebiliyorum.",
  },
  {
    name: "Lidya Pınaroğlu",
    role: "Biyoloji Öğretmeni",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lidya",
    content: "Biyoloji derslerinde animasyonlu içerikler çok etkili. Chalk sayesinde karmaşık konuları basit ve anlaşılır hale getirmek artık çok kolay.",
  },
];

export function Testimonials() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50/50 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-50/50 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2 pointer-events-none opacity-40" />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <Badge variant="outline" className="mb-4 bg-slate-50 text-indigo-700 border-indigo-100 hover:bg-slate-100">
            <Sparkles className="w-3 h-3 mr-1" />
            KULLANICI YORUMLARI
          </Badge>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Öğretmenlerimiz <span className="text-indigo-600">Ne Diyor?</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Binlerce öğretmen Chalk ile ders videoları oluşturuyor.
          </p>
        </motion.div>

        {/* 2x2 Grid Layout - Perfectly Centered */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
            >
              <Card className="h-full border-slate-100 shadow-sm hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-12 w-12 border border-slate-100">
                      <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                      <AvatarFallback>{testimonial.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{testimonial.name}</h3>
                      <p className="text-slate-500 text-xs">{testimonial.role}</p>
                    </div>
                    <div className="ml-auto text-indigo-100">
                      <Quote className="h-6 w-6 fill-current" />
                    </div>
                  </div>

                  <p className="text-slate-600 text-sm leading-relaxed flex-grow">
                    &quot;{testimonial.content}&quot;
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
