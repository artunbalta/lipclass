'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export function CTA() {
    return (
        <section className="py-24 relative overflow-hidden bg-slate-50 border-t border-slate-100">

            {/* Background Decor */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-100 rounded-full blur-[100px] opacity-60 pointer-events-none" />

            <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="bg-indigo-600 rounded-[2.5rem] p-8 sm:p-12 lg:p-20 text-center relative overflow-hidden shadow-2xl shadow-indigo-200"
                >
                    {/* Inner Glare/Decor */}
                    <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-indigo-500 rounded-full blur-3xl opacity-50" />
                    <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-40" />

                    <div className="relative z-10 max-w-3xl mx-auto space-y-8">
                        <Badge variant="secondary" className="bg-indigo-500/50 text-indigo-50 border-none backdrop-blur-sm px-4 py-1.5 mb-2">
                            <Sparkles className="w-3.5 h-3.5 mr-2 text-indigo-200" />
                            Okulunuzu Geleceğe Taşıyın
                        </Badge>

                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                            Eğitimde Dijital Dönüşümü <br className="hidden lg:block" /> Bugün Başlatın.
                        </h2>

                        <p className="text-lg md:text-xl text-indigo-100 max-w-2xl mx-auto leading-relaxed font-medium">
                            Öğretmenlerinizin zamanını verimli kullanın, öğrencilerinize kişiselleştirilmiş bir deneyim sunun. Kurulum gerektirmez.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <Link href="/signup">
                                <Button size="lg" className="h-16 px-10 text-lg rounded-2xl bg-white text-indigo-600 hover:bg-slate-50 hover:scale-105 transition-all duration-300 font-bold shadow-xl">
                                    Ücretsiz Deneyin
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </Link>
                            <Link href="/contact">
                                <Button variant="outline" size="lg" className="h-16 px-10 text-lg rounded-2xl bg-indigo-700/30 border-indigo-500 text-white hover:bg-indigo-700/50 hover:text-white font-semibold backdrop-blur-sm">
                                    Bize Ulaşın
                                </Button>
                            </Link>
                        </div>

                        <p className="text-sm text-indigo-200/80 font-medium">
                            Kredi kartı gerekmez • 14 gün ücretsiz deneme
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
