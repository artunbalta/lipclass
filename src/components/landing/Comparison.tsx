'use client';

import { motion } from 'framer-motion';
import { XCircle, CheckCircle2, Clock, Battery, TrendingDown, TrendingUp, Zap, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function Comparison() {
    return (
        <section id="features" className="section-padding relative overflow-hidden bg-slate-50">
            <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center max-w-3xl mx-auto mb-16"
                >
                    <Badge variant="outline" className="mb-4 bg-white text-slate-600 border-slate-200">
                        KARŞILAŞTIRMA
                    </Badge>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                        Okulunuz Hangi Tarafta?
                    </h2>
                    <p className="mt-4 text-lg text-slate-600">
                        Geleneksel yöntemlerin sınırları ile modern teknolojinin imkanları arasındaki farkı görün.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
                    {/* Old Way */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm opacity-80 hover:opacity-100 transition-opacity"
                    >
                        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-50">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-slate-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Geleneksel Yöntem</h3>
                                <p className="text-sm text-slate-500">Manuel ve Tekrara Dayalı</p>
                            </div>
                        </div>

                        <ul className="space-y-8">
                            <li className="flex gap-4">
                                <Clock className="w-6 h-6 text-slate-400 shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-semibold text-slate-900">Zaman Kaybı</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed">Aynı dersi 5 farklı sınıfa tekrar tekrar anlatmak, öğretmeni yaratıcılıktan uzaklaştırır.</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <Battery className="w-6 h-6 text-slate-400 shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-semibold text-slate-900">Öğretmen Tükenmişliği</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed">Sürekli konuşmaktan yorulan öğretmenlerin performansı gün sonunda düşer.</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <TrendingDown className="w-6 h-6 text-slate-400 shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-semibold text-slate-900">Standartlaşma Sorunu</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed">Her sınıfta aynı kalitede ve içerikte ders anlatmak imkansızdır.</p>
                                </div>
                            </li>
                        </ul>
                    </motion.div>

                    {/* New Way */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-white border-2 border-indigo-100 rounded-3xl p-6 sm:p-8 shadow-xl shadow-indigo-100/50 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                            <Zap className="w-64 h-64 text-indigo-900 rotate-12" />
                        </div>

                        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-indigo-50 relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <CheckCircle2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-indigo-900">LipClass Yöntemi</h3>
                                <p className="text-sm text-indigo-600 font-medium">Otomatize ve Ölçeklenebilir</p>
                            </div>
                        </div>

                        <ul className="space-y-8 relative z-10">
                            <li className="flex gap-4">
                                <Zap className="w-6 h-6 text-indigo-600 shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-bold text-slate-900">Bir Kere Çek, Sınırsız Kullan</h4>
                                    <p className="text-sm text-slate-600 leading-relaxed">Öğretmen bir kere anlatır, AI binlerce kişiselleştirilmiş ders üretir.</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <TrendingUp className="w-6 h-6 text-indigo-600 shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-bold text-slate-900">Yüksek Enerji & Motivasyon</h4>
                                    <p className="text-sm text-slate-600 leading-relaxed">Öğretmen enerjisini videoya değil, birebir öğrenci iletişimine saklar.</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <Clock className="w-6 h-6 text-indigo-600 shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-bold text-slate-900">%100 Müfredat Tutarlılığı</h4>
                                    <p className="text-sm text-slate-600 leading-relaxed">Her konu, her sınıf seviyesi için eksiksiz ve standartlara uygun üretilir.</p>
                                </div>
                            </li>
                        </ul>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
