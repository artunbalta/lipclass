'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Home, ArrowLeft, Search, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/Logo';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-background via-muted/20 to-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl"
      >
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        {/* 404 Illustration */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8"
        >
          <div className="relative inline-block">
            <div className="text-9xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              404
            </div>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="absolute -top-4 -right-8 text-4xl"
            >
              📚
            </motion.div>
          </div>
        </motion.div>

        <h1 className="text-3xl lg:text-4xl font-bold mb-4">
          Sayfa Bulunamadı
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
          Aradığınız sayfa taşınmış veya mevcut değil. Ana sayfaya dönerek devam edebilirsiniz.
        </p>

        {/* Quick Links */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link href="/">
            <Button size="lg" className="gap-2 w-full sm:w-auto">
              <Home className="w-5 h-5" />
              Ana Sayfa
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            onClick={() => window.history.back()}
            className="gap-2 w-full sm:w-auto"
          >
            <ArrowLeft className="w-5 h-5" />
            Geri Dön
          </Button>
        </div>

        {/* Popular Links */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <Link href="/dashboard/student/browse">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-4 rounded-xl border border-border bg-card hover:shadow-lg transition-all"
            >
              <Search className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Video Keşfet</p>
            </motion.div>
          </Link>
          <Link href="/dashboard/teacher">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-4 rounded-xl border border-border bg-card hover:shadow-lg transition-all"
            >
              <BookOpen className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Dashboard</p>
            </motion.div>
          </Link>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
      </motion.div>
    </div>
  );
}
