'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Hls from 'hls.js';
import SlideRenderer from './SlideRenderer';
import type { SlidesData } from '@/types';

interface SlidePlayerProps {
  slidesData: SlidesData;
  referenceVideoUrl?: string | null;
  title?: string;
  className?: string;
}

/**
 * SlidePlayer - Interactive lesson player with lipsync support.
 *
 * Two playback modes per slide:
 *
 * A) LIPSYNC MODE (slide.videoUrl exists):
 *    - Bottom-left video plays the lipsync video (lip-synced teacher + embedded audio)
 *    - Video is the primary media element (controls audio + video together)
 *    - No separate <audio> used
 *
 * B) FALLBACK MODE (no slide.videoUrl):
 *    - Bottom-left video loops the reference video (muted)
 *    - Separate <audio> element plays TTS narration
 *    - Audio is the primary media element
 */
export default function SlidePlayer({
  slidesData,
  referenceVideoUrl,
  title,
  className = '',
}: SlidePlayerProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mediaProgress, setMediaProgress] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);

  // Draggable video overlay position (snap to corners)
  const [videoCorner, setVideoCorner] = useState<'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'>('bottom-left');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const videoOverlayRef = useRef<HTMLDivElement>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const slides = slidesData.slides;
  const currentSlide = slides[currentSlideIndex];
  const totalSlides = slides.length;

  // Determine playback mode for current slide
  const hasLipsync = !!currentSlide?.videoUrl || !!currentSlide?.bunnyEmbedUrl;

  // Prefer Bunny URL when available; fall back to fal.media URL; then reference video
  const videoSrc = currentSlide?.bunnyEmbedUrl
    ? currentSlide.bunnyEmbedUrl // Bunny Stream embed/HLS URL
    : hasLipsync && currentSlide?.videoUrl
      ? currentSlide.videoUrl // fal.media lipsync video
      : referenceVideoUrl || null; // Fallback: reference video (muted loop)

  // Track whether we're using Bunny for this slide (for badge display)
  const isBunnySource = !!currentSlide?.bunnyEmbedUrl;

  // Helper: get the primary media element (video for lipsync, audio for fallback)
  const getPrimaryMedia = useCallback((): HTMLMediaElement | null => {
    return hasLipsync ? videoRef.current : audioRef.current;
  }, [hasLipsync]);

  // ── Load media on slide change ──
  // ── Load media on slide change ──
  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;

    // Reset progress
    setMediaProgress(0);
    setMediaDuration(0);

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (hasLipsync) {
      // LIPSYNC MODE: video is primary (contains audio)
      if (audio) {
        audio.src = '';
        audio.pause();
      }
      if (video && videoSrc) {
        if (Hls.isSupported() && videoSrc.includes('.m3u8')) {
          // HLS.js support
          const hls = new Hls();
          hls.loadSource(videoSrc);
          hls.attachMedia(video);
          hlsRef.current = hls;
        } else {
          // Native HLS (Safari) or standard MP4
          video.src = videoSrc;
        }

        video.muted = isMuted;
        video.loop = false;
        // video.load() call is handled by HLS attach or src change
      }
    } else {
      // FALLBACK MODE: audio is primary, video loops reference
      if (audio && currentSlide?.audioUrl) {
        audio.src = currentSlide.audioUrl;
        audio.load();
      } else if (audio) {
        audio.src = '';
      }
      if (video && referenceVideoUrl) {
        // Only change src if it's not already the reference video
        if (video.src !== referenceVideoUrl) {
          video.src = referenceVideoUrl;
          video.load();
        }
        video.muted = true;
        video.loop = true;
      }
    }

    // Auto-play if player was in playing state
    if (isPlaying) {
      setTimeout(() => {
        const primary = hasLipsync ? videoRef.current : audioRef.current;
        primary?.play().catch(() => setIsPlaying(false));
        // In fallback mode, also start the reference video
        if (!hasLipsync && videoRef.current) {
          videoRef.current.play().catch(() => { });
        }
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlideIndex, videoSrc, hasLipsync, referenceVideoUrl]);

  // ── Media event handlers (attached to primary media) ──
  useEffect(() => {
    const primary = getPrimaryMedia();
    if (!primary) return;

    const onTimeUpdate = () => setMediaProgress(primary.currentTime);
    const onLoadedMetadata = () => setMediaDuration(primary.duration);
    const onEnded = () => {
      // Auto-advance to next slide
      if (currentSlideIndex < totalSlides - 1) {
        setCurrentSlideIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
      }
    };

    primary.addEventListener('timeupdate', onTimeUpdate);
    primary.addEventListener('loadedmetadata', onLoadedMetadata);
    primary.addEventListener('ended', onEnded);

    return () => {
      primary.removeEventListener('timeupdate', onTimeUpdate);
      primary.removeEventListener('loadedmetadata', onLoadedMetadata);
      primary.removeEventListener('ended', onEnded);
    };
  }, [currentSlideIndex, totalSlides, getPrimaryMedia]);

  // ── Mute control ──
  useEffect(() => {
    if (hasLipsync) {
      // Lipsync: mute/unmute the video (it's the audio source)
      if (videoRef.current) videoRef.current.muted = isMuted;
    } else {
      // Fallback: mute/unmute the audio element; video stays muted
      if (audioRef.current) audioRef.current.muted = isMuted;
      if (videoRef.current) videoRef.current.muted = true;
    }
  }, [isMuted, hasLipsync]);

  // ── In fallback mode, sync video play/pause with audio ──
  useEffect(() => {
    if (hasLipsync) return; // Not needed in lipsync mode
    const video = videoRef.current;
    if (!video || !referenceVideoUrl) return;

    const handleCanPlay = () => {
      if (isPlaying) video.play().catch(() => { });
    };

    video.addEventListener('canplay', handleCanPlay);
    if (video.readyState >= 3 && isPlaying) {
      video.play().catch(() => { });
    }

    return () => video.removeEventListener('canplay', handleCanPlay);
  }, [referenceVideoUrl, isPlaying, hasLipsync]);

  // ── Play / Pause ──
  const handlePlayPause = useCallback(() => {
    const primary = getPrimaryMedia();
    const video = videoRef.current;

    if (isPlaying) {
      primary?.pause();
      if (!hasLipsync) video?.pause(); // Also pause fallback video
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      primary?.play().catch(() => setIsPlaying(false));
      if (!hasLipsync) video?.play().catch(() => { }); // Also play fallback video
    }
  }, [isPlaying, hasLipsync, getPrimaryMedia]);

  const handlePrevSlide = useCallback(() => {
    if (currentSlideIndex > 0) setCurrentSlideIndex((prev) => prev - 1);
  }, [currentSlideIndex]);

  const handleNextSlide = useCallback(() => {
    if (currentSlideIndex < totalSlides - 1) setCurrentSlideIndex((prev) => prev + 1);
  }, [currentSlideIndex, totalSlides]);

  const handleSlideSelect = useCallback((index: number) => {
    setCurrentSlideIndex(index);
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
      setIsFullscreen(false);
    }
  }, []);

  // ── Seek ──
  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const primary = getPrimaryMedia();
      if (primary && mediaDuration > 0) {
        primary.currentTime = pct * mediaDuration;
      }
    },
    [mediaDuration, getPrimaryMedia]
  );

  // ── Draggable video overlay (FaceTime style snap-to-corner) ──
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const overlay = videoOverlayRef.current;
    if (!overlay) return;

    const rect = overlay.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDragOffset({ x: clientX - rect.left, y: clientY - rect.top });
    setDragPos({ x: rect.left, y: rect.top });
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setDragPos({ x: clientX - dragOffset.x, y: clientY - dragOffset.y });
    };

    const handleEnd = (e: MouseEvent | TouchEvent) => {
      setIsDragging(false);

      // Snap to nearest corner
      const container = containerRef.current;
      if (!container) { setDragPos(null); return; }

      const containerRect = container.getBoundingClientRect();
      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

      const relX = clientX - containerRect.left;
      const relY = clientY - containerRect.top;
      const midX = containerRect.width / 2;
      const midY = containerRect.height / 2;

      const isLeft = relX < midX;
      const isTop = relY < midY;

      if (isTop && isLeft) setVideoCorner('top-left');
      else if (isTop && !isLeft) setVideoCorner('top-right');
      else if (!isTop && isLeft) setVideoCorner('bottom-left');
      else setVideoCorner('bottom-right');

      setDragPos(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, dragOffset]);

  // CSS position classes for snap corners
  const cornerClasses: Record<string, string> = {
    'bottom-left': 'bottom-16 left-4',
    'bottom-right': 'bottom-16 right-4',
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
  };

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          handlePrevSlide();
          break;
        case 'ArrowRight':
          handleNextSlide();
          break;
        case 'm':
          handleToggleMute();
          break;
        case 'f':
          handleToggleFullscreen();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, handlePrevSlide, handleNextSlide, handleToggleMute, handleToggleFullscreen]);

  // ── Fullscreen listener ──
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const overallProgress =
    ((currentSlideIndex + (mediaDuration > 0 ? mediaProgress / mediaDuration : 0)) / totalSlides) * 100;

  if (!currentSlide) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted rounded-xl">
        <p className="text-muted-foreground">Slayt verisi bulunamadı</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`slide-player relative bg-gray-950 rounded-xl overflow-hidden ${className} ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
        }`}
    >
      {/* Hidden audio element (only used in fallback mode) */}
      <audio ref={audioRef} preload="auto" />

      {/* Main slide area */}
      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
        {/* Slide content */}
        <div className="absolute inset-0 p-4">
          <SlideRenderer slide={currentSlide} className="h-full" />
        </div>

        {/* Teacher video overlay (draggable, snap-to-corner) */}
        {videoSrc && (
          <div
            ref={videoOverlayRef}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className={`w-44 h-28 sm:w-56 sm:h-36 rounded-lg overflow-hidden shadow-2xl border-2 border-white/20 z-10 bg-black select-none ${isDragging ? 'cursor-grabbing opacity-90 scale-105' : 'cursor-grab'
              } ${dragPos ? 'fixed' : `absolute ${cornerClasses[videoCorner]}`}`}
            style={
              dragPos
                ? {
                  left: dragPos.x,
                  top: dragPos.y,
                  transition: 'none',
                  zIndex: 50,
                }
                : { transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
            }
          >
            <video
              ref={videoRef}
              className="w-full h-full object-cover pointer-events-none"
              playsInline
              preload="auto"
            />
            {/* Lipsync badge */}
            {hasLipsync && (
              <div className="absolute top-1 right-1">
                <span className="text-[10px] bg-emerald-500/80 text-white px-1.5 py-0.5 rounded-full font-medium">
                  SYNC
                </span>
              </div>
            )}
          </div>
        )}

        {/* Play overlay when paused */}
        {!isPlaying && (
          <button
            onClick={handlePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/10 z-5 transition-opacity hover:bg-black/20"
          >
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-xl">
              <Play className="w-7 h-7 text-white ml-1" />
            </div>
          </button>
        )}
      </div>

      {/* Controls bar */}
      <div className="bg-gray-900 px-4 py-3 space-y-2">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-mono min-w-[3.5rem]">
            {formatTime(mediaProgress)}
          </span>
          <div
            className="flex-1 h-1.5 bg-gray-700 rounded-full cursor-pointer relative group"
            onClick={handleSeek}
          >
            <div
              className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
              style={{ width: `${mediaDuration > 0 ? (mediaProgress / mediaDuration) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 font-mono min-w-[3.5rem] text-right">
            {formatTime(mediaDuration)}
          </span>
        </div>

        {/* Button controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-300 hover:text-white h-8 w-8"
              onClick={handlePrevSlide}
              disabled={currentSlideIndex === 0}
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-gray-300 hover:text-white h-9 w-9"
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-gray-300 hover:text-white h-8 w-8"
              onClick={handleNextSlide}
              disabled={currentSlideIndex === totalSlides - 1}
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-gray-300 hover:text-white h-8 w-8"
              onClick={handleToggleMute}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          </div>

          {/* Slide dots */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {slides.map((slide, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSlideSelect(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${idx === currentSlideIndex
                    ? 'bg-primary w-4'
                    : idx < currentSlideIndex
                      ? 'bg-primary/50'
                      : 'bg-gray-600'
                    } ${slide.videoUrl ? 'ring-1 ring-emerald-400/50' : ''}`}
                  title={`Slayt ${idx + 1}${slide.videoUrl ? ' (lipsync)' : ''}`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400 font-mono ml-2">
              {currentSlideIndex + 1} / {totalSlides}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-300 hover:text-white h-8 w-8"
              onClick={handleToggleFullscreen}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Title overlay */}
      {title && (
        <div className="absolute top-4 right-4 z-10">
          <span className="text-xs bg-black/60 text-white px-3 py-1 rounded-full backdrop-blur-sm">
            {title}
          </span>
        </div>
      )}
    </div>
  );
}
