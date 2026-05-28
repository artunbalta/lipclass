# Fal AI API Key Kurulumu

## ✅ API Key'iniz Eklendi

Fal AI API key'iniz hazır! Şimdi `.env.local` dosyasına eklemeniz gerekiyor.

---

## 📋 Adım 1: `.env.local` Dosyasını Kontrol Edin

Proje kök dizininde (package.json'un yanında) `.env.local` dosyası var mı kontrol edin.

### Eğer `.env.local` dosyası **YOKSA**:

Yeni bir `.env.local` dosyası oluşturun ve şu içeriği ekleyin:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Fal AI Configuration
FAL_KEY=REDACTED_ROTATE_BEFORE_USING
```

**Not:** `your_supabase_project_url` ve `your_supabase_anon_key` değerlerini Supabase Dashboard'dan aldığınız gerçek değerlerle değiştirin.

### Eğer `.env.local` dosyası **VARSA**:

Dosyayı açın ve şu satırı ekleyin (en sona veya uygun bir yere):

```env
# Fal AI Configuration
FAL_KEY=REDACTED_ROTATE_BEFORE_USING
```

---

## ⚠️ ÖNEMLİ NOTLAR:

1. **NEXT_PUBLIC_ prefix'i kullanmayın**: `FAL_KEY` server-side kullanılır, `NEXT_PUBLIC_FAL_KEY` değil!

2. **Git'e commit edilmemeli**: `.env.local` dosyası `.gitignore`'da olduğu için otomatik olarak ignore edilir. Eğer commit edilirse, API key'iniz herkese açık olur.

3. **Dev Server'ı yeniden başlatın**: Environment variable değiştiğinde mutlaka dev server'ı yeniden başlatın:
   ```bash
   # Ctrl+C ile durdurun, sonra:
   npm run dev
   ```

---

## 📋 Adım 2: Vercel Production (Opsiyonel)

Production'da da çalışması için Vercel'e environment variable ekleyin:

1. **Vercel Dashboard** → Projenize gidin
2. **Settings** → **Environment Variables**
3. **Key**: `FAL_KEY`
4. **Value**: `REDACTED_ROTATE_BEFORE_USING`
5. **Environments**: ☑ Production ☑ Preview ☑ Development
6. **Add** butonuna tıklayın
7. **Deployment'ı yeniden başlatın**

---

## ✅ Kontrol

Dev server'ı başlattıktan sonra, video oluşturma işlemi sırasında Fal AI API'sine başarıyla bağlanacaktır.

**Test etmek için:**
1. Dev server'ı başlatın: `npm run dev`
2. Referans video yükleyin: `/dashboard/teacher/reference`
3. Yeni video oluşturun: `/dashboard/teacher/create`
4. Video generation başlamalı!

---

## 🔒 Güvenlik Uyarısı

**API key'iniz hassas bir bilgidir.**
- ✅ `.env.local` dosyasında saklayın (local development)
- ✅ Vercel environment variables'da saklayın (production)
- ❌ Git repository'ye commit etmeyin
- ❌ Public kod veya screenshot'larda göstermeyin
- ❌ Client-side kod'da kullanmayın (NEXT_PUBLIC_ prefix'i yok)
