# Backend Setup Guide - LipClass

## 📋 Adım 1: Supabase Projesi Oluşturma

1. **Supabase'e gidin**: https://supabase.com
2. **Hesap oluşturun** veya giriş yapın
3. **"New Project"** butonuna tıklayın
4. Proje bilgilerini doldurun:
   - **Name**: `lipclass` (veya istediğiniz isim)
   - **Database Password**: Güçlü bir şifre seçin (kaydedin!)
   - **Region**: En yakın bölgeyi seçin
5. **Create new project** - Projenin oluşması 1-2 dakika sürebilir

## 📋 Adım 2: Supabase Credentials'ları Alma

Proje oluştuktan sonra:

1. **Settings** → **API** sekmesine gidin
2. Şu bilgileri kopyalayın:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **(Opsiyonel) service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (sadece server-side işlemler için)

## 📋 Adım 3: Environment Variables Ayarlama

1. Proje kök dizininde `.env.local` dosyası oluşturun:
   ```bash
   cp .env.local.example .env.local
   ```

2. `.env.local` dosyasını açın ve Supabase bilgilerinizi yapıştırın:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

## 📋 Adım 4: Database Schema Oluşturma

1. Supabase Dashboard'da **SQL Editor** sekmesine gidin
2. `supabase/schema.sql` dosyasının içeriğini kopyalayın
3. SQL Editor'e yapıştırın ve **Run** butonuna tıklayın
4. Tablolar oluşturulacak ve RLS politikaları ayarlanacak

### Kontrol:
- **Table Editor** sekmesinde şu tabloları görmelisiniz:
  - `profiles`
  - `videos`
  - `video_analytics`

## 📋 Adım 5: Storage Buckets Oluşturma

1. Supabase Dashboard'da **Storage** sekmesine gidin
2. **Create bucket** butonuna tıklayın
3. Şu bucket'ları oluşturun:

   **a) reference-videos** (Teacher referans videoları için)
   - Name: `reference-videos`
   - Public: ❌ (Private)
   - Allowed MIME types: `video/mp4, video/mov, video/webm`

   **b) generated-videos** (AI oluşturulan videolar için)
   - Name: `generated-videos`
   - Public: ✅ (Public - öğrenciler erişebilmeli)
   - Allowed MIME types: `video/mp4, video/mov, video/webm`

   **c) thumbnails** (Video thumbnail'leri için)
   - Name: `thumbnails`
   - Public: ✅ (Public)
   - Allowed MIME types: `image/jpeg, image/png, image/webp`

4. Her bucket için **Policies** sekmesinde şu politikaları ekleyin:

   **reference-videos** (Sadece sahibi upload edebilir):
   ```sql
   -- Upload policy (sadece kendi videosunu yükleyebilir)
   CREATE POLICY "Users can upload own reference videos"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'reference-videos' AND
     auth.uid()::text = (storage.foldername(name))[1]
   );

   -- Read policy (sadece sahibi okuyabilir)
   CREATE POLICY "Users can read own reference videos"
   ON storage.objects FOR SELECT
   USING (
     bucket_id = 'reference-videos' AND
     auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

   **generated-videos** (Herkes okuyabilir, sadece sahibi upload edebilir):
   ```sql
   -- Public read
   CREATE POLICY "Anyone can read generated videos"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'generated-videos');

   -- Upload (sadece sahibi)
   CREATE POLICY "Users can upload own generated videos"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'generated-videos' AND
     auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

   **thumbnails** (Herkes okuyabilir, sadece sahibi upload edebilir):
   ```sql
   -- Public read
   CREATE POLICY "Anyone can read thumbnails"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'thumbnails');

   -- Upload (sadece sahibi)
   CREATE POLICY "Users can upload own thumbnails"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'thumbnails' AND
     auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

## 📋 Adım 6: Authentication Ayarları

1. **Authentication** → **Providers** sekmesine gidin
2. Email provider zaten aktif (default)
3. (Opsiyonel) **Google** veya **Microsoft** provider'ları aktif edebilirsiniz

### Email Templates (Opsiyonel):
- **Authentication** → **Email Templates** sekmesinden e-posta şablonlarını özelleştirebilirsiniz

## 📋 Adım 7: Test

1. Development server'ı başlatın:
   ```bash
   npm run dev
   ```

2. Browser'da açın: `http://localhost:3000`
3. Sign Up sayfasından yeni bir hesap oluşturun
4. Supabase Dashboard → **Authentication** → **Users** sekmesinde yeni kullanıcıyı görmelisiniz
5. **Table Editor** → **profiles** tablosunda otomatik profil oluşturulmuş olmalı

## ✅ Sonraki Adımlar

- [ ] API hooks ve utilities oluşturulacak
- [ ] Mock data gerçek API çağrılarıyla değiştirilecek
- [ ] File upload functionality eklenecek
- [ ] Video generation API entegrasyonu (Fal AI)

## 🆘 Sorun Giderme

### "Supabase URL not found" hatası
- `.env.local` dosyasının doğru yerde olduğundan emin olun
- Değişken isimlerinin doğru olduğunu kontrol edin
- Development server'ı yeniden başlatın

### RLS Policy hatası
- SQL Editor'de schema'yı tekrar çalıştırın
- Policies sekmesinde politikaların doğru oluşturulduğunu kontrol edin

### Storage upload hatası
- Bucket isimlerinin doğru olduğunu kontrol edin
- Storage policies'lerin doğru ayarlandığından emin olun
