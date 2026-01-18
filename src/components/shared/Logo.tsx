'use client';

import { GraduationCap, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  const sizes = {
    sm: {
      icon: 'w-6 h-6',
      text: 'text-lg',
      sparkle: 'w-2 h-2',
    },
    md: {
      icon: 'w-8 h-8',
      text: 'text-xl',
      sparkle: 'w-3 h-3',
    },
    lg: {
      icon: 'w-10 h-10',
      text: 'text-2xl',
      sparkle: 'w-4 h-4',
    },
  };

  return (
    <Link href="/" className={cn('flex items-center gap-2 group', className)}>
      <div className="relative">
        <div className={cn(
          'flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 p-2 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/25',
          sizes[size].icon === 'w-10 h-10' && 'p-2.5'
        )}>
          <GraduationCap className={cn('text-primary-foreground', sizes[size].icon)} />
        </div>
        <Sparkles 
          className={cn(
            'absolute -top-1 -right-1 text-accent animate-pulse',
            sizes[size].sparkle
          )} 
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={cn(
            'font-bold tracking-tight leading-none',
            sizes[size].text
          )}>
            <span className="text-foreground">Lip</span>
            <span className="text-primary">Class</span>
          </span>
          {size === 'lg' && (
            <span className="text-xs text-muted-foreground font-medium">
              AI ile Eğitim Videoları
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
