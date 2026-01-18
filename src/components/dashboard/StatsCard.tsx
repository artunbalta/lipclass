'use client';

import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  className?: string;
  color?: 'primary' | 'accent' | 'emerald' | 'amber';
}

const colorMap = {
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    gradient: 'from-primary/20 to-primary/5',
  },
  accent: {
    bg: 'bg-accent/10',
    text: 'text-accent',
    gradient: 'from-accent/20 to-accent/5',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    gradient: 'from-emerald-500/20 to-emerald-500/5',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    gradient: 'from-amber-500/20 to-amber-500/5',
  },
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  className,
  color = 'primary',
}: StatsCardProps) {
  const colors = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg',
        className
      )}
    >
      {/* Background Gradient */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-50',
        colors.gradient
      )} />

      {/* Content */}
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            colors.bg
          )}>
            <Icon className={cn('w-6 h-6', colors.text)} />
          </div>
          {trend && (
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium',
              trend.isPositive ? 'text-emerald-500' : 'text-destructive'
            )}>
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {trend.value}%
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <p className="text-3xl font-bold">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
