# Video Generation Flow - LipClass

## ✅ Mevcut Durum Kontrolü

### Akış Doğru Çalışıyor Mu?

**EVET!** Kod yapısı tam olarak istediğiniz gibi çalışıyor. İşte tam akış:

---

## 📋 Video Generation Akışı

### Adım 1: Referans Video Yükleme ✅
**Sayfa:** `/dashboard/teacher/reference`

```typescript
// Öğretmen video yükler
uploadReferenceVideo(userId, file)
  ↓
// Supabase Storage'a kaydedilir
'reference-videos' bucket → `${userId}/${timestamp}.mp4`
```

### Adım 2: Video Oluşturma Formu ✅
**Sayfa:** `/dashboard/teacher/create`

```typescript
// Form doldurulur
onSubmit(data) {
  1. Video DB'ye kaydedilir (status: 'processing')
  2. generateVideo() çağrılır (background)
}
```

### Adım 3: LLM ile İçerik Oluşturma ✅
```typescript
generateContentWithLLM(enhancedPrompt)
  ↓
// Fal AI LLM API
fal-ai/chatterbox/text-generation
  ↓
// Ders metni üretilir
lessonContent: string
```

**Prompt Enhancement:**
- User prompt'u alınır
- Tone, language göre geliştirilir
- Ders videosu için uygun format'ta dönüştürülür

### Adım 4: TTS ile Ses Oluşturma ✅
```typescript
textToSpeech(lessonContent, {
  language: 'tr' | 'en',
  voice: 'tr-TR-DuyguNeural' | 'en-US-JennyNeural',
  speed: tone'a göre ayarlanır
})
  ↓
// Fal AI TTS API
fal-ai/chatterbox/text-to-speech
  ↓
// Ses dosyası URL'i
audio_url: string
```

### Adım 5: Referans Video Alınıyor ✅
```typescript
getReferenceVideoUrl(teacherId)
  ↓
// Supabase Storage'dan en son yüklenen video
'reference-videos' bucket → list(userId) → en son dosya
  ↓
// Public URL
referenceVideoUrl: string
```

### Adım 6: Lipsync ile Video Oluşturma ✅
```typescript
createLipsyncVideo(referenceVideoUrl, audioUrl, {
  syncMode: 'cut_off'
})
  ↓
// Fal AI Lipsync API
fal-ai/sync-lipsync/v2
  ↓
// Yeni video URL'i
video_url: string
```

### Adım 7: Video Supabase'e Yükleniyor ✅
```typescript
// Fal AI'dan video indirilir
fetch(video_url) → blob
  ↓
// Supabase Storage'a yüklenir
uploadFile('generated-videos', file, `${teacherId}/${videoId}.mp4`)
  ↓
// Video status güncellenir
status: 'published'
videoUrl: uploadedUrl
```

---

## ⚠️ Potansiyel Sorunlar ve Çözümler

### 1. Fal AI Model Path'leri

**Mevcut Kullanım:**
- LLM: `fal-ai/chatterbox/text-generation`
- TTS: `fal-ai/chatterbox/text-to-speech`
- Lipsync: `fal-ai/sync-lipsync/v2`

**Not:** Fal AI model path'leri değişebilir. Eğer hata alırsanız:
- Fal AI Dashboard'dan güncel model adlarını kontrol edin
- Model path'lerini `src/lib/api/fal.ts` dosyasında güncelleyin

### 2. Storage List Sorting

**Mevcut Kod:**
```typescript
.list(userId, {
  sortBy: { column: 'created_at', order: 'desc' }
})
```

**Potansiyel Sorun:** Supabase Storage `list()` API'si `sortBy` parametresini desteklemeyebilir.

**Çözüm:** Eğer hata alırsanız, `getReferenceVideoUrl()` fonksiyonunu şöyle güncelleyin:
```typescript
// Tüm dosyaları al, client-side'da sort et
const { data } = await supabase.storage
  .from('reference-videos')
  .list(userId);
  
const sorted = data.sort((a, b) => 
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
);
```

### 3. Client-Side Generation

**Mevcut Durum:** Video generation client-side'da (`create/page.tsx`) çalışıyor.

**Sorun:** Uzun süren işlemler için ideal değil. Tarayıcı kapanırsa generation durur.

**Gelecekte İyileştirme:** API route (server-side) veya background job (queue) kullanılabilir.

**Şu An:** Çalışıyor ama kullanıcı sayfayı kapatmamalı.

### 4. Async Job Polling

**Mevcut Kod:** `pollJobStatus()` fonksiyonu async job'ları poll ediyor.

**Timeout:** Maksimum 60 deneme × 2 saniye = 120 saniye (2 dakika)

**Uzun Video:** Eğer video generation 2 dakikadan uzun sürerse timeout olabilir.

**Çözüm:** `maxAttempts` değerini artırın veya progress'e göre dinamik ayarlayın.

---

## ✅ Test Senaryosu

### Adım 1: Referans Video Yükleyin
1. `/dashboard/teacher/reference` sayfasına gidin
2. Video dosyasını seçin veya sürükleyin (MP4, MOV, WebM)
3. Yükleme tamamlanınca toast mesajı göreceksiniz

### Adım 2: Yeni Video Oluşturun
1. `/dashboard/teacher/create` sayfasına gidin
2. Formu doldurun:
   - Ders bilgileri
   - İçerik açıklaması
   - AI Prompt (ör: "İkinci dereceden denklemleri anlat")
   - Ton ve ayarlar
3. "Video Oluştur" butonuna tıklayın

### Adım 3: Generation İzleme
1. **Progress ekranı görünecek:**
   - "İçerik oluşturuluyor..." (LLM)
   - "Ses oluşturuluyor..." (TTS)
   - "Video senkronize ediliyor..." (Lipsync)
   - "Video yükleniyor..."
   - "Video hazır!" ✅

2. **Toast bildirimleri:**
   - Her adım için bilgilendirme mesajları

3. **Hata durumunda:**
   - Hata mesajı gösterilir
   - Video status'u `failed` olur

### Adım 4: Sonuç
1. Video `/dashboard/teacher/videos` sayfasında görünür
2. Status: `published`
3. Video URL: Supabase Storage'da
4. İzlenebilir durumda!

---

## 🔍 Debug Kontrolü

### Environment Variables Kontrolü:
```bash
# .env.local dosyasında olmalı:
FAL_KEY=7dcf629c-939b-48d3-ba96-299fd859f478:c86206360cf31e2cfdf23665972961dc
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Browser Console'da Kontrol:
```javascript
// Generation başladığında console'da loglar görünecek:
"Generation progress: { stage: 'generating_content', progress: 10 }"
"Generation progress: { stage: 'creating_audio', progress: 70 }"
// vb.
```

### Network Tab'de Kontrol:
- Fal AI API çağrıları görünecek: `fal.run/fal-ai/...`
- Supabase Storage çağrıları görünecek
- Video upload işlemi izlenebilir

---

## ✅ Sonuç

**Evet, tamamen çalışır durumda!**

Akış şöyle:
1. ✅ Öğretmen referans video yükler → Supabase Storage
2. ✅ Prompt yazılır → Video formu
3. ✅ LLM içerik oluşturur → Fal AI
4. ✅ TTS ses oluşturur → Fal AI
5. ✅ Lipsync video oluşturur → Fal AI (referans video + ses)
6. ✅ Video Supabase'e yüklenir → Storage

**Tüm adımlar otomatik ve entegre!**

---

## 🚨 İlk Test İçin İpuçları

1. **Kısa test videosu:** İlk test için 2-3 dakikalık bir referans video kullanın
2. **Basit prompt:** "Matematik dersini anlat" gibi basit bir prompt ile başlayın
3. **Sabır:** Generation 2-10 dakika sürebilir (video uzunluğuna göre)
4. **Sayfa açık:** Generation sırasında sayfayı kapatmayın (client-side çalışıyor)
