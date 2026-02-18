'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Upload, Video, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SUBJECTS } from '@/lib/constants';
import { toast } from 'sonner';

export function DemoShowcase() {
    const [step, setStep] = useState<'input' | 'processing' | 'completed' | 'error'>('input');
    const [file, setFile] = useState<File | null>(null);
    const [videoDuration, setVideoDuration] = useState<number>(0);
    const [subject, setSubject] = useState<string>('');
    const [topic, setTopic] = useState<string>('');
    const [progressStep, setProgressStep] = useState<string>('');
    const [resultUrl, setResultUrl] = useState<string>('');
    const [loadingMessage, setLoadingMessage] = useState('');

    const [previewUrl, setPreviewUrl] = useState<string>('');
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (!selectedFile.type.startsWith('video/')) {
                toast.error('Lütfen geçerli bir video dosyası seçin (MP4, MOV, WebM)');
                return;
            }

            if (selectedFile.size > 100 * 1024 * 1024) {
                toast.error('Demo için maksimum dosya boyutu 100MB\'dır.');
                return;
            }

            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleDurationChange = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        setVideoDuration(e.currentTarget.duration);
    };

    const handleGenerate = async () => {
        if (!file || !subject || !topic) {
            toast.error('Lütfen tüm alanları doldurun');
            return;
        }

        if (videoDuration > 120) {
            toast.warning('Video süresi 2 dakikadan uzun, işlem biraz zaman alabilir.');
        }

        setStep('processing');
        setProgressStep('upload');
        setLoadingMessage('Video güvenli sunucuya yükleniyor...');

        try {
            // 1. Upload Video via server-side API
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await fetch('/api/demo-upload', {
                method: 'POST',
                body: formData,
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.json().catch(() => ({}));
                throw new Error(err?.error || 'Video yüklenemedi');
            }

            const { url: uploadedVideoUrl } = await uploadRes.json();

            // 2. Generate short content via LLM
            setProgressStep('ai');
            setLoadingMessage('Yapay zeka ders içeriği hazırlıyor...');

            const contentRes = await fetch('/api/generate-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: 'demo_content',
                    demoTopic: topic,
                    demoSubject: subject,
                    language: 'tr',
                }),
            });

            if (!contentRes.ok) {
                const err = await contentRes.json().catch(() => ({}));
                throw new Error(err?.error || 'İçerik oluşturulamadı');
            }

            const { text: narrationText } = await contentRes.json();
            console.log('Generated demo content:', narrationText);

            // 3. Text to Speech
            setProgressStep('tts');
            setLoadingMessage('Metin seslendiriliyor...');

            const ttsRes = await fetch('/api/generate-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: 'tts_slide',
                    narrationText,
                    slideNumber: 1,
                    language: 'tr',
                }),
            });

            if (!ttsRes.ok) {
                const err = await ttsRes.json().catch(() => ({}));
                throw new Error(err?.error || 'Ses oluşturulamadı');
            }

            const { audio_url } = await ttsRes.json();
            if (!audio_url) throw new Error('Ses URL\'i alınamadı');

            // 4. Lipsync
            setProgressStep('lipsync');
            setLoadingMessage('Video senkronize ediliyor (Bu işlem 1-2 dakika sürebilir)...');

            const lipsyncRes = await fetch('/api/generate-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: 'lipsync',
                    video_url: uploadedVideoUrl,
                    audio_url,
                }),
            });

            if (!lipsyncRes.ok) {
                const err = await lipsyncRes.json().catch(() => ({}));
                throw new Error(err?.error || 'Video oluşturulamadı');
            }

            const { video_url } = await lipsyncRes.json();
            if (!video_url) throw new Error('Video URL\'i alınamadı');

            setResultUrl(video_url);
            setStep('completed');
            toast.success('Demo videonuz hazır!');

        } catch (error) {
            console.error('Demo generation error:', error);
            setStep('error');
            toast.error('Bir hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
        }
    };

    const handleReset = () => {
        setStep('input');
        setFile(null);
        setPreviewUrl('');
        setSubject('');
        setTopic('');
        setResultUrl('');
    };

    return (
        <section className="section-padding bg-slate-50 border-t border-slate-100 relative overflow-hidden" id="demo">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />

            <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16 relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm mb-6">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Ücretsiz İnteraktif Demo</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 mb-6">
                        Büyüyü Kendi Gözlerinizle Görün
                    </h2>
                    <p className="text-xl text-slate-600">
                        Kendi videonuzu yükleyin ve yapay zekanın onu nasıl konuşturduğunu izleyin.
                    </p>
                </div>

                <div className="max-w-5xl mx-auto relative z-10">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden">
                        {/* Chrome / Title Bar */}
                        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-4">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E]" />
                                <div className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-[#D89E24]" />
                                <div className="w-3 h-3 rounded-full bg-[#28C840] border border-[#1AAB29]" />
                            </div>
                            <div className="flex-1 text-center">
                                <div className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1 shadow-sm">
                                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-green-500" />
                                        app.chalk.com / demo-studio
                                    </span>
                                </div>
                            </div>
                            <div className="w-14" />
                        </div>

                        <div className="flex flex-col md:flex-row min-h-[550px]">
                            {/* Left Panel: Input */}
                            <div className="flex-1 p-8 border-b md:border-b-0 md:border-r border-slate-100 bg-white">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Girdiler</h3>
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">Ayarlar</Badge>
                                </div>

                                <div className="space-y-6">
                                    {/* Video Upload */}
                                    <div>
                                        <Label className="text-sm font-medium text-slate-700 mb-2 block">1. Referans Video (Max 2 dk)</Label>
                                        <div
                                            className={cn(
                                                "aspect-video rounded-xl relative overflow-hidden group border border-dashed transition-all cursor-pointer",
                                                file ? "border-indigo-200 bg-indigo-50/30" : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50",
                                                "flex items-center justify-center"
                                            )}
                                            onClick={() => !step.match(/processing|completed/) && document.getElementById('demo-video-upload')?.click()}
                                        >
                                            {previewUrl ? (
                                                <div className="relative w-full h-full">
                                                    <video
                                                        src={previewUrl}
                                                        className="w-full h-full object-cover"
                                                        onLoadedMetadata={handleDurationChange}
                                                        ref={videoRef}
                                                    />
                                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-white text-xs truncate">
                                                        {file?.name}
                                                    </div>
                                                    {step === 'input' && (
                                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="bg-white/90 text-slate-700 px-3 py-1.5 rounded-full text-sm font-medium">Değiştir</div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center p-6">
                                                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                                    <div className="text-sm font-medium text-slate-600">Video Yükle veya Sürükle</div>
                                                    <div className="text-xs text-slate-400 mt-1">MP4, MOV (Max 100MB)</div>
                                                </div>
                                            )}
                                            <input
                                                id="demo-video-upload"
                                                type="file"
                                                className="hidden"
                                                accept="video/mp4,video/mov,video/webm"
                                                onChange={handleFileChange}
                                                disabled={step !== 'input'}
                                            />
                                        </div>
                                    </div>

                                    {/* Subject Selection */}
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <Label>2. Ders Seçin</Label>
                                            <Select value={subject} onValueChange={setSubject} disabled={step !== 'input'}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Ders Seçin" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {SUBJECTS.map((s) => (
                                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Konu Başlığı</Label>
                                            <Input
                                                placeholder="Örn: Fotosentez, Newton Kanunları..."
                                                value={topic}
                                                onChange={(e) => setTopic(e.target.value)}
                                                disabled={step !== 'input'}
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        size="lg"
                                        onClick={handleGenerate}
                                        disabled={step !== 'input' || !file || !subject || !topic}
                                        className={cn(
                                            "w-full h-12 text-base font-semibold shadow-lg transition-all duration-300",
                                            step === 'input'
                                                ? "bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-0.5"
                                                : "bg-slate-100 text-slate-400 shadow-none border border-slate-200 cursor-not-allowed"
                                        )}
                                    >
                                        <span className="flex items-center gap-2">
                                            {step === 'processing' ? 'İşleniyor...' : 'Demo Oluştur'}
                                            <Sparkles className="w-4 h-4" />
                                        </span>
                                    </Button>
                                </div>
                            </div>

                            {/* Right Panel: Output */}
                            <div className="flex-1 p-8 bg-slate-50/50 relative flex flex-col">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Sonuç</h3>
                                    <Badge variant="outline" className={cn(
                                        "font-medium border-slate-200 bg-white transition-colors duration-300",
                                        step === 'completed' ? "text-emerald-600 border-emerald-100 bg-emerald-50" : "text-slate-400"
                                    )}>
                                        {step === 'completed' ? 'Tamamlandı' : step === 'processing' ? 'İşleniyor' : 'Bekleniyor'}
                                    </Badge>
                                </div>

                                <div className="flex-1 relative min-h-[300px] flex items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        {step === 'input' && (
                                            <motion.div
                                                key="empty"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="text-center p-8"
                                            >
                                                <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mb-4 mx-auto">
                                                    <Video className="w-8 h-8 text-slate-300" />
                                                </div>
                                                <p className="text-slate-500 max-w-[200px] mx-auto">
                                                    Sol taraftaki panelden videonuzu yükleyin ve konuyu belirleyip demoyu başlatın.
                                                </p>
                                            </motion.div>
                                        )}

                                        {step === 'processing' && (
                                            <motion.div
                                                key="processing"
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="w-full max-w-sm"
                                            >
                                                <div className="text-center space-y-6">
                                                    <div className="relative w-24 h-24 mx-auto">
                                                        <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
                                                        <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-lg font-semibold text-slate-900 mb-2">{loadingMessage}</h4>
                                                        <div className="flex justify-center gap-2 text-xs font-mono text-slate-400">
                                                            <span className={cn(progressStep === 'upload' ? 'text-indigo-600 font-bold' : progressStep !== 'upload' ? 'text-slate-300' : '')}>Yükleme</span>
                                                            <span>→</span>
                                                            <span className={cn(progressStep === 'ai' ? 'text-indigo-600 font-bold' : !['upload'].includes(progressStep) ? 'text-slate-300' : '')}>İçerik</span>
                                                            <span>→</span>
                                                            <span className={cn(progressStep === 'tts' ? 'text-indigo-600 font-bold' : !['upload', 'ai'].includes(progressStep) ? 'text-slate-300' : '')}>Ses</span>
                                                            <span>→</span>
                                                            <span className={cn(progressStep === 'lipsync' ? 'text-indigo-600 font-bold' : progressStep === 'completed' ? 'text-slate-300' : '')}>Video</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {step === 'completed' && resultUrl && (
                                            <motion.div
                                                key="result"
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="w-full h-full absolute inset-0 rounded-xl overflow-hidden bg-black shadow-lg"
                                            >
                                                <video
                                                    src={resultUrl}
                                                    className="w-full h-full object-contain"
                                                    controls
                                                    autoPlay
                                                />
                                            </motion.div>
                                        )}

                                        {step === 'error' && (
                                            <motion.div
                                                key="error"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-center p-8"
                                            >
                                                <div className="w-20 h-20 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mb-4 mx-auto">
                                                    <AlertCircle className="w-8 h-8 text-red-500" />
                                                </div>
                                                <h4 className="text-lg font-semibold text-slate-900 mb-2">Bir Hata Oluştu</h4>
                                                <p className="text-slate-500 mb-6">
                                                    İşlem sırasında beklenmedik bir hata oluştu. Lütfen tekrar deneyin.
                                                </p>
                                                <Button onClick={handleReset} variant="outline">
                                                    <RotateCcw className="w-4 h-4 mr-2" />
                                                    Tekrar Dene
                                                </Button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {step === 'completed' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-6 text-center"
                                    >
                                        <Button
                                            variant="ghost"
                                            onClick={handleReset}
                                            className="text-slate-500 hover:text-indigo-600"
                                        >
                                            <RotateCcw className="w-4 h-4 mr-2" />
                                            Yeni Demo Oluştur
                                        </Button>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
