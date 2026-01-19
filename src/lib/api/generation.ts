// Video Generation Service
// Orchestrates LLM → TTS → Lipsync flow using Fal AI

import { generateContentWithLLM, textToSpeech, createLipsyncVideo } from './fal';
import { getReferenceVideoUrl, uploadFile } from './storage';
import { updateVideo } from './videos';

export type GenerationProgress = 
  | { stage: 'idle' }
  | { stage: 'generating_content'; progress: number }
  | { stage: 'creating_audio'; progress: number }
  | { stage: 'synthesizing_video'; progress: number }
  | { stage: 'uploading'; progress: number }
  | { stage: 'completed'; videoUrl: string; thumbnailUrl?: string }
  | { stage: 'failed'; error: string };

export interface GenerationOptions {
  videoId: string;
  teacherId: string;
  prompt: string;
  language?: 'tr' | 'en';
  tone?: 'formal' | 'friendly' | 'energetic';
  onProgress?: (progress: GenerationProgress) => void;
}

/**
 * Generate video content using AI pipeline:
 * 1. LLM generates lesson content from prompt
 * 2. TTS converts content to speech
 * 3. Lipsync syncs speech with reference video
 * 4. Upload final video to Supabase Storage
 */
export async function generateVideo(options: GenerationOptions): Promise<string> {
  const { videoId, teacherId, prompt, language = 'tr', tone = 'friendly', onProgress } = options;

  try {
    // Stage 1: Generate content with LLM
    onProgress?.({ stage: 'generating_content', progress: 10 });
    
    const enhancedPrompt = buildEnhancedPrompt(prompt, language, tone);
    const lessonContent = await generateContentWithLLM(enhancedPrompt, {
      maxTokens: 2000,
      temperature: 0.7,
    });

    onProgress?.({ stage: 'generating_content', progress: 30 });

    // Update video status in database
    await updateVideo(videoId, {
      status: 'processing',
    } as any);

    // Stage 2: Convert text to speech
    onProgress?.({ stage: 'creating_audio', progress: 40 });
    
    const ttsResponse = await textToSpeech(lessonContent, {
      language,
      voice: language === 'tr' ? 'tr-TR-DuyguNeural' : 'en-US-JennyNeural',
      speed: tone === 'energetic' ? 1.1 : tone === 'formal' ? 0.95 : 1.0,
    });

    onProgress?.({ stage: 'creating_audio', progress: 70 });

    if (!ttsResponse.audio_url) {
      throw new Error('TTS failed: No audio URL returned');
    }

    // Stage 3: Get reference video URL
    const referenceVideoUrl = await getReferenceVideoUrl(teacherId);
    
    if (!referenceVideoUrl) {
      throw new Error('Reference video not found. Please upload a reference video first.');
    }

    // Stage 4: Create lipsync video
    onProgress?.({ stage: 'synthesizing_video', progress: 75 });
    
    const lipsyncResponse = await createLipsyncVideo(
      referenceVideoUrl,
      ttsResponse.audio_url,
      {
        syncMode: 'cut_off',
      }
    );

    onProgress?.({ stage: 'synthesizing_video', progress: 95 });

    if (!lipsyncResponse.video_url) {
      throw new Error('Lipsync failed: No video URL returned');
    }

    // Stage 5: Download generated video and upload to Supabase
    onProgress?.({ stage: 'uploading', progress: 95 });
    
    const videoBlob = await fetch(lipsyncResponse.video_url).then(res => res.blob());
    const videoFile = new File([videoBlob], `generated-${videoId}.mp4`, { type: 'video/mp4' });
    
    const uploadedVideoUrl = await uploadFile(
      'generated-videos',
      videoFile,
      `${teacherId}/${videoId}.mp4`
    );

    onProgress?.({ stage: 'uploading', progress: 98 });

    // Generate thumbnail (extract first frame or use a placeholder)
    // TODO: Extract thumbnail from video or generate one

    // Update video with final URL and status
    await updateVideo(videoId, {
      videoUrl: uploadedVideoUrl,
      status: 'published',
      duration: lipsyncResponse.duration || Math.ceil(videoBlob.size / (1024 * 1024)), // Rough estimate
    } as any);

    onProgress?.({ stage: 'completed', videoUrl: uploadedVideoUrl });

    return uploadedVideoUrl;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update video status to failed
    try {
      await updateVideo(videoId, {
        status: 'failed',
      } as any);
    } catch (updateError) {
      console.error('Failed to update video status:', updateError);
    }

    onProgress?.({ stage: 'failed', error: errorMessage });
    throw error;
  }
}

/**
 * Build enhanced prompt for LLM
 */
function buildEnhancedPrompt(
  userPrompt: string,
  language: 'tr' | 'en',
  tone: 'formal' | 'friendly' | 'energetic'
): string {
  const toneInstructions = {
    tr: {
      formal: 'Profesyonel ve resmi bir ton kullan. Eğitim dilini kullan.',
      friendly: 'Samimi ve sıcak bir ton kullan. Öğrenci dostu dil kullan.',
      energetic: 'Enerjik ve dinamik bir ton kullan. Öğrencileri heyecanlandır.',
    },
    en: {
      formal: 'Use a professional and formal tone. Use academic language.',
      friendly: 'Use a warm and friendly tone. Use student-friendly language.',
      energetic: 'Use an energetic and dynamic tone. Excite the students.',
    },
  };

  const toneInstruction = toneInstructions[language][tone];

  return `${userPrompt}

${language === 'tr' ? 'Yukarıdaki konuyu bir ders videosu için metne dönüştür. Metin' : 'Convert the above topic into text for an educational video. The text should'}: 
- ${toneInstruction}
- ${language === 'tr' ? 'Açık ve anlaşılır olmalı' : 'Be clear and understandable'}
- ${language === 'tr' ? 'Öğrencilerin seviyesine uygun olmalı' : 'Be appropriate for student level'}
- ${language === 'tr' ? 'Örnekler ve açıklamalar içermeli' : 'Include examples and explanations'}
- ${language === 'tr' ? 'Doğrudan konuşma tonunda yazılmalı (video anlatımı için)' : 'Be written in direct speech tone (for video narration)'}`;
}
