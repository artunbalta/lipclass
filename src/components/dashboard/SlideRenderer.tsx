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
  isPlaying?: boolean;
  className?: string;
  /**
   * When set, quiz answers are POSTed to /api/quiz-attempts for analytics.
   * Omit (e.g. in the editor preview) to disable logging.
   */
  videoId?: string;
}

/**
 * Escape HTML special chars in plain (non-math, non-HTML) text spans.
 * Used to keep narration text from injecting markup. We do NOT escape inside
 * KaTeX/Mermaid output (KaTeX produces trusted SVG/HTML; Mermaid is rendered
 * via its own pipeline that already produces SVG).
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Conservative inline-math detector. We avoid matching:
 *   - Currency-like patterns ($50, 50$, $TR — no math content)
 *   - Unpaired $ at end of text
 *   - $ followed by whitespace (not a math opener)
 *
 * Rules implemented:
 *   - Block formulas $$...$$ first (greedy across newlines)
 *   - Then inline $...$ where contents:
 *       - don't start/end with a space
 *       - are 1..200 chars
 *       - contain at least one of: letter, backslash (\), or math op (=+-/*^_)
 *   - Otherwise the $ is treated as literal currency/text
 */
function renderMathInText(text: string): string {
  const PLACEHOLDER = '\x00MATH\x00';
  const replacements: string[] = [];

  const pushReplacement = (html: string): string => {
    replacements.push(html);
    return `${PLACEHOLDER}${replacements.length - 1}${PLACEHOLDER}`;
  };

  // 1) Block formulas $$...$$
  let working = text.replace(/\$\$([\s\S]*?)\$\$/g, (_m, math: string) => {
    let html: string;
    try {
      html = `<div class="slide-math-block">${katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
        trust: true,
      })}</div>`;
    } catch {
      html = `<div class="slide-math-block slide-math-error">${escapeHtml(math)}</div>`;
    }
    return pushReplacement(html);
  });

  // 2) Inline formulas $...$ — only when content looks math-like (allow newlines
  //    inside up to a soft limit; currency $50 / 50$ stays literal because there
  //    is no closing dollar with proper math contents nearby).
  const INLINE_MATH_RE = /\$([^\s$][^$]{0,198}[^\s$]|[^\s$])\$/g;
  working = working.replace(INLINE_MATH_RE, (match, math: string) => {
    // Heuristic: at least one letter, backslash, or math operator inside
    if (!/[A-Za-z\\=+\-/*^_<>]/.test(math)) {
      // Pure number or symbol — treat as currency / literal
      return match;
    }
    let html: string;
    try {
      html = katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
        trust: true,
      });
    } catch {
      html = `<span class="slide-math-error">${escapeHtml(math)}</span>`;
    }
    return pushReplacement(html);
  });

  // 3) Escape the rest of the text (now safe to do, no math tokens left)
  let safe = escapeHtml(working);

  // 4) Restore math placeholders
  safe = safe.replace(new RegExp(`${PLACEHOLDER}(\\d+)${PLACEHOLDER}`, 'g'), (_m, idx) => {
    return replacements[Number(idx)] ?? '';
  });

  // 5) Newlines → <br/>
  return safe.replace(/\n/g, '<br/>');
}

function processMermaidBlocks(text: string): { html: string; mermaidBlocks: string[] } {
  const mermaidBlocks: string[] = [];
  const PRE_PLACEHOLDER = '\x01HTML\x01';
  const preHtml: string[] = [];

  // 1) Replace mermaid code-fences with a placeholder marker that survives
  //    escaping (it will be replaced with a real div post-render).
  let processed = text.replace(/```mermaid\s*\n?([\s\S]*?)```/g, (_match, code) => {
    const idx = mermaidBlocks.length;
    mermaidBlocks.push(code.trim());
    // Use a marker that renderMathInText's escaper will produce verbatim,
    // then we post-replace it with the placeholder div.
    return `${PRE_PLACEHOLDER}MERMAID${idx}${PRE_PLACEHOLDER}`;
  });

  // 2) Markdown images → store the safe HTML and reference by index.
  processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, src: string) => {
    // Basic URL allowlist — only http(s)/data URLs to prevent javascript:
    if (!/^(https?:|data:image\/)/i.test(src.trim())) {
      return ''; // drop unsafe sources
    }
    const safeAlt = alt.replace(/"/g, '&quot;');
    const safeSrc = src.replace(/"/g, '&quot;');
    const html = `<img src="${safeSrc}" alt="${safeAlt}" class="slide-image my-4 rounded-lg shadow-md max-h-64 object-contain mx-auto" />`;
    const idx = preHtml.length;
    preHtml.push(html);
    return `${PRE_PLACEHOLDER}IMG${idx}${PRE_PLACEHOLDER}`;
  });

  // 3) Render math + escape the rest
  let rendered = renderMathInText(processed);

  // 4) Restore image placeholders (they were escaped to &#1;IMG…&#1; — we
  //    need to look for both raw and escaped variants).
  const restore = (input: string): string => {
    return input.replace(
      /(?:\x01|&#1;)HTML(?:\x01|&#1;)(IMG|MERMAID)(\d+)(?:\x01|&#1;)HTML(?:\x01|&#1;)/g,
      (_m, kind: string, idxStr: string) => {
        const idx = Number(idxStr);
        if (kind === 'IMG') return preHtml[idx] || '';
        if (kind === 'MERMAID') return `<div class="mermaid-placeholder" data-mermaid-idx="${idx}"></div>`;
        return '';
      }
    );
  };
  rendered = restore(rendered);

  return { html: rendered, mermaidBlocks };
}

let mermaidCounter = 0;

// ---------------------------------------------------------------------------
// Animation tab component
// ---------------------------------------------------------------------------
interface AnimationPlayerProps {
  animationUrl: string;
  isPlaying: boolean;
  onError: () => void;
}

function AnimationPlayer({ animationUrl, isPlaying, onError }: AnimationPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset playhead when the animation URL changes (new slide)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
  }, [animationUrl]);

  // Drive play/pause from parent so the animation stays in lockstep with the
  // teacher video — both controlled by the single play/pause button.
  // animationUrl is included so navigating to the next slide while playing
  // also auto-starts the new animation (otherwise the new <video> just sits
  // paused at frame 0 because isPlaying didn't change).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.play().catch(() => {
        // autoplay blocked — user must click play
      });
    } else {
      video.pause();
    }
  }, [isPlaying, animationUrl]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-950 rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        src={animationUrl}
        onError={onError}
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
// Quiz UI (non-blocking)
// ---------------------------------------------------------------------------
interface QuizUIProps {
  slide: Slide;
  videoId?: string;
}

function QuizUI({ slide, videoId }: QuizUIProps) {
  const quiz = slide.quiz;
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ isCorrect: boolean; correctAnswer: number; explanation?: string | null } | null>(null);

  // Reset when slide changes
  useEffect(() => {
    setSelected(null);
    setResult(null);
    setSubmitting(false);
  }, [slide.slideNumber]);

  if (!quiz) {
    return (
      <div className="flex-grow flex items-center justify-center text-sm text-gray-400 italic">
        Quiz verisi eksik.
      </div>
    );
  }

  const handleSelect = async (idx: number) => {
    if (result || submitting) return;
    setSelected(idx);
    setSubmitting(true);

    // If we're inside a preview (no videoId), grade locally without logging
    if (!videoId) {
      setResult({
        isCorrect: idx === quiz.correctAnswer,
        correctAnswer: quiz.correctAnswer,
        explanation: quiz.explanation || null,
      });
      setSubmitting(false);
      return;
    }

    try {
      const resp = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, slideNumber: slide.slideNumber, selectedOption: idx }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data);
      } else {
        // Fall back to local grading if API fails
        setResult({
          isCorrect: idx === quiz.correctAnswer,
          correctAnswer: quiz.correctAnswer,
          explanation: quiz.explanation || null,
        });
      }
    } catch {
      setResult({
        isCorrect: idx === quiz.correctAnswer,
        correctAnswer: quiz.correctAnswer,
        explanation: quiz.explanation || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
          <span>❓</span> Quiz
        </span>
        <span className="text-xs text-gray-400">İstersen atlayabilirsin</span>
      </div>

      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 leading-snug">
        {quiz.question}
      </h3>

      <div className="grid gap-2 mb-4">
        {quiz.options.map((opt, idx) => {
          const isSelected = selected === idx;
          const isCorrect = result && idx === result.correctAnswer;
          const isWrongChoice = result && isSelected && !result.isCorrect;

          let cls = 'border-gray-200 hover:bg-gray-50';
          if (result) {
            if (isCorrect) cls = 'border-emerald-500 bg-emerald-50 text-emerald-900';
            else if (isWrongChoice) cls = 'border-rose-400 bg-rose-50 text-rose-900';
            else cls = 'border-gray-200 opacity-60';
          } else if (isSelected) {
            cls = 'border-indigo-400 bg-indigo-50';
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={!!result || submitting}
              className={`text-left px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 text-sm ${cls}`}
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white border border-gray-300 text-xs font-mono shrink-0">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1">{opt}</span>
              {isCorrect && <span className="text-emerald-600">✓</span>}
              {isWrongChoice && <span className="text-rose-600">✕</span>}
            </button>
          );
        })}
      </div>

      {result && result.explanation && (
        <div className={`mt-2 rounded-lg px-3 py-2 text-xs ${result.isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
          <strong>{result.isCorrect ? 'Doğru!' : 'Açıklama:'}</strong> {result.explanation}
        </div>
      )}

      {/* Spacer to keep content above video overlay area (bottom-left) */}
      <div className="min-h-[3rem] sm:min-h-[4rem] shrink-0" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function SlideRenderer({ slide, isPlaying = false, className = '', videoId }: SlideRendererProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const bulletsRef = useRef<HTMLUListElement>(null);

  // Track per-slide animation failures so we don't keep retrying a known-bad
  // URL on every re-render. Stored by slide number; cleared when the slide
  // changes back (in case the URL was repaired upstream).
  const [animationFailed, setAnimationFailed] = useState<Record<number, boolean>>({});
  const animationBroken = animationFailed[slide.slideNumber] === true;
  const hasAnimation = Boolean(slide.animationUrl) && !animationBroken;

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

  const isQuiz = slide.slideType === 'quiz';

  return (
    <div className={`slide-renderer bg-white text-gray-900 rounded-xl p-8 flex flex-col h-full shadow-lg overflow-y-auto ${className}`}>
      {/* Slide number badge + tab switcher */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
          {slide.slideNumber} / 10
        </span>
        {!isQuiz && (
          <TabBar active={activeTab} hasAnimation={hasAnimation} onChange={setActiveTab} />
        )}
      </div>

      {/* Quiz slide takes over the body entirely */}
      {isQuiz && <QuizUI slide={slide} videoId={videoId} />}

      {/* Animation tab */}
      {!isQuiz && activeTab === 'animation' && slide.animationUrl && !animationBroken && (
        <div className="flex-grow rounded-xl overflow-hidden" style={{ minHeight: '320px' }}>
          <AnimationPlayer
            animationUrl={slide.animationUrl}
            isPlaying={isPlaying}
            onError={() => {
              setAnimationFailed((prev) => ({ ...prev, [slide.slideNumber]: true }));
              setActiveTab('slide');
            }}
          />
        </div>
      )}

      {/* Slide tab (KaTeX / Mermaid) */}
      {!isQuiz && activeTab === 'slide' && (
        <>
          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 leading-tight">
            {slide.title}
          </h2>

          {animationBroken && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Bu slayt için animasyon yüklenemedi, slayt görünümü gösteriliyor.
            </div>
          )}

          {/* Content */}
          {slide.content ? (
            <div
              ref={contentRef}
              className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4 flex-grow"
            />
          ) : (
            (!slide.bulletPoints || slide.bulletPoints.length === 0) && (
              <div className="flex-grow flex items-center justify-center text-sm text-gray-400 italic">
                Bu slayt için içerik bulunamadı.
              </div>
            )
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
