# Fal AI Modeller - LipClass

## 📋 Şu Anda Kullanılan Modeller

### 1. LLM (Language Model) - İçerik Üretimi
**Model:** `fal-ai/chatterbox/text-generation`

**Konum:** `src/lib/api/fal.ts` → `generateContentWithLLM()`

**Kullanım:**
- Prompt'tan ders metni üretir
- Varsayılan parametreler:
  - `max_tokens`: 2000
  - `temperature`: 0.7

**Alternatif Modeller (opsiyonel):**
- `fal-ai/chatterbox/text-generation` (varsayılan)
- Diğer LLM modelleri Fal AI Dashboard'dan seçilebilir

---

### 2. TTS (Text-to-Speech) - Ses Üretimi
**Model:** `fal-ai/chatterbox/text-to-speech/turbo` ✅

**Konum:** `src/lib/api/fal.ts` → `textToSpeech()`

**Kullanım:**
- Metin → ses dosyası
- Varsayılan voice: `default`
- Dil desteği: `tr` (Türkçe), `en` (İngilizce)
- **Turbo versiyonu:** Daha hızlı işleme

**Voice Ayarları (`src/lib/api/generation.ts`):**
- Türkçe: `tr-TR-DuyguNeural` ⚠️ (Bu format Chatterbox için geçerli olmayabilir)
- İngilizce: `en-US-JennyNeural` ⚠️ (Bu format Chatterbox için geçerli olmayabilir)

**Alternatif Modeller:**
- `fal-ai/chatterbox/text-to-speech/turbo` (varsayılan - turbo versiyon)
- `fal-ai/chatterbox/text-to-speech` (standart versiyon)
- `fal-ai/minimax/text-to-speech`
- `fal-ai/dia-tts/text-to-speech`

**Not:** Voice isimleri (`tr-TR-DuyguNeural`) Chatterbox TTS için geçerli olmayabilir. Fal AI Chatterbox dokümantasyonundan doğru voice isimlerini kontrol etmeniz gerekebilir.

---

### 3. Lipsync - Video Senkronizasyonu
**Model:** `fal-ai/sync-lipsync/v2/pro` ✅

**Konum:** `src/lib/api/fal.ts` → `createLipsyncVideo()`

**Kullanım:**
- Referans video + ses dosyası → yeni video
- Varsayılan sync mode: `cut_off`
- **Pro versiyonu:** Daha yüksek kalite

**Sync Modes:**
- `cut_off`: Video veya ses kısa ise kesilir
- `loop`: Video veya ses döngüye alınır
- `bounce`: Video veya ses geri sarılır

**Alternatif Modeller:**
- `fal-ai/sync-lipsync/v2/pro` (varsayılan - pro versiyon)
- `fal-ai/sync-lipsync/v2` (standart versiyon)
- `creatify/lipsync`

---

## ⚠️ ÖNEMLİ UYARILAR

### 1. Model Adları Değişebilir
Fal AI model adları zaman zaman değişebilir. Eğer hata alırsanız:
1. Fal AI Dashboard'u kontrol edin: https://fal.ai/models
2. Model adlarını güncelleyin: `src/lib/api/fal.ts`

### 2. Voice İsimleri Formatı
TTS voice isimleri (`tr-TR-DuyguNeural`) Chatterbox için geçerli olmayabilir. Fal AI Chatterbox dokümantasyonundan doğru format'ı kontrol edin.

**Potansiyel Sorun:** `generation.ts` dosyasında kullanılan voice isimleri:
```typescript
voice: language === 'tr' ? 'tr-TR-DuyguNeural' : 'en-US-JennyNeural'
```

Chatterbox TTS farklı bir voice formatı kullanıyor olabilir (ör: `default`, `male`, `female`, veya sayısal ID'ler).

---

## 🔄 Model Değiştirme

### Model'i Değiştirmek İçin:

#### 1. LLM Model Değiştirme:
```typescript
// src/lib/api/generation.ts içinde:
const lessonContent = await generateContentWithLLM(enhancedPrompt, {
  model: 'fal-ai/yeni-llm-model', // Yeni model
  maxTokens: 2000,
  temperature: 0.7,
});
```

#### 2. TTS Model Değiştirme:
```typescript
// src/lib/api/generation.ts içinde:
const ttsResponse = await textToSpeech(lessonContent, {
  model: 'fal-ai/minimax/text-to-speech', // Alternatif model
  language,
  voice: 'default', // Voice format'ı model'e göre değişebilir
  speed: 1.0,
});
```

#### 3. Lipsync Model Değiştirme:
```typescript
// src/lib/api/generation.ts içinde:
const lipsyncResponse = await createLipsyncVideo(
  referenceVideoUrl,
  ttsResponse.audio_url,
  {
    model: 'creatify/lipsync', // Alternatif model
    syncMode: 'cut_off',
  }
);
```

---

## 📚 Fal AI Model Dokümantasyonu

**Model Listesi:** https://fal.ai/models

**Dokümantasyon:** https://fal.ai/docs

**API Reference:** Her model için özel API dokümantasyonu mevcuttur.

---

## ✅ Model Kontrol Listesi

Şu anda kullandığınız modeller:
- [x] LLM: `fal-ai/chatterbox/text-generation`
- [x] TTS: `fal-ai/chatterbox/text-to-speech/turbo` ⚡ (turbo versiyon)
- [x] Lipsync: `fal-ai/sync-lipsync/v2/pro` ⚡ (pro versiyon)

**Sonraki Adımlar:**
1. Fal AI Dashboard'dan model adlarını doğrulayın
2. Voice format'ını Chatterbox TTS için kontrol edin
3. Test edin ve gerekirse model/parametreleri ayarlayın

---

## 🔍 Model Doğrulama

### Fal AI Dashboard'dan Kontrol:
1. https://fal.ai/models adresine gidin
2. Şu modelleri arayın:
   - `chatterbox/text-generation`
   - `chatterbox/text-to-speech`
   - `sync-lipsync/v2`
3. Model dokümantasyonunu kontrol edin
4. API endpoint'lerini ve parametreleri doğrulayın

### Test API Call:
```bash
# Fal AI Dashboard → API Playground'dan test edebilirsiniz
curl -X POST https://fal.run/fal-ai/chatterbox/text-generation \
  -H "Authorization: Key YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test", "max_tokens": 100}'
```
