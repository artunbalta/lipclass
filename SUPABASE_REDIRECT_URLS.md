# Supabase Redirect URL'leri Yapılandırma Rehberi

## 🎯 Sorun

Uygulamanız `localhost:3000` dışında farklı bir port'ta çalışıyorsa (örneğin `localhost:3001`, `localhost:8080`), Supabase Authentication redirect URL'lerini bu porta göre yapılandırmanız gerekir.

## ✅ Çözüm: Supabase'de Redirect URL'leri Ekleme

### Adım 1: Supabase Dashboard'a Gidin

1. **Supabase Dashboard** → https://supabase.com/dashboard
2. Projenize tıklayın
3. **Authentication** → **URL Configuration** sekmesine gidin

### Adım 2: Site URL'i Güncelleyin

**Site URL** alanına uygulamanızın ana URL'ini ekleyin:

- `http://localhost:3000` (varsayılan)
- `http://localhost:3001` (eğer 3001 portunda çalışıyorsa)
- `http://localhost:8080` (eğer 8080 portunda çalışıyorsa)
- veya kullandığınız herhangi bir port

### Adım 3: Redirect URL'leri Ekleyin

**Redirect URLs** listesine şu URL'leri ekleyin:

```
http://localhost:3000/**
http://localhost:3001/**
http://localhost:8080/**
```

**Not:** `**` wildcard kullanarak tüm alt sayfaları kapsayabilirsiniz.

### Örnek Yapılandırma

```
Site URL: http://localhost:3001

Redirect URLs:
- http://localhost:3001/**
- http://localhost:3000/** (eski port için de ekleyin, gerekirse)
- https://your-production-domain.com/** (production için)
```

## 🔧 Farklı Port Kullanmak İçin

### Yöntem 1: Environment Variable ile Port Belirleme

`package.json` dosyanızı güncelleyin:

```json
{
  "scripts": {
    "dev": "next dev -p 3001",
    "dev:3000": "next dev -p 3000",
    "dev:8080": "next dev -p 8080"
  }
}
```

Sonra şu komutla çalıştırın:
```bash
npm run dev  # 3001 portunda çalışır
```

### Yöntem 2: PORT Environment Variable

Terminal'de:
```bash
PORT=3001 npm run dev
```

Windows'ta (PowerShell):
```powershell
$env:PORT=3001; npm run dev
```

Windows'ta (CMD):
```cmd
set PORT=3001 && npm run dev
```

## 📋 Hangi URL'leri Eklemeliyim?

Supabase'de şu URL'leri eklemeniz gerekebilir:

1. **Development URL'leri:**
   - `http://localhost:3000/**`
   - `http://localhost:3001/**`
   - `http://127.0.0.1:3000/**`

2. **Production URL'leri:**
   - `https://yourdomain.com/**`
   - `https://www.yourdomain.com/**`

3. **Reset Password URL'leri:**
   - `http://localhost:3001/reset-password`
   - `https://yourdomain.com/reset-password`

## ⚠️ Önemli Notlar

1. **Wildcard Kullanımı:** `**` kullanarak tüm alt sayfaları kapsayabilirsiniz:
   - `http://localhost:3001/**` → Tüm sayfalar için geçerli

2. **Protocol:** Development için `http://`, production için `https://` kullanın

3. **Port Numarası:** Port numarasını doğru yazdığınızdan emin olun

4. **Değişiklikler:** Supabase'de yaptığınız değişiklikler hemen etkili olur (yeniden deploy gerekmez)

## 🧪 Test

1. Supabase'de URL'leri ekledikten sonra
2. Uygulamanızı başlatın: `npm run dev`
3. Sign In/Sign Up sayfasından bir işlem yapın
4. Redirect hatası almamalısınız

## 🆘 Sorun Giderme

### "Redirect URL not allowed" hatası alıyorsanız:

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Redirect URLs** listesine kullandığınız URL'yi ekleyin
3. Format: `http://localhost:PORT/**` (PORT yerine gerçek port numaranız)

### Hangi portu kullandığınızı bilmiyorsanız:

Terminal'de `npm run dev` çalıştırdığınızda şu mesajı göreceksiniz:
```
▲ Next.js 16.1.3
- Local:        http://localhost:3001  ← Bu port numarası
```
