# Vercel Custom Domain DNS Setup - LipClass

## 🎯 DNS Kayıtları Gereksinimleri

Vercel'de custom domain kurmak için DNS sağlayıcınızda (domain registrar) şu kayıtları oluşturmalısınız:

---

## 📋 Root Domain (`lipclass.org`) için:

### CNAME Değerini Nereden Bulacaksınız?

1. **Vercel Dashboard** → Projenize gidin
2. **Settings** → **Domains** sekmesi
3. Domain adınızın (`lipclass.org`) yanındaki **"..."** (üç nokta) → **"Configuration"** veya **"View DNS Records"**
4. Vercel size DNS yapılandırma talimatlarını gösterecek
5. **CNAME Value** kısmında gösterilen değeri kopyalayın

**ÖNEMLİ:** Her Vercel projesi için CNAME değeri farklıdır. Vercel Dashboard'dan aldığınız değeri kullanın!

### Seçenek 1: CNAME Kaydı (Önerilen - Modern Yöntem)
```
Type: CNAME
Name: @ (veya boş bırakın)
Value: <VERCEL_DASHBOARD_DAN_ALINAN_CNAME_DEĞERİ>
TTL: 3600 (veya otomatik)
```

**Not:** Vercel Dashboard'da gösterilen CNAME değeri genellikle şu formatlardan biri olabilir:
- `cname.vercel-dns.com`
- `cname-xxxxx.vercel-dns.com`
- Başka bir özel değer

**Yukarıdaki formatlar sadece örnek! Mutlaka Vercel Dashboard'dan aldığınız gerçek değeri kullanın!**

### Seçenek 2: A Kaydı (Alternatif)
Eğer CNAME desteklemiyorsa (bazı DNS sağlayıcıları root domain'de CNAME'e izin vermez):
```
Type: A
Name: @ (veya boş bırakın)
Value: 76.76.21.21
TTL: 3600
```

**Not:** Vercel'in IP adresi zaman zaman değişebilir. CNAME yöntemi daha güvenilirdir.

---

## 📋 www Subdomain (`www.lipclass.org`) için:

### CNAME Kaydı (Zorunlu)

**CNAME değeri aynıdır** - Root domain için kullandığınız değerle aynı!

```
Type: CNAME
Name: www
Value: <ROOT_DOMAIN_İÇİN_KULLANDIĞINIZ_AYNI_CNAME_DEĞERİ>
TTL: 3600
```

---

## 🔍 Domain Verification (Opsiyonel)

Bazı durumlarda Vercel domain sahipliğini doğrulamak için TXT kaydı isteyebilir:

```
Type: TXT
Name: @ (veya www)
Value: vercel-verification=<random-string>
TTL: 3600
```

Bu değeri **Vercel Dashboard → Domains → lipclass.org → Configuration** bölümünde görebilirsiniz.

---

## ✅ Kontrol Listesi

- [ ] Root domain (`@` veya `lipclass.org`) için CNAME veya A kaydı eklendi
- [ ] `www` subdomain için CNAME kaydı eklendi
- [ ] DNS yayılması için beklendi (10 dakika - 24 saat)
- [ ] Vercel Dashboard'da domain durumu kontrol edildi
- [ ] SSL sertifikası oluşturuldu (otomatik, 1-24 saat sürebilir)

---

## 🚨 Yaygın Sorunlar ve Çözümleri

### 1. "Invalid Configuration" Hatası
- **Sebep:** DNS kayıtları henüz yayılmamış veya yanlış yapılandırılmış
- **Çözüm:** 
  - DNS sağlayıcınızda kayıtların doğru olduğundan emin olun
  - `dig lipclass.org` veya `nslookup lipclass.org` komutuyla DNS'in doğru çözümlendiğini kontrol edin
  - Vercel Dashboard'da "Refresh" butonuna tıklayın

### 2. SSL Sertifikası Oluşturulmuyor
- **Sebep:** DNS henüz tam yayılmamış veya yanlış yapılandırılmış
- **Çözüm:**
  - DNS yayılmasının tamamlanmasını bekleyin (24 saate kadar sürebilir)
  - Vercel Dashboard → Domains → Refresh butonuna tıklayın
  - DNS kayıtlarının doğru olduğundan emin olun

### 3. NET::ERR_CERT_COMMON_NAME_INVALID Hatası
- **Sebep:** SSL sertifikası henüz oluşturulmamış veya yanlış domain'e bağlanılmış
- **Çözüm:**
  - SSL sertifikasının oluşturulmasını bekleyin
  - Tarayıcıda `https://www.lipclass.org` adresini deneyin (root domain yerine)
  - Vercel Dashboard'da SSL durumunu kontrol edin

---

## 🔧 DNS Yayılmasını Kontrol Etme

### Windows PowerShell:
```powershell
nslookup lipclass.org
nslookup www.lipclass.org
```

### Online Araçlar:
- https://dnschecker.org - DNS yayılmasını dünyanın her yerinden kontrol eder
- https://www.whatsmydns.net - DNS kayıtlarını kontrol eder

---

## 📝 Vercel Dashboard'da Kontrol

1. **Vercel Dashboard** → **Settings** → **Domains**
2. `lipclass.org` ve `www.lipclass.org` için durumu kontrol edin
3. "Valid Configuration" görünüyorsa DNS doğru
4. "Generating SSL Certificate" görünüyorsa beklemede (normal)
5. Her iki domain için de "Production" deployment'ı bağlı olmalı

---

## 🎯 Örnek DNS Yapılandırması (Namecheap/GoDaddy/Cloudflare)

### Namecheap/GoDaddy:
```
Type    Name    Value                                    TTL
CNAME   @       <VERCEL_DASHBOARD_DAN_ALINAN_DEĞER>      3600
CNAME   www     <VERCEL_DASHBOARD_DAN_ALINAN_DEĞER>      3600
```

Veya A kaydı kullanıyorsanız:
```
Type    Name    Value       TTL
A       @       76.76.21.21 3600
CNAME   www     <VERCEL_DASHBOARD_DAN_ALINAN_DEĞER> 3600
```

### Cloudflare:
```
Type    Name    Value                                    Proxy
CNAME   @       <VERCEL_DASHBOARD_DAN_ALINAN_DEĞER>      DNS only (pasif)
CNAME   www     <VERCEL_DASHBOARD_DAN_ALINAN_DEĞER>      DNS only (pasif)
```

**ÖNEMLİ:** Cloudflare kullanıyorsanız, DNS-only modunda tutun (proxy kapalı), çünkü Vercel kendi CDN'ini kullanır.

---

## ⏱️ Süreç Tahminleri

- **DNS Yayılması:** 10 dakika - 24 saat
- **SSL Sertifikası Oluşturulması:** 1-24 saat (DNS yayılmasından sonra)
- **Toplam Süre:** Genellikle 1-2 saat içinde tamamlanır

---

## ✅ Başarı Kriterleri

1. ✅ Vercel Dashboard'da her iki domain için "Valid Configuration" görünüyor
2. ✅ SSL sertifikası "Valid" durumunda
3. ✅ `https://lipclass.org` çalışıyor (307 redirect to www)
4. ✅ `https://www.lipclass.org` çalışıyor ve SSL hatası yok
5. ✅ Tarayıcıda yeşil kilit ikonu görünüyor

---

## 📞 Destek

Sorun devam ederse:
1. Vercel Dashboard → Domains → Configuration'dan hata mesajlarını kontrol edin
2. Vercel Support'a başvurun: https://vercel.com/support
