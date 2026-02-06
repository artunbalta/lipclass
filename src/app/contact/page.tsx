'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar, Footer } from '@/components/layout';
import {
    Mail,
    Phone,
    MapPin,
    Send,
    MessageSquare,
    Clock,
    Linkedin,
    Twitter,
    Instagram,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const contactInfo = [
    {
        icon: Mail,
        title: 'E-posta',
        value: 'info@lipclass.org',
        href: 'mailto:info@lipclass.org',
    },
    {
        icon: Phone,
        title: 'Telefon',
        value: '+90 (538) 721 20 68',
        href: 'tel:+905387212068',
    },
    {
        icon: MapPin,
        title: 'Adres',
        value: 'Bilkent Üniversitesi, Ankara, Türkiye',
        href: 'https://maps.google.com/?q=Bilkent+University+Ankara',
    },
    {
        icon: Clock,
        title: 'Çalışma Saatleri',
        value: '7/24 Destek',
        href: null,
    },
];

const socialLinks = [
    { icon: Linkedin, href: 'https://www.youtube.com/watch?v=litbdyiBvNY&pp=ygUPc25laWpkZXIgc2tpbGxz', label: 'LinkedIn' },
    { icon: Twitter, href: 'https://www.youtube.com/watch?v=a1Femq4NPxs', label: 'Twitter' },
    { icon: Instagram, href: 'https://www.youtube.com/watch?v=-4ufYrJ3AH8&pp=ygUjw7Zsw7wgeWFwcmFrIHZ1cnXFn3UgbmFzxLFsIHZ1cnVsdXI%3D', label: 'Instagram' },
];

export default function ContactPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate form submission
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setIsSubmitting(false);
        setIsSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });

        // Reset success message after 5 seconds
        setTimeout(() => setIsSubmitted(false), 5000);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <main className="min-h-screen">
            <Navbar />

            {/* Hero Section */}
            <section className="pt-32 pb-16 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-50/50 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none opacity-40" />

                <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center max-w-3xl mx-auto"
                    >
                        <Badge variant="outline" className="mb-4 bg-slate-50 text-indigo-700 border-indigo-100">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            İLETİŞİM
                        </Badge>

                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-6">
                            Bizimle <span className="text-indigo-600">İletişime Geçin</span>
                        </h1>

                        <p className="text-lg text-slate-600 leading-relaxed">
                            Sorularınız, önerileriniz veya işbirliği teklifleriniz için bizimle iletişime geçin.
                            Size en kısa sürede dönüş yapacağız.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Main Content */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-5 gap-12 max-w-6xl mx-auto">
                        {/* Contact Form */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="lg:col-span-3"
                        >
                            <Card className="border-slate-100 shadow-lg">
                                <CardContent className="p-6 sm:p-8">
                                    <h2 className="text-2xl font-semibold text-slate-900 mb-6">
                                        Mesaj Gönderin
                                    </h2>

                                    {isSubmitted ? (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex flex-col items-center justify-center py-12 text-center"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-slate-900 mb-2">
                                                Mesajınız Gönderildi!
                                            </h3>
                                            <p className="text-slate-600">
                                                En kısa sürede size dönüş yapacağız.
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            <div className="grid sm:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label htmlFor="name">Adınız Soyadınız</Label>
                                                    <Input
                                                        id="name"
                                                        name="name"
                                                        value={formData.name}
                                                        onChange={handleChange}
                                                        placeholder="Adınızı girin"
                                                        required
                                                        className="h-12"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="email">E-posta Adresiniz</Label>
                                                    <Input
                                                        id="email"
                                                        name="email"
                                                        type="email"
                                                        value={formData.email}
                                                        onChange={handleChange}
                                                        placeholder="ornek@email.com"
                                                        required
                                                        className="h-12"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="subject">Konu</Label>
                                                <Input
                                                    id="subject"
                                                    name="subject"
                                                    value={formData.subject}
                                                    onChange={handleChange}
                                                    placeholder="Mesajınızın konusu"
                                                    required
                                                    className="h-12"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="message">Mesajınız</Label>
                                                <Textarea
                                                    id="message"
                                                    name="message"
                                                    value={formData.message}
                                                    onChange={handleChange}
                                                    placeholder="Mesajınızı buraya yazın..."
                                                    required
                                                    rows={6}
                                                    className="resize-none"
                                                />
                                            </div>

                                            <Button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-200"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Gönderiliyor...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="w-4 h-4 mr-2" />
                                                        Mesaj Gönder
                                                    </>
                                                )}
                                            </Button>
                                        </form>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Contact Info */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="lg:col-span-2 space-y-6"
                        >
                            {/* Contact Details */}
                            <Card className="border-slate-100 shadow-sm">
                                <CardContent className="p-6">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                        İletişim Bilgileri
                                    </h3>
                                    <div className="space-y-4">
                                        {contactInfo.map((item) => (
                                            <div key={item.title} className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                                    <item.icon className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-slate-500">{item.title}</p>
                                                    {item.href ? (
                                                        <a
                                                            href={item.href}
                                                            target={item.href.startsWith('http') ? '_blank' : undefined}
                                                            rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                                            className="text-slate-900 font-medium hover:text-indigo-600 transition-colors"
                                                        >
                                                            {item.value}
                                                        </a>
                                                    ) : (
                                                        <p className="text-slate-900 font-medium">{item.value}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Social Links */}
                            <Card className="border-slate-100 shadow-sm">
                                <CardContent className="p-6">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                        Sosyal Medya
                                    </h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Bizi sosyal medyada takip ederek en güncel haberlerden haberdar olun.
                                    </p>
                                    <div className="flex gap-3">
                                        {socialLinks.map((social) => (
                                            <a
                                                key={social.label}
                                                href={social.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={social.label}
                                                className="w-12 h-12 rounded-xl bg-slate-50 hover:bg-indigo-50 flex items-center justify-center transition-colors group"
                                            >
                                                <social.icon className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                            </a>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Quick Response Card */}
                            <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-900">
                                            Hızlı Yanıt
                                        </h3>
                                    </div>
                                    <p className="text-sm text-slate-600">
                                        Mesajlarınıza genellikle <span className="font-semibold text-indigo-600">24 saat içinde</span> yanıt veriyoruz.
                                        Acil durumlar için telefon ile ulaşabilirsiniz.
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Map Section - Optional decorative element */}
            <section className="py-16 bg-slate-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="max-w-6xl mx-auto"
                    >
                        <Card className="border-slate-200 overflow-hidden shadow-lg">
                            <div className="aspect-[21/9] bg-gradient-to-br from-slate-100 to-slate-200 relative">
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3058.8847675844364!2d32.74813731744385!3d39.86701199456126!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14d345e46d8eb0e5%3A0x5b75e11b4de8d62!2sBilkent%20%C3%9Cniversitesi!5e0!3m2!1str!2str!4v1706889600000!5m2!1str!2str"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0, position: 'absolute', top: 0, left: 0 }}
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title="LipClass Konum"
                                />
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
