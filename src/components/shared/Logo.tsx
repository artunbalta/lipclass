'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark'; // 'dark' = black logo for white bg, 'light' = white logo for dark bg
}

export function Logo({ className, size = 'md', variant = 'dark' }: LogoProps) {
  const sizes = {
    sm: {
      logoWidth: 120,
      logoHeight: 48,
    },
    md: {
      logoWidth: 160,
      logoHeight: 64,
    },
    lg: {
      logoWidth: 220,
      logoHeight: 88,
    },
  };

  // Dark variant = black chalk (for white backgrounds)
  // Light variant = white chalk (for dark backgrounds)
  const logoSrc = variant === 'light' ? '/chalk-logo.png' : '/chalk-logo-dark.png';

  return (
    <Link href="/" className={cn('flex items-center group', className)}>
      <div className="flex flex-col">
        <Image
          src={logoSrc}
          alt="Chalk"
          width={sizes[size].logoWidth}
          height={sizes[size].logoHeight}
          className="object-contain transition-transform duration-300 group-hover:scale-105"
          priority
        />
        {size === 'lg' && (
          <span className={cn(
            "text-xs font-medium",
            variant === 'light' ? 'text-white/70' : 'text-muted-foreground'
          )}>
            AI ile Eğitim Videoları
          </span>
        )}
      </div>
    </Link>
  );
}
