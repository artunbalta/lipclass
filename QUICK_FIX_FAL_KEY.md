# FAL_KEY Hatası - Hızlı Çözüm

## 🚨 Hata

**Hata Mesajı:** "FAL_KEY is not configured. Please add it to your environment variables."

**Sebep:** Vercel production ortamında `FAL_KEY` environment variable'ı eksik.

---

## ✅ Çözüm: Vercel'e FAL_KEY Ekleyin

### Adım 1: Vercel Dashboard'a Gidin

1. **https://vercel.com/dashboard** adresine gidin
2. Projenize (`lipclass`) tıklayın

### Adım 2: Environment Variables Ekleme

1. **Settings** sekmesine tıklayın
2. Sol menüden **Environment Variables** seçeneğine tıklayın
3. **Add New** butonuna tıklayın

### Adım 3: FAL_KEY Ekleyin

**Formu doldurun:**

- **Key:** `FAL_KEY`
- **Value:** `7dcf629c-939b-48d3-ba96-299fd859f478:c86206360cf31e2cfdf23665972961dc`
- **Environments:** 
  - ☑ **Production**
  - ☑ **Preview** 
  - ☑ **Development**

4. **Add** butonuna tıklayın

### Adım 4: Deployment'ı Yeniden Başlatın

**ÖNEMLİ:** Environment variable ekledikten sonra mutlaka deployment'ı yeniden başlatmanız gerekir!

#### Yöntem 1: Otomatik Redeploy (Önerilen)

1. **Deployments** sekmesine gidin
2. Son deployment'ın yanındaki **"..."** (üç nokta) → **"Redeploy"**
3. **"Use existing Build Cache"** seçeneğini **işaretlemeyin** (yeni env vars kullanılsın diye)
4. **Redeploy** butonuna tıklayın

#### Yöntem 2: Manuel Trigger

GitHub'a boş bir commit push edin:
```bash
git commit --allow-empty -m "Trigger redeploy for FAL_KEY"
git push
```

---

## ✅ Kontrol

Deployment tamamlandıktan sonra:

1. **Production URL**'inize gidin: `https://www.lipclass.org` veya `https://lipclass.vercel.app`
2. **Sign In** yapın
3. **Referans video** yükleyin: `/dashboard/teacher/reference`
4. **Yeni video** oluşturun: `/dashboard/teacher/create`
5. **"FAL_KEY is not configured"** hatası **kaybolmalı** ✅

---

## 📋 Hızlı Kontrol Listesi

- [ ] Vercel Dashboard'a gidildi
- [ ] Settings → Environment Variables'a tıklandı
- [ ] `FAL_KEY` eklendi
- [ ] Production, Preview, Development seçildi
- [ ] Add butonuna tıklandı
- [ ] Deployment yeniden başlatıldı (Redeploy)
- [ ] Test edildi

---

## 🔍 Environment Variables Kontrol

Vercel Dashboard'da environment variables şöyle görünmeli:

```
Key                              Value                              Environments
FAL_KEY                          7dcf629c-939b-48d3-...            Production, Preview, Development
NEXT_PUBLIC_SUPABASE_URL         https://umnuapjlipxxcstgcyzt...   Production, Preview, Development
NEXT_PUBLIC_SUPABASE_ANON_KEY    eyJhbGciOiJIUzI1NiIs...           Production, Preview, Development
```

---

## ⚠️ Yaygın Hatalar

### ❌ "FAL_KEY is not configured" hatası devam ediyor

**Çözüm:**
- Environment variable'ın doğru eklendiğinden emin olun
- **Deployment'ı yeniden başlattınız mı?** (en önemli adım!)
- Key ismi doğru mu? (`FAL_KEY` - büyük harfler, alt çizgi)
- Tüm environment'ları seçtiniz mi? (Production, Preview, Development)

### ❌ Deployment cache'den eski değerleri kullanıyor

**Çözüm:**
- Redeploy yaparken **"Use existing Build Cache"** seçeneğini **işaretlemeyin**
- Veya yeni bir commit push edin

---

## 📞 Yardım

Sorun devam ederse:
1. Vercel Dashboard → Deployments → Logs'u kontrol edin
2. Browser Console'da hata mesajlarını kontrol edin
3. Environment variables'ların doğru eklendiğinden emin olun
