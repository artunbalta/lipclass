# Fal AI Integration Setup - LipClass

## 🎯 Genel Bakış

LipClass, video generation için Fal AI kullanır:
- **LLM**: Ders içeriği oluşturma (metin üretimi)
- **TTS (Text-to-Speech)**: Metni sese dönüştürme
- **Lipsync**: Referans video ile ses senkronizasyonu

---

## 📋 Adım 1: Fal AI API Key Alma

1. **Fal AI'e kaydolun**: https://fal.ai
2. **Dashboard'a gidin**: https://fal.ai/dashboard
3. **API Keys** sekmesine gidin
4. **New API Key** oluşturun veya mevcut key'i kopyalayın

---

## 📋 Adım 2: Environment Variables

### Local Development (`.env.local`)

Proje kök dizininde `.env.local` dosyası oluşturun veya mevcut dosyaya ekleyin:

```env
# Fal AI API Key (server-side only)
FAL_KEY=REDACTED_ROTATE_BEFORE_USING
```

**ÖNEMLİ:** 
- `FAL_KEY` server-side kullanılır (NEXT_PUBLIC_ prefix'i KULLANMAYIN)
- `.env.local` dosyası `.gitignore`'da olduğu için Git'e commit edilmez
- Dosyayı manuel olarak oluşturun: `touch .env.local` veya dosya editörü ile

**Mevcut `.env.local` dosyanız varsa**, sadece `FAL_KEY=` satırını ekleyin.

### Production (Vercel)

1. **Vercel Dashboard** → Projenize gidin
2. **Settings** → **Environment Variables**
3. **Key**: `FAL_KEY`
4. **Value**: Fal AI API key'iniz
5. **Environments**: Production, Preview, Development (hepsini seçin)
6. **Add** butonuna tıklayın
7. **Deployment'ı yeniden başlatın**

---

## 🔄 Video Generation Flow

### Adımlar:

1. **Öğretmen referans video yükler** → Supabase Storage'a kaydedilir
2. **Video oluşturma formu doldurulur** → Prompt ve ayarlar girilir
3. **LLM ile içerik oluşturulur** → Prompt'tan ders metni üretilir
4. **TTS ile ses oluşturulur** → Metin sese dönüştürülür
5. **Lipsync ile video oluşturulur** → Referans video + ses = yeni video
6. **Video Supabase'e yüklenir** → Final video storage'a kaydedilir

---

## 📝 API Kullanımı

### LLM (Content Generation)

```typescript
import { generateContentWithLLM } from '@/lib/api/fal';

const content = await generateContentWithLLM(prompt, {
  maxTokens: 2000,
  temperature: 0.7,
});
```

### TTS (Text-to-Speech)

```typescript
import { textToSpeech } from '@/lib/api/fal';

const ttsResponse = await textToSpeech(text, {
  language: 'tr',
  voice: 'tr-TR-DuyguNeural',
  speed: 1.0,
});
```

### Lipsync

```typescript
import { createLipsyncVideo } from '@/lib/api/fal';

const lipsyncResponse = await createLipsyncVideo(
  referenceVideoUrl,
  audioUrl,
  {
    syncMode: 'cut_off',
  }
);
```

### Tam Video Generation

```typescript
import { generateVideo } from '@/lib/api/generation';

const videoUrl = await generateVideo({
  videoId: 'video-id',
  teacherId: 'teacher-id',
  prompt: 'Ders içeriği promptu',
  language: 'tr',
  tone: 'friendly',
  onProgress: (progress) => {
    console.log('Progress:', progress);
  },
});
```

---

## ⚙️ Fal AI Modeller

### Desteklenen Modeller:

1. **LLM**:
   - `fal-ai/chatterbox/text-generation` (varsayılan)
   - Veya başka LLM modelleri

2. **TTS**:
   - `fal-ai/chatterbox/text-to-speech` (varsayılan)
   - `fal-ai/minimax/text-to-speech`
   - `fal-ai/dia-tts/text-to-speech`

3. **Lipsync**:
   - `fal-ai/sync-lipsync/v2` (varsayılan)
   - `creatify/lipsync`

**Not:** Model adları Fal AI dokümantasyonuna göre değişebilir. Güncel modelleri kontrol edin: https://fal.ai/models

---

## 🚨 Hata Yönetimi

### Yaygın Hatalar:

1. **"FAL_KEY is not configured"**
   - Environment variable'ın doğru eklendiğinden emin olun
   - Local: `.env.local` dosyasını kontrol edin
   - Production: Vercel Dashboard'da environment variables'ı kontrol edin

2. **"Job timeout"**
   - Video generation uzun sürebilir (2-10 dakika)
   - `pollJobStatus` timeout ayarlarını artırın

3. **"Reference video not found"**
   - Öğretmenin önce referans video yüklemesi gerekiyor
   - `/dashboard/teacher/reference` sayfasından video yükleyin

4. **API Rate Limits**
   - Fal AI'da rate limit'ler olabilir
   - Premium plan kullanın veya retry logic ekleyin

---

## 💰 Maliyet ve Limitler

### Fal AI Pricing:

- **Free Tier**: Sınırlı kullanım
- **Pay-as-you-go**: Kullanıma göre ücretlendirme
- **Enterprise**: Özel anlaşma

### Tahmini Maliyetler:

- **LLM**: ~$0.001 per 1000 tokens
- **TTS**: ~$0.01 per dakika
- **Lipsync**: ~$0.05 per dakika

**Toplam**: ~5 dakikalık video = ~$0.30-0.50

**Not:** Gerçek fiyatlar Fal AI dokümantasyonunda güncel olarak belirtilir.

---

## 🔍 Debugging

### Console Logs:

Video generation sırasında console'da progress logları görürsünüz:

```javascript
// Progress tracking
onProgress: (progress) => {
  console.log('Generation progress:', progress);
  // { stage: 'generating_content', progress: 30 }
  // { stage: 'creating_audio', progress: 70 }
  // { stage: 'synthesizing_video', progress: 95 }
}
```

### API Response Logging:

`src/lib/api/fal.ts` dosyasında debug modunu açabilirsiniz:

```typescript
// Enable debug logging
const DEBUG = process.env.NODE_ENV === 'development';
```

---

## 📚 Kaynaklar

- **Fal AI Documentation**: https://fal.ai/docs
- **Fal AI Models**: https://fal.ai/models
- **Fal AI Dashboard**: https://fal.ai/dashboard

---

## ✅ Kontrol Listesi

- [ ] Fal AI hesabı oluşturuldu
- [ ] API key alındı
- [ ] Environment variable eklendi (local)
- [ ] Environment variable eklendi (Vercel production)
- [ ] Referans video yüklendi
- [ ] Test video generation yapıldı
- [ ] Progress tracking çalışıyor
- [ ] Error handling test edildi
