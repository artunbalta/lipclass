// One row in the "Lesson plan" outline that lights up as each slide
// materialises. Hydrates from the outline first (skeleton state) and then
// gets filled in when the matching `slide` arrives via SSE.

'use client';

import { Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ROLE_META, VISUAL_META } from '../_lib/meta';
import type { Slide, SlideOutline } from '@/types';

interface SlideOutlineRowProps {
  outline?: SlideOutline;
  slide?: Slide;
  total: number;
}

export function SlideOutlineRow({ outline, slide, total }: SlideOutlineRowProps) {
  const slideNumber = outline?.slideNumber ?? slide?.slideNumber ?? 0;
  const title = slide?.title || outline?.title || `Slayt ${slideNumber}`;
  const goal = outline?.oneLineGoal || slide?.bulletPoints?.[0] || '';
  const role = outline?.intent.role ?? slide?.intent?.role;
  const visualNeed = outline?.intent.visualNeed ?? slide?.intent?.visualNeed;
  const duration = outline?.intent.estimatedDurationSec ?? slide?.intent?.estimatedDurationSec;
  const isReady = !!slide?.content || !!slide?.bulletPoints?.length;

  const roleMeta = role ? ROLE_META[role] : null;
  const visualMeta = visualNeed ? VISUAL_META[visualNeed] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl border bg-card transition-colors',
        isReady ? 'border-emerald-500/30' : 'border-border',
      )}
    >
      <div className="shrink-0 w-8 text-center">
        <p className="text-xs font-mono text-muted-foreground">
          {slideNumber.toString().padStart(2, '0')}
        </p>
        <p className="text-[9px] text-muted-foreground/60">/{total}</p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {roleMeta && (
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1', roleMeta.tone)}>
              <span>{roleMeta.emoji}</span>
              {roleMeta.label}
            </span>
          )}
          {visualMeta && (
            <span
              title={visualMeta.title}
              className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground"
            >
              {visualMeta.icon}
            </span>
          )}
          {duration ? (
            <span className="text-[10px] text-muted-foreground/70 font-mono">~{duration}sn</span>
          ) : null}
        </div>
        <p className={cn('text-sm font-semibold leading-snug', !isReady && 'text-muted-foreground')}>
          {title}
        </p>
        {goal && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{goal}</p>
        )}
      </div>

      <div className="shrink-0 w-5 flex items-center justify-center">
        {isReady ? (
          <Check className="w-4 h-4 text-emerald-500" />
        ) : outline ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        )}
      </div>
    </motion.div>
  );
}
