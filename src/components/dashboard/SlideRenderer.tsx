'use client';

import { useEffect, useRef, useCallback } from 'react';
import katex from 'katex';
import mermaid from 'mermaid';
import type { Slide } from '@/types';

// Initialize mermaid once
let mermaidInitialized = false;
function initMermaid() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'inherit',
  });
  mermaidInitialized = true;
}

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

/**
 * Process content: extract mermaid blocks as placeholders, render math, then render mermaid.
 * Mermaid blocks use: ```mermaid ... ``` format.
 */
function processMermaidBlocks(text: string): { html: string; mermaidBlocks: string[] } {
  const mermaidBlocks: string[] = [];

  // Extract mermaid code blocks and replace with placeholders
  const processed = text.replace(/```mermaid\s*\n?([\s\S]*?)```/g, (_match, code) => {
    const idx = mermaidBlocks.length;
    mermaidBlocks.push(code.trim());
    return `<div class="mermaid-placeholder" data-mermaid-idx="${idx}"></div>`;
  });

  // Handle Markdown Images: ![alt](url) -> <img src="url" alt="alt" class="slide-image" />
  const withImages = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, src) => {
    return `<img src="${src}" alt="${alt}" class="slide-image my-4 rounded-lg shadow-md max-h-64 object-contain mx-auto" />`;
  });

  // Now render math in the remaining content
  const html = renderMathInText(withImages);

  return { html, mermaidBlocks };
}

let mermaidCounter = 0;

export default function SlideRenderer({ slide, className = '' }: SlideRendererProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const bulletsRef = useRef<HTMLUListElement>(null);

  const renderMermaidInContainer = useCallback(async (container: HTMLElement, blocks: string[]) => {
    if (blocks.length === 0) return;
    initMermaid();

    const placeholders = container.querySelectorAll('.mermaid-placeholder');
    for (const placeholder of placeholders) {
      const idx = parseInt(placeholder.getAttribute('data-mermaid-idx') || '0', 10);
      const code = blocks[idx];
      if (!code) continue;

      try {
        const id = `mermaid-${Date.now()}-${mermaidCounter++}`;
        const { svg } = await mermaid.render(id, code);
        const wrapper = document.createElement('div');
        wrapper.className = 'slide-mermaid-block my-4 flex justify-center';
        wrapper.innerHTML = svg;
        placeholder.replaceWith(wrapper);
      } catch (err) {
        console.warn('[SlideRenderer] Mermaid render error:', err);
        const fallback = document.createElement('pre');
        fallback.className = 'text-xs text-muted-foreground bg-muted p-3 rounded-lg overflow-x-auto';
        fallback.textContent = code;
        placeholder.replaceWith(fallback);
      }
    }
  }, []);

  useEffect(() => {
    if (contentRef.current && slide.content) {
      const { html, mermaidBlocks } = processMermaidBlocks(slide.content);
      contentRef.current.innerHTML = html;
      renderMermaidInContainer(contentRef.current, mermaidBlocks);
    }
  }, [slide.content, renderMermaidInContainer]);

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
