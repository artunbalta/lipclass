'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Mail,
  Phone,
  MapPin,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/shared/Logo';
import { Separator } from '@/components/ui/separator';

const footerLinks = {
  product: {
    title: 'Ürün',
    links: [
      { label: 'Özellikler', href: '#features' },
      { label: 'Nasıl Çalışır?', href: '#how-it-works' }, // Fixed usage
      { label: 'Eğitimler', href: '#tutorials' },
    ],
  },
  company: {
    title: 'Şirket',
    links: [
      { label: 'Hakkımızda', href: '#about' },
      { label: 'Kariyer', href: '/careers' },
      { label: 'İletişim', href: '/contact' },
    ],
  },
  legal: {
    title: 'Yasal',
    links: [
      { label: 'Gizlilik Politikası', href: '/privacy' },
      { label: 'Kullanım Koşulları', href: '/terms' },
    ],
  },
};

const socialLinks = [
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Youtube, href: '#', label: 'YouTube' },
];

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Newsletter Section - Clean & Minimal */}
        <div className="py-12 lg:py-16">
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 lg:p-12 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left max-w-xl">
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Eğitimin Geleceğini Yakalayın
              </h3>
              <p className="text-slate-600">
                En son güncellemeler, yeni özellikler ve eğitim teknolojileri hakkında bilgi almak için bültenimize abone olun.
              </p>
            </div>
            <div className="flex w-full lg:w-auto gap-3">
              <Input
                type="email"
                placeholder="E-posta adresiniz"
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 min-w-[280px] h-12 rounded-xl"
              />
              <Button className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-200">
                Abone Ol
              </Button>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-100" />

        {/* Main Footer */}
        <div className="py-12 lg:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand Column */}
            <div className="col-span-2 lg:col-span-2">
              <Logo size="lg" />
              <p className="mt-6 text-slate-500 text-sm max-w-sm leading-relaxed">
                LipClass, yapay zeka teknolojisi ile öğretmenleri dijital dünyada güçlendiren, okulları geleceğe taşıyan yeni nesil eğitim platformudur.
              </p>

              {/* Social Links */}
              <div className="mt-8 flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all duration-200"
                  >
                    <social.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links Columns */}
            {Object.entries(footerLinks).map(([key, section]) => (
              <div key={key} className="col-span-1">
                <h4 className="font-semibold text-slate-900 mb-6">
                  {section.title}
                </h4>
                <ul className="space-y-4">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-slate-500 hover:text-indigo-600 transition-colors font-medium"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-slate-100" />

        {/* Bottom Bar */}
        <div className="py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} LipClass Teknoloji A.Ş. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <MapPin className="w-4 h-4" />
              <span>İstanbul, TR</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
