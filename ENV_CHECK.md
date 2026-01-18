# Environment Variables Kontrol Rehberi

## 🔍 Sorun: "Invalid supabaseUrl" Hatası

Bu hata, `.env.local` dosyasında Supabase URL'inin doğru ayarlanmadığını gösterir.

## ✅ Çözüm Adımları

### 1. `.env.local` Dosyasını Kontrol Edin

Proje kök dizininde (package.json'un yanında) `.env.local` dosyası olmalı.

**Dosya yolu:** `C:\Users\artun\Desktop\chalk_ai\.env.local`

### 2. Dosya İçeriği Şöyle Olmalı:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**ÖNEMLİ:**
- URL `https://` ile başlamalı
- URL `.supabase.co` içermeli
- Placeholder değerler (`your_supabase_project_url`) olmamalı
- Tırnak işareti (`"`) kullanmayın
- Boşluk olmamalı

### 3. Supabase Dashboard'dan Değerleri Alın

1. Supabase Dashboard → **Settings** → **API**
2. **Project URL** → Kopyalayın → `.env.local`'e yapıştırın
3. **anon public** key → Kopyalayın → `.env.local`'e yapıştırın

### 4. Dev Server'ı Yeniden Başlatın

Environment variables değiştiğinde **mutlaka** dev server'ı yeniden başlatın:

```bash
# Terminal'de Ctrl+C ile durdurun
# Sonra tekrar başlatın:
npm run dev
```

### 5. Örnek `.env.local` Dosyası

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## ⚠️ Yaygın Hatalar

### ❌ Yanlış:
```env
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"  # Tırnak işareti
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url    # Placeholder
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co     # Boşluk var
```

### ✅ Doğru:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
```

## 🔄 Dev Server'ı Yeniden Başlatma

Environment variables değişikliklerinin etkili olması için:

1. Terminal'de `Ctrl+C` ile durdurun
2. `npm run dev` ile tekrar başlatın

## 🧪 Test

Tarayıcı console'unda şunu çalıştırın:

```javascript
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
```

Eğer `undefined` görüyorsanız, dosya doğru yerde değil veya server yeniden başlatılmamış.
