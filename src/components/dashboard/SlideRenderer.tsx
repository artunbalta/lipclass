'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';
import type { Slide } from '@/types';

interface SlideRendererProps {
  slide: Slide;
  className?: string;
}

/**
 * Render KaTeX math expressions in a string.
 * Supports both inline ($...$) and block ($$...$$) math.
 */
function renderMathInText(text: string): string {
  // First handle block math ($$...$$)
  let result = text.replace(/\$\$([\s\S]*?)\$\$/g, (_match, math) => {
    try {
      return `<div class="slide-math-block">${katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
        trust: true,
      })}</div>`;
    } catch {
      return `<div class="slide-math-block slide-math-error">${math}</div>`;
    }
  });

  // Then handle inline math ($...$) - but not already processed $$
  result = result.replace(/\$([^$\n]+?)\$/g, (_match, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
        trust: true,
      });
    } catch {
      return `<span class="slide-math-error">${math}</span>`;
    }
  });

  // Convert newlines to <br>
  result = result.replace(/\n/g, '<br/>');

  return result;
}

export default function SlideRenderer({ slide, className = '' }: SlideRendererProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const bulletsRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (contentRef.current && slide.content) {
      contentRef.current.innerHTML = renderMathInText(slide.content);
    }
  }, [slide.content]);

  useEffect(() => {
    if (bulletsRef.current && slide.bulletPoints?.length) {
      bulletsRef.current.innerHTML = slide.bulletPoints
        .map((bp) => `<li>${renderMathInText(bp)}</li>`)
        .join('');
    }
  }, [slide.bulletPoints]);

  return (
    <div
      className={`slide-renderer bg-white text-gray-900 rounded-xl p-8 flex flex-col h-full shadow-lg overflow-y-auto ${className}`}
    >
      {/* Slide number badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
          {slide.slideNumber} / 10
        </span>
      </div>

      {/* Title */}
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 leading-tight">
        {slide.title}
      </h2>

      {/* Content - with bottom-left padding to avoid video overlay area */}
      {slide.content && (
        <div
          ref={contentRef}
          className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4 flex-grow"
        />
      )}

      {/* Bullet Points */}
      {slide.bulletPoints && slide.bulletPoints.length > 0 && (
        <ul
          ref={bulletsRef}
          className="space-y-2 text-xs sm:text-sm text-gray-600 list-disc list-inside mb-2"
        />
      )}

      {/* Spacer to keep content above the video overlay area (bottom-left) */}
      <div className="min-h-[3rem] sm:min-h-[4rem] shrink-0" />
    </div>
  );
}
