/**
 * SlidePlayer — mobile replica of the web SlidePlayer.
 *
 * Layout:
 *   ┌───────────────────────────────┐
 *   │  Slide HTML/KaTeX (WebView)   │  ← full background
 *   │                               │
 *   │  ┌──────────┐                 │  ← draggable teacher video
 *   │  │ teacher  │                 │     snaps to corners on release
 *   │  │  video   │                 │
 *   │  └──────────┘                 │
 *   ├───────────────────────────────┤
 *   │  ⏮  ▶/⏸  ⏭  ● ● ●  🔊  ⛶  │  ← controls bar
 *   └───────────────────────────────┘
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  PanResponder,
  Animated,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import type { SlidesData, Slide } from '@/types';

// Overlay video dimensions
const OV_W = 120;
const OV_H = 80;
const OV_MARGIN = 12;

const BUNNY_LIB = process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID ?? '';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

function getCorners(width: number, playerH: number, isFullscreen: boolean) {
  const bottomOffset = isFullscreen ? 82 : 52;
  return {
    'top-left':     { x: OV_MARGIN,          y: OV_MARGIN },
    'top-right':    { x: width - OV_W - OV_MARGIN, y: OV_MARGIN },
    'bottom-left':  { x: OV_MARGIN,          y: playerH - OV_H - OV_MARGIN - bottomOffset },
    'bottom-right': { x: width - OV_W - OV_MARGIN, y: playerH - OV_H - OV_MARGIN - bottomOffset },
  };
}

function getNearestCorner(x: number, y: number, width: number, playerH: number): Corner {
  const midX = width / 2;
  const midY = playerH / 2;
  if (x < midX && y < midY) return 'top-left';
  if (x >= midX && y < midY) return 'top-right';
  if (x < midX && y >= midY) return 'bottom-left';
  return 'bottom-right';
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface SlidePlayerProps {
  slidesData?: SlidesData;
  referenceVideoUrl?: string | null;
  title?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SlidePlayer({ slidesData, referenceVideoUrl, title, isFullscreen, onToggleFullscreen }: SlidePlayerProps) {
  const { width, height } = useWindowDimensions();
  const PLAYER_H = isFullscreen ? height : Math.round(width * (9 / 16));
  const currentCorners = getCorners(width, PLAYER_H, !!isFullscreen);

  const slides = slidesData?.slides ?? [];
  const [idx, setIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [corner, setCorner] = useState<Corner>('bottom-right');

  const soundRef = useRef<Audio.Sound | null>(null);
  const videoViewRef = useRef<VideoView>(null);

  // Draggable overlay position
  const pan = useRef(new Animated.ValueXY(currentCorners['bottom-right'])).current;

  const slide: Slide | undefined = slides[idx];

  // Determine video source for overlay
  const bunnyGuid = slide?.bunnyVideoGuid;
  const bunnyEmbedSrc = bunnyGuid && BUNNY_LIB
    ? `https://iframe.mediadelivery.net/embed/${BUNNY_LIB}/${bunnyGuid}?autoplay=false&responsive=false&controls=true`
    : null;

  // Direct MP4: fal.ai lipsync
  const directVideoUrl = slide?.videoUrl ?? null;

  // Reference video used as looping fallback when no lipsync
  const fallbackVideoUrl = !bunnyEmbedSrc && !directVideoUrl ? (referenceVideoUrl ?? null) : null;

  const hasOverlayVideo = !!(bunnyEmbedSrc || directVideoUrl || fallbackVideoUrl);

  // ── Audio (used when NO video overlay) ──────────────────────────────────────
  const cleanupAudio = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    cleanupAudio();
  }, [idx]);

  useEffect(() => () => { soundRef.current?.unloadAsync().catch(() => {}); }, []);

  const toggleAudio = useCallback(async () => {
    if (!slide?.audioUrl) return;

    if (soundRef.current) {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
      return;
    }

    setAudioLoading(true);
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: slide.audioUrl },
        { shouldPlay: true, isMuted },
        (status: AVPlaybackStatus) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            if (idx < slides.length - 1) setIdx(i => i + 1);
          }
        }
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (e) {
      console.warn('[SlidePlayer] audio error', e);
    } finally {
      setAudioLoading(false);
    }
  }, [slide?.audioUrl, isPlaying, isMuted, idx, slides.length]);

  const handleMute = useCallback(async () => {
    const next = !isMuted;
    setIsMuted(next);
    if (soundRef.current) {
      await soundRef.current.setIsMutedAsync(next);
    }
  }, [isMuted]);

  const goTo = useCallback((i: number) => {
    if (i >= 0 && i < slides.length) setIdx(i);
  }, [slides.length]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gs) => {
        // We use the latest width/PLAYER_H dynamically inside release if needed,
        // but here we just read the latest corner
        setCorner(prevCorner => {
          // Calculate where we let go relative to the previous snap point
          // We can't access width/PLAYER_H directly in useRef easily, but they are in scope of the render.
          // Wait, actually PanResponder is in a ref, so it doesn't close over updated width/PLAYER_H unless we update it.
          // Let's use a ref for dimensions to ensure we have the latest.
          return prevCorner; // We will handle release inside an effect or by storing dimensions in a ref
        });
      },
    })
  ).current;

  // We can just recreate the pan handlers on release, or use an onPanResponderRelease that accesses a ref.
  // Let's just use a ref for dimensions.
  const dimsRef = useRef({ width, PLAYER_H, currentCorners, isFullscreen });
  useEffect(() => {
    dimsRef.current = { width, PLAYER_H, currentCorners, isFullscreen };
  }, [width, PLAYER_H, currentCorners, isFullscreen]);

  panResponder.panHandlers.onResponderRelease = (e, gs) => {
    const { width: w, PLAYER_H: ph, currentCorners: c } = dimsRef.current;
    // @ts-ignore
    const dx = gs.dx ?? 0;
    // @ts-ignore
    const dy = gs.dy ?? 0;
    const startX = c[corner].x;
    const startY = c[corner].y;
    
    const newCorner = getNearestCorner(startX + dx, startY + dy, w, ph);
    setCorner(newCorner);
    Animated.spring(pan, {
      toValue: c[newCorner],
      useNativeDriver: false,
      tension: 120,
      friction: 8,
    }).start();
    pan.setOffset({ x: 0, y: 0 });
    pan.setValue({ x: 0, y: 0 });
  };

  // Sync pan position when corner state changes from outside
  useEffect(() => {
    Animated.spring(pan, {
      toValue: currentCorners[corner],
      useNativeDriver: false,
      tension: 120,
      friction: 8,
    }).start();
  }, [corner, width, PLAYER_H]);

  if (!slides.length) {
    return (
      <View style={[styles.container, { width, height: PLAYER_H }]}
        className="items-center justify-center">
        <Ionicons name="videocam-off-outline" size={32} color="#a1a1aa" />
        <Text className="text-muted-foreground text-sm mt-2">İçerik henüz hazır değil</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { width, height: isFullscreen ? height : 'auto' }]}>
      <View style={[styles.container, { width, height: isFullscreen ? height - 52 : PLAYER_H, overflow: 'hidden' }]}>
        {/* Slide HTML content — always fills the background */}
        <WebView
          source={{ html: buildSlideHtml(slide, idx, slides.length) }}
          style={StyleSheet.absoluteFill}
          scrollEnabled
          showsVerticalScrollIndicator={false}
        />

        {/* Title badge */}
        {title && (
          <View style={styles.titleBadge} pointerEvents="none">
            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
          </View>
        )}

        {/* Draggable teacher video overlay */}
        {hasOverlayVideo && (
          <Animated.View
            style={[styles.overlay, { left: pan.x, top: pan.y }]}
            {...panResponder.panHandlers}
          >
            {bunnyEmbedSrc ? (
              <WebView
                source={{ uri: bunnyEmbedSrc }}
                style={styles.overlayMedia}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                scrollEnabled={false}
                pointerEvents="none"
              />
            ) : (
              <DirectVideoOverlay
                ref={videoViewRef}
                uri={(directVideoUrl ?? fallbackVideoUrl)!}
                muted={!!fallbackVideoUrl || isMuted}
                loop={!!fallbackVideoUrl}
              />
            )}

            {/* Drag handle indicator */}
            <View style={styles.overlayHandle} pointerEvents="none">
              <Ionicons name="move-outline" size={12} color="rgba(255,255,255,0.7)" />
            </View>

            {/* SYNC badge for lipsync slides */}
            {(bunnyEmbedSrc || directVideoUrl) && (
              <View style={styles.syncBadge} pointerEvents="none">
                <Text style={styles.syncText}>SYNC</Text>
              </View>
            )}
          </Animated.View>
        )}
      </View>

      {/* ── Controls bar ──────────────────────────────── */}
      <View style={[styles.controls, isFullscreen && { position: 'absolute', bottom: 0, left: 0, right: 0 }]}>
        {/* Left: Prev / Play / Next / Mute */}
        <View style={styles.ctrlLeft}>
          <TouchableOpacity
            style={[styles.ctrlBtn, idx === 0 && styles.ctrlBtnDisabled]}
            onPress={() => goTo(idx - 1)}
            disabled={idx === 0}
          >
            <Ionicons name="play-skip-back" size={16} color={idx === 0 ? '#444' : '#fff'} />
          </TouchableOpacity>

          {/* Show audio play button only when no video overlay */}
          {!hasOverlayVideo ? (
            <TouchableOpacity
              style={[styles.ctrlPlay, !slide?.audioUrl && styles.ctrlBtnDisabled]}
              onPress={toggleAudio}
              disabled={!slide?.audioUrl || audioLoading}
            >
              {audioLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#fff" />
              )}
            </TouchableOpacity>
          ) : (
            <View style={[styles.ctrlPlay, { backgroundColor: '#333' }]}>
              <Ionicons name="videocam" size={14} color="#6366f1" />
            </View>
          )}

          <TouchableOpacity
            style={[styles.ctrlBtn, idx === slides.length - 1 && styles.ctrlBtnDisabled]}
            onPress={() => goTo(idx + 1)}
            disabled={idx === slides.length - 1}
          >
            <Ionicons name="play-skip-forward" size={16} color={idx === slides.length - 1 ? '#444' : '#fff'} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.ctrlBtn} onPress={handleMute}>
            <Ionicons name={isMuted ? 'volume-mute' : 'volume-medium'} size={16} color="#a1a1aa" />
          </TouchableOpacity>
        </View>

        {/* Center: slide dots */}
        <View style={styles.ctrlDots}>
          {slides.slice(0, 12).map((s, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
              <View style={[
                styles.dot,
                i === idx && styles.dotActive,
                i < idx && styles.dotPast,
                (s as Slide).videoUrl ? styles.dotLipsync : null,
              ]} />
            </TouchableOpacity>
          ))}
          {slides.length > 12 && (
            <Text style={styles.dotCount}>{idx + 1}/{slides.length}</Text>
          )}
        </View>

        {/* Right: Fullscreen toggle */}
        <View style={styles.ctrlRight}>
          <TouchableOpacity style={styles.ctrlBtn} onPress={onToggleFullscreen}>
            <Ionicons name={isFullscreen ? "contract" : "expand"} size={16} color="#a1a1aa" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── DirectVideoOverlay ──────────────────────────────────────────────────────

const DirectVideoOverlay = forwardRef<VideoView, {
  uri: string;
  muted: boolean;
  loop: boolean;
}>(({ uri, muted, loop }, ref) => {
  const player = useVideoPlayer({ uri }, p => {
    p.muted = muted;
    p.loop = loop;
    if (loop) p.play();
  });

  return (
    <VideoView
      ref={ref}
      player={player}
      style={styles.overlayMedia}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen
    />
  );
});

// ─── HTML builder ────────────────────────────────────────────────────────────

function buildSlideHtml(slide: Slide | undefined, index: number, total: number): string {
  if (!slide) return '<html><body style="background:#1a1a1a"></body></html>';

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css">
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/contrib/auto-render.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; }
    body {
      padding: 14px 14px 90px 14px;
      background: #111827; color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px; line-height: 1.7; overflow-x: hidden;
    }
    .badge {
      display: inline-block;
      background: rgba(99,102,241,0.15); color: #818cf8;
      font-size: 11px; font-weight: 600; padding: 2px 8px;
      border-radius: 20px; margin-bottom: 10px;
    }
    h1,h2,h3 { color: #f8fafc; margin: 10px 0 6px; }
    .title { font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 12px; }
    .bullet { display: flex; gap: 6px; margin-bottom: 8px; padding-left: 4px; }
    .bullet::before { content: "•"; color: #6366f1; flex-shrink: 0; }
    .narration {
      margin-top: 12px; padding: 10px 12px;
      background: rgba(99,102,241,0.07); border-left: 3px solid #6366f1;
      border-radius: 0 6px 6px 0; font-size: 13px; color: #94a3b8; font-style: italic;
    }
    img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
    pre { background: #0f172a; padding: 10px; border-radius: 6px;
          overflow-x: auto; font-size: 12px; margin: 8px 0; }
    code { font-family: monospace; background: #0f172a;
           padding: 1px 4px; border-radius: 3px; font-size: 13px; }
    .mermaid { margin: 12px 0; }
    .mermaid svg { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; margin: 8px 0; }
    td, th { border: 1px solid #334155; padding: 6px 10px; text-align: left; }
    th { background: #1e293b; color: #e2e8f0; }
    .katex { font-size: 1em !important; }
    .katex-display { margin: 12px 0; overflow-x: auto; }
  </style>
</head>
<body>
  <span class="badge">Slayt ${index + 1} / ${total}</span>
  <div class="title">${slide.title ?? ''}</div>
  <div>${slide.content ?? ''}</div>
  ${(slide.bulletPoints ?? []).map(b => `<div class="bullet">${b}</div>`).join('')}
  ${slide.narrationText ? `<div class="narration">${slide.narrationText}</div>` : ''}
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'dark',
      themeVariables: { background: '#111827', primaryColor: '#6366f1' } });
    document.addEventListener('DOMContentLoaded', function() {
      if (window.renderMathInElement) {
        renderMathInElement(document.body, {
          delimiters: [
            {left:'$$',right:'$$',display:true},
            {left:'$',right:'$',display:false},
            {left:'\\\\(',right:'\\\\)',display:false},
            {left:'\\\\[',right:'\\\\]',display:true}
          ],
          throwOnError: false
        });
      }
    });
  </script>
</body>
</html>`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#111827',
  },
  container: {
    backgroundColor: '#111827',
    position: 'relative',
  },
  titleBadge: {
    position: 'absolute',
    top: 10,
    left: 12,
    zIndex: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  titleText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
  },
  // Draggable overlay
  overlay: {
    position: 'absolute',
    width: OV_W,
    height: OV_H,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 10,
  },
  overlayMedia: {
    width: OV_W,
    height: OV_H,
  },
  overlayHandle: {
    position: 'absolute',
    bottom: 3,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 4,
    padding: 2,
  },
  syncBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(16,185,129,0.8)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  syncText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Controls bar
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    gap: 8,
  },
  ctrlLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ctrlBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBtnDisabled: {
    opacity: 0.3,
  },
  ctrlPlay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlDots: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
  },
  dotActive: {
    width: 14,
    backgroundColor: '#6366f1',
  },
  dotPast: {
    backgroundColor: '#6366f180',
  },
  dotLipsync: {
    borderWidth: 1,
    borderColor: '#10b981',
  },
  dotCount: {
    color: '#94a3b8',
    fontSize: 10,
    marginLeft: 4,
  },
  ctrlRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
