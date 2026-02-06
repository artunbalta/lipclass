'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Linkedin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Founder {
    name: string;
    title: string;
    bio: string;
    image: string;
    linkedin: string;
}

const founders: Founder[] = [
    {
        name: 'Furkan Komaç',
        title: 'Co-Founder',
        bio: 'Bilkent Üniversitesi Bilgisayar Mühendisliği son sınıf öğrencisiyim. ROKETSAN\'da yarı zamanlı mühendis olarak çalışmaktayım.',
        image: '/team/furkan.jpg',
        linkedin: 'https://www.linkedin.com/in/furkankomac/',
    },
    {
        name: 'Artun Balta',
        title: 'Co-Founder',
        bio: 'Bilkent Üniversitesi Elektrik Elektronik Mühendisliği son sınıf öğrencisiyim. Boğaziçi Üniversitesi MIMLAB\'da araştırma asistanı olarak çalışmaktayım.',
        image: '/team/artun.png',
        linkedin: 'https://www.linkedin.com/in/artunbalta/',
    },
    {
        name: 'Arhan Bartu Ergüven',
        title: 'Co-Founder',
        bio: 'Bilkent Üniversitesi Elektrik Elektronik Mühendisliği son sınıf öğrencisiyim. ASELSAN\'da yarı zamanlı mühendis olarak çalışmaktayım.',
        image: '/team/arhan.jpg',
        linkedin: 'https://www.linkedin.com/in/arhanerguven/',
    },
];

export function AboutUs() {
    return (
        <section id="about" className="py-24 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-50/50 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none opacity-40" />

            <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center max-w-3xl mx-auto mb-12"
                >
                    <Badge variant="outline" className="mb-4 bg-slate-50 text-indigo-700 border-indigo-100 hover:bg-slate-100">
                        <Users className="w-3 h-3 mr-1" />
                        HAKKIMIZDA
                    </Badge>

                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                        Biz <span className="text-indigo-600">Kimiz?</span>
                    </h2>
                </motion.div>

                {/* Founders Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {founders.map((founder, idx) => (
                        <motion.div
                            key={founder.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1, duration: 0.5 }}
                        >
                            <Card className="group h-full border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 bg-white/90 backdrop-blur-sm">
                                <CardContent className="p-5">
                                    {/* Header with small photo and info */}
                                    <div className="flex items-center gap-4 mb-4">
                                        {/* Small Photo */}
                                        <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-indigo-100">
                                            <Image
                                                src={founder.image}
                                                alt={founder.name}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>

                                        {/* Name & Title */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-slate-900 text-base">{founder.name}</h3>
                                            <p className="text-indigo-600 font-medium text-sm">{founder.title}</p>
                                        </div>

                                        {/* LinkedIn */}
                                        <Link
                                            href={founder.linkedin}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-9 h-9 rounded-full bg-slate-50 hover:bg-indigo-50 flex items-center justify-center transition-colors flex-shrink-0 group/linkedin"
                                        >
                                            <Linkedin className="w-4 h-4 text-slate-400 group-hover/linkedin:text-indigo-600 transition-colors" />
                                        </Link>
                                    </div>

                                    {/* Bio */}
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        {founder.bio}
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
