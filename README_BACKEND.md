# Backend Entegrasyonu - LipClass

## 📝 Durum

API utilities ve hooks hazır. Şimdi yapmanız gerekenler:

### ✅ Hazır Olanlar

- ✅ Supabase client setup (`src/lib/supabase/`)
- ✅ API functions (`src/lib/api/`)
  - `auth.ts` - Authentication işlemleri
  - `videos.ts` - Video CRUD işlemleri  
  - `storage.ts` - File upload işlemleri
- ✅ Database schema (`supabase/schema.sql`)
- ✅ Hibrit sistem: Supabase yoksa mock data kullanır

### ⏳ Yapmanız Gerekenler

1. **Supabase Projesi Oluşturun** (5 dakika)
   - https://supabase.com → New Project
   - Proje adı: `lipclass`

2. **Environment Variables** (1 dakika)
   - `.env.local` dosyası oluşturun
   - Supabase URL ve ANON_KEY ekleyin

3. **Database Schema** (2 dakika)
   - Supabase Dashboard → SQL Editor
   - `supabase/schema.sql` içeriğini çalıştırın

4. **Storage Buckets** (3 dakika)
   - Storage → Create bucket
   - `reference-videos`, `generated-videos`, `thumbnails`

### 🚀 Sonraki Adım

Supabase kurulumunu tamamladıktan sonra:

```bash
npm run dev
```

Test edin:
- Sign Up → Yeni hesap oluşturun
- Supabase Dashboard'da kullanıcıyı görün
- Auth store otomatik olarak gerçek API'yi kullanacak

### 📚 Detaylı Rehber

`BACKEND_SETUP.md` dosyasına bakın - adım adım tüm detaylar orada.

### ⚠️ Not

Eğer Supabase henüz kurulu değilse:
- Uygulama **mock data** ile çalışmaya devam eder
- Tüm özellikler çalışır ama veri kalıcı değildir
- Supabase kurulduktan sonra otomatik olarak gerçek API'ye geçer

### 🔍 API Entegrasyonu Kontrol

API'nin gerçek mi mock mu kullandığını görmek için:

```typescript
import { USE_REAL_API } from '@/lib/api/config';
console.log('Using real API:', USE_REAL_API);
```

---

**Hazır olduğunuzda haber verin, video store'u da gerçek API'ye bağlayalım!** 🎬
