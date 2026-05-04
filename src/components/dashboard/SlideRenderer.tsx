'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
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

function renderMathInText(text: string): string {
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

  result = result.replace(/\n/g, '<br/>');
  return result;
}

function processMermaidBlocks(text: string): { html: string; mermaidBlocks: string[] } {
  const mermaidBlocks: string[] = [];

  const processed = text.replace(/```mermaid\s*\n?([\s\S]*?)```/g, (_match, code) => {
    const idx = mermaidBlocks.length;
    mermaidBlocks.push(code.trim());
    return `<div class="mermaid-placeholder" data-mermaid-idx="${idx}"></div>`;
  });

  const withImages = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, src) => {
    return `<img src="${src}" alt="${alt}" class="slide-image my-4 rounded-lg shadow-md max-h-64 object-contain mx-auto" />`;
  });

  const html = renderMathInText(withImages);
  return { html, mermaidBlocks };
}

let mermaidCounter = 0;

// ---------------------------------------------------------------------------
// Animation tab component
// ---------------------------------------------------------------------------
interface AnimationPlayerProps {
  animationUrl: string;
  onEnded: () => void;
}

function AnimationPlayer({ animationUrl, onEnded }: AnimationPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().catch(() => {
      // autoplay blocked — user must click play
    });
  }, [animationUrl]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-950 rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        src={animationUrl}
        onEnded={onEnded}
        controls
        playsInline
        className="w-full h-full object-contain"
        style={{ maxHeight: '100%' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------
type ActiveTab = 'animation' | 'slide';

interface TabBarProps {
  active: ActiveTab;
  hasAnimation: boolean;
  onChange: (tab: ActiveTab) => void;
}

function TabBar({ active, hasAnimation, onChange }: TabBarProps) {
  if (!hasAnimation) return null;

  return (
    <div className="flex items-center gap-1 mb-3">
      <button
        onClick={() => onChange('animation')}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          active === 'animation'
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
      >
        <span>▶</span>
        Animation
      </button>
      <button
        onClick={() => onChange('slide')}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
          active === 'slide'
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
      >
        <span>📄</span>
        Slide
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function SlideRenderer({ slide, className = '' }: SlideRendererProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const bulletsRef = useRef<HTMLUListElement>(null);

  const hasAnimation = Boolean(slide.animationUrl);
  // Auto-select the animation tab when a new slide with animation is entered
  const [activeTab, setActiveTab] = useState<ActiveTab>(hasAnimation ? 'animation' : 'slide');

  // When the slide changes, reset to animation tab if available
  useEffect(() => {
    setActiveTab(hasAnimation ? 'animation' : 'slide');
  }, [slide.slideNumber, hasAnimation]);

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
    <div className={`slide-renderer bg-white text-gray-900 rounded-xl p-8 flex flex-col h-full shadow-lg overflow-y-auto ${className}`}>
      {/* Slide number badge + tab switcher */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
          {slide.slideNumber} / 10
        </span>
        <TabBar active={activeTab} hasAnimation={hasAnimation} onChange={setActiveTab} />
      </div>

      {/* Animation tab */}
      {activeTab === 'animation' && slide.animationUrl && (
        <div className="flex-grow rounded-xl overflow-hidden" style={{ minHeight: '320px' }}>
          <AnimationPlayer
            animationUrl={slide.animationUrl}
            onEnded={() => setActiveTab('slide')}
          />
        </div>
      )}

      {/* Slide tab (KaTeX / Mermaid) */}
      {activeTab === 'slide' && (
        <>
          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 leading-tight">
            {slide.title}
          </h2>

          {/* Content */}
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

          {/* Spacer to keep content above video overlay area (bottom-left) */}
          <div className="min-h-[3rem] sm:min-h-[4rem] shrink-0" />
        </>
      )}
    </div>
  );
}
