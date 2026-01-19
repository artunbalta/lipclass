# Vercel Environment Variables Setup - LipClass

## 🎯 Sorun

Production'da (Vercel'de) "Supabase not configured" hatası alıyorsunuz. Bu, Vercel'de environment variables'ların set edilmediğini gösterir.

---

## ✅ Çözüm: Vercel'de Environment Variables Eklemek

### Adım 1: Vercel Dashboard'a Gidin

1. **https://vercel.com/dashboard** adresine gidin
2. Projenize (`lipclass`) tıklayın
3. **Settings** sekmesine tıklayın
4. Sol menüden **Environment Variables** seçeneğine tıklayın

### Adım 2: Supabase Environment Variables Ekleyin

Aşağıdaki iki environment variable'ı ekleyin:

#### 1. NEXT_PUBLIC_SUPABASE_URL

1. **Key** (Anahtar): `NEXT_PUBLIC_SUPABASE_URL`
2. **Value** (Değer): Supabase Dashboard'dan alacağınız **Project URL**
   - Format: `https://xxxxx.supabase.co`
3. **Environment**: Tüm ortamlar için seçin:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
4. **Add** butonuna tıklayın

#### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY

1. **Key** (Anahtar): `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. **Value** (Değer): Supabase Dashboard'dan alacağınız **anon public** key
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (uzun bir token)
3. **Environment**: Tüm ortamlar için seçin:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
4. **Add** butonuna tıklayın

---

## 📋 Supabase Credentials'ları Nereden Alınır?

1. **Supabase Dashboard** → https://supabase.com/dashboard
2. Projenize tıklayın
3. **Settings** → **API** sekmesine gidin
4. **Project URL** → Kopyalayın → Vercel'e yapıştırın
5. **anon public** key → Kopyalayın → Vercel'e yapıştırın

---

## 🔄 Deployment'ı Yeniden Başlatın

Environment variables ekledikten sonra **mutlaka** deployment'ı yeniden başlatmanız gerekir:

### Yöntem 1: Otomatik (Önerilen)

1. Vercel Dashboard → **Deployments** sekmesi
2. Son deployment'ın yanındaki **"..."** (üç nokta) → **"Redeploy"**
3. **"Use existing Build Cache"** seçeneğini **işaretlemeyin** (yeni env vars kullanılsın diye)
4. **Redeploy** butonuna tıklayın

### Yöntem 2: Manuel Trigger

1. GitHub'a yeni bir commit push edin:
   ```bash
   git commit --allow-empty -m "Trigger redeploy for env vars"
   git push
   ```

---

## ✅ Kontrol

Deployment tamamlandıktan sonra:

1. **Production URL**'inize gidin: `https://www.lipclass.org` veya `https://lipclass.vercel.app`
2. **Sign In** sayfasına gidin
3. "Supabase not configured" hatası **kaybolmuş** olmalı
4. Gerçek Supabase kullanıcısıyla login yapabilmelisiniz

---

## 📸 Görsel Rehber

### Vercel Dashboard'da Environment Variables:

```
Settings → Environment Variables

┌─────────────────────────────────────────────────────┐
│ Environment Variables                                │
├─────────────────────────────────────────────────────┤
│                                                       │
│ Key: NEXT_PUBLIC_SUPABASE_URL                        │
│ Value: https://xxxxx.supabase.co                     │
│ Environments: ☑ Production ☑ Preview ☑ Development  │
│ [Add]                                                │
│                                                       │
│ Key: NEXT_PUBLIC_SUPABASE_ANON_KEY                   │
│ Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...       │
│ Environments: ☑ Production ☑ Preview ☑ Development  │
│ [Add]                                                │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## ⚠️ Önemli Notlar

1. **NEXT_PUBLIC_ prefix:** `NEXT_PUBLIC_` ile başlayan değişkenler client-side'da kullanılabilir. Supabase client'ı için gerekli.

2. **Sensitive Data:** `anon key` public olsa da, production'da kullanılır. Güvenli tutun, public repository'lerde commit etmeyin.

3. **Service Role Key (Opsiyonel):** Eğer server-side işlemler yapacaksanız (ör. admin panel), `SUPABASE_SERVICE_ROLE_KEY` ekleyebilirsiniz. **Ama bu key'i asla client-side'da kullanmayın!**

4. **Cache:** Environment variables eklendikten sonra deployment'ı yeniden başlatmanız gerekir. Cache'den eski değerler kullanılabilir.

---

## 🚨 Yaygın Hatalar

### ❌ "Supabase not configured" Hatası Devam Ediyor

**Çözüm:**
- Environment variables'ların doğru eklendiğinden emin olun
- Deployment'ı yeniden başlattınız mı?
- Production, Preview, Development için hepsini seçtiniz mi?
- Key'ler doğru mu? (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### ❌ "Invalid supabaseUrl" Hatası

**Çözüm:**
- URL `https://` ile başlamalı
- URL `.supabase.co` içermeli
- Placeholder değerler (`your_supabase_project_url`) olmamalı
- Tırnak işareti (`"`) kullanmayın

### ❌ Environment Variables Ekli Ama Hala Çalışmıyor

**Çözüm:**
- Deployment'ı yeniden başlatın (cache'den eski değerler kullanılıyor olabilir)
- Tarayıcı cache'ini temizleyin
- Incognito/Private mode'da deneyin

---

## 📞 Destek

Sorun devam ederse:
1. Vercel Dashboard → Deployments → Logs'u kontrol edin
2. Browser Console'da hata mesajlarını kontrol edin
3. Vercel Support'a başvurun: https://vercel.com/support
