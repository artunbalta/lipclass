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
      { label: 'Fiyatlandırma', href: '#pricing' },
      { label: 'API', href: '#api' },
    ],
  },
  company: {
    title: 'Şirket',
    links: [
      { label: 'Hakkımızda', href: '#about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Kariyer', href: '/careers' },
      { label: 'İletişim', href: '/contact' },
    ],
  },
  resources: {
    title: 'Kaynaklar',
    links: [
      { label: 'Yardım Merkezi', href: '/help' },
      { label: 'Eğitimler', href: '/tutorials' },
      { label: 'SSS', href: '/faq' },
      { label: 'Topluluk', href: '/community' },
    ],
  },
  legal: {
    title: 'Yasal',
    links: [
      { label: 'Gizlilik Politikası', href: '/privacy' },
      { label: 'Kullanım Koşulları', href: '/terms' },
      { label: 'KVKK', href: '/kvkk' },
      { label: 'Çerez Politikası', href: '/cookies' },
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
    <footer className="bg-muted/30 border-t border-border">
      {/* Newsletter Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-8 lg:p-12"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,white_0%,transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,white_0%,transparent_50%)]" />
            </div>

            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="text-center lg:text-left">
                <h3 className="text-2xl lg:text-3xl font-bold text-primary-foreground mb-2">
                  Eğitimde devrim yaratmaya hazır mısın?
                </h3>
                <p className="text-primary-foreground/80">
                  En son güncellemeler ve özel içerikler için bültenimize abone olun.
                </p>
              </div>
              <div className="flex w-full lg:w-auto gap-3">
                <Input
                  type="email"
                  placeholder="E-posta adresiniz"
                  className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/60 min-w-[240px]"
                />
                <Button variant="secondary" className="shrink-0 gap-2">
                  Abone Ol
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        <Separator />

        {/* Main Footer */}
        <div className="py-12 lg:py-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12">
            {/* Brand Column */}
            <div className="col-span-2 md:col-span-3 lg:col-span-2">
              <Logo size="lg" />
              <p className="mt-4 text-muted-foreground text-sm max-w-sm">
                AI destekli eğitim platformu ile öğretmenler zamandan tasarruf eder, 
                öğrenciler kişiselleştirilmiş içeriklerle öğrenir.
              </p>
              
              {/* Contact Info */}
              <div className="mt-6 space-y-3">
                <a 
                  href="mailto:info@lipclass.com" 
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  info@lipclass.com
                </a>
                <a 
                  href="tel:+902121234567" 
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  +90 212 123 45 67
                </a>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  İstanbul, Türkiye
                </p>
              </div>

              {/* Social Links */}
              <div className="mt-6 flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links Columns */}
            {Object.entries(footerLinks).map(([key, section]) => (
              <div key={key}>
                <h4 className="font-semibold text-foreground mb-4">
                  {section.title}
                </h4>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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

        <Separator />

        {/* Bottom Bar */}
        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} LipClass. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-4">
            <Link 
              href="/privacy" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Gizlilik
            </Link>
            <Link 
              href="/terms" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Şartlar
            </Link>
            <Link 
              href="/cookies" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Çerezler
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
