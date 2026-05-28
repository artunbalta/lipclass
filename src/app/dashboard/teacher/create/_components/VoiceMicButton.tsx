// Microphone toggle button shared across the topic, description and command
// voice inputs. Hides itself when the browser doesn't support speech
// recognition so the user never sees a dead button.

'use client';

import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { cn } from '@/lib/utils';

interface VoiceMicButtonProps {
  voice: ReturnType<typeof useVoiceInput>;
  title?: string;
}

export function VoiceMicButton({ voice, title = 'Sesle yaz' }: VoiceMicButtonProps) {
  if (!voice.isSupported) return null;
  return (
    <Button
      type="button"
      variant={voice.isListening ? 'default' : 'outline'}
      size="icon"
      onClick={voice.toggle}
      title={title}
      className={cn('shrink-0', voice.isListening && 'animate-pulse')}
    >
      {voice.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </Button>
  );
}
