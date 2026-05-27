import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceInputOptions {
  lang?: string;
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  reset: () => void;
}

// Module-level mutex: only one SpeechRecognition can be active at a time
// across the whole page. Without this, having multiple useVoiceInput()
// instances on the same screen (e.g. topic + description + command) causes
// the second start() to throw InvalidStateError, after which the UI looks
// frozen because the listening state was never set.
type ActiveHandle = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition: any;
  stopFromOther: () => void;
};
let activeHandle: ActiveHandle | null = null;

function detectSupport(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export function useVoiceInput({
  lang = 'tr-TR',
  onResult,
  onError,
}: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  // Mount-aware support detection avoids SSR/CSR mismatch — the button uses
  // isSupported to decide whether to render, and `typeof window` on the server
  // would otherwise hide it forever on first paint.
  const [isSupported, setIsSupported] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  // Latest callback refs so the recognition handlers don't capture stale
  // closures (the consumer often passes inline arrow functions).
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    // Intentional: must flip `isSupported` from false (SSR default) to the
    // real value only after the client mounts so the markup matches the
    // server render. There is no external system to subscribe to here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported(detectSupport());
  }, []);

  const stop = useCallback(() => {
    const r = recognitionRef.current;
    if (r) {
      try { r.stop(); } catch { /* already stopped */ }
    }
    if (activeHandle?.recognition === r) {
      activeHandle = null;
    }
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    if (!detectSupport()) {
      onErrorRef.current?.(
        'Bu tarayıcı sesli komutu desteklemiyor. Chrome veya Edge kullanmayı dene.'
      );
      return;
    }

    // If another useVoiceInput instance on the page is currently listening,
    // stop it gracefully before we take over the single browser slot.
    if (activeHandle && activeHandle.recognition !== recognitionRef.current) {
      activeHandle.stopFromOther();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    let recognition: unknown;
    try {
      recognition = new SR();
    } catch (e) {
      onErrorRef.current?.(
        `Ses tanıyıcı başlatılamadı: ${e instanceof Error ? e.message : 'bilinmeyen hata'}`
      );
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = recognition as any;
    r.lang = lang;
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 1;

    r.onstart = () => setIsListening(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (event: any) => {
      try {
        const result = event?.results?.[0]?.[0]?.transcript;
        if (typeof result === 'string' && result.trim()) {
          setTranscript(result);
          onResultRef.current?.(result);
        } else {
          onErrorRef.current?.('Sesinizden metin çıkarılamadı, tekrar deneyin.');
        }
      } catch (err) {
        onErrorRef.current?.(
          `Sonuç işlenemedi: ${err instanceof Error ? err.message : 'hata'}`
        );
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onerror = (event: any) => {
      const code = event?.error ?? 'unknown';
      const msg =
        code === 'not-allowed' || code === 'service-not-allowed'
          ? 'Mikrofon izni gerekli. Tarayıcı çubuğundaki kilit ikonundan erişim ver.'
          : code === 'no-speech'
          ? 'Ses algılanamadı — daha yüksek konuş veya tekrar dene.'
          : code === 'audio-capture'
          ? 'Mikrofon bulunamadı. Cihaz bağlı mı?'
          : code === 'network'
          ? 'Ses tanıma servisi internete ulaşamadı.'
          : code === 'aborted'
          ? '' // benign — usually triggered by stop() or another instance taking over
          : `Ses tanıma hatası: ${code}`;
      if (msg) onErrorRef.current?.(msg);
      setIsListening(false);
      if (activeHandle?.recognition === r) activeHandle = null;
    };

    r.onend = () => {
      setIsListening(false);
      if (activeHandle?.recognition === r) activeHandle = null;
    };

    recognitionRef.current = r;
    activeHandle = {
      recognition: r,
      stopFromOther: () => {
        try { r.stop(); } catch { /* noop */ }
        setIsListening(false);
      },
    };

    try {
      r.start();
    } catch (e) {
      // Chrome throws InvalidStateError when start() is called while an old
      // recognition for this same instance is still ending. Treat as benign:
      // drop the broken instance so the next click works cleanly.
      onErrorRef.current?.(
        e instanceof Error && e.name === 'InvalidStateError'
          ? 'Önceki dinleme bitmeden yeni dinleme başlatılamaz, tekrar dene.'
          : `Dinleme başlatılamadı: ${e instanceof Error ? e.message : 'hata'}`
      );
      recognitionRef.current = null;
      if (activeHandle?.recognition === r) activeHandle = null;
      setIsListening(false);
    }
  }, [lang]);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  const reset = useCallback(() => {
    stop();
    setTranscript('');
  }, [stop]);

  useEffect(() => {
    return () => {
      const r = recognitionRef.current;
      if (r) {
        try { r.stop(); } catch { /* noop */ }
        if (activeHandle?.recognition === r) activeHandle = null;
      }
    };
  }, []);

  return { isListening, isSupported, transcript, start, stop, toggle, reset };
}
