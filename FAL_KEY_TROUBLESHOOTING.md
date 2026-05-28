# FAL_KEY Hatası - Sorun Giderme

## 🚨 Hata Devam Ediyor

Vercel'e `FAL_KEY` eklediniz ama hala "FAL_KEY is not configured" hatası alıyorsunuz.

---

## ✅ Kontrol Listesi

### 1. Environment Variable Doğru Eklendi Mi?

**Vercel Dashboard → Settings → Environment Variables** sayfasında kontrol edin:

- [ ] **Key ismi:** `FAL_KEY` (büyük harfler, alt çizgi) ✅
- [ ] **Value:** `REDACTED_ROTATE_BEFORE_USING` ✅
- [ ] **Environments:** ☑ Production ✅

**YANLIŞ örnekler:**
- ❌ `fal_key` (küçük harf)
- ❌ `FAL-KEY` (tire işareti)
- ❌ `FAL_KEY` yalnızca Preview'da seçili

**DOĞRU:**
- ✅ `FAL_KEY` (büyük harfler)
- ✅ Production environment seçili

---

### 2. Deployment Yeniden Başlatıldı Mı?

**ÖNEMLİ:** Environment variable ekledikten sonra **mutlaka** deployment'ı yeniden başlatmanız gerekir!

#### Kontrol:

1. **Vercel Dashboard → Deployments** sekmesine gidin
2. En son deployment'a bakın
3. Deployment zamanını kontrol edin:
   - Environment variable eklediğiniz **zamandan sonra** mı?
   - Eğer öncesi ise, yeniden başlatılmamış demektir

#### Çözüm:

**Yöntem 1: Redeploy (Hızlı)**
1. **Deployments** sekmesine gidin
2. Son deployment'ın yanındaki **"..."** → **"Redeploy"**
3. **"Use existing Build Cache"** seçeneğini **işaretlemeyin** (çok önemli!)
4. **Redeploy** butonuna tıklayın

**Yöntem 2: Manuel Trigger**
```bash
git commit --allow-empty -m "Trigger redeploy for FAL_KEY"
git push
```

---

### 3. Build Cache Sorunu

**Sorun:** Deployment cache'den eski environment variable değerlerini kullanıyor olabilir.

**Çözüm:**
- Redeploy yaparken **"Use existing Build Cache"** seçeneğini **MUTLAKA İŞARETLEMEYİN**
- Veya Vercel Dashboard'dan environment variable'ı silip tekrar ekleyin (bu cache'i temizler)

---

### 4. Key İsmi Kontrolü

Kodda şu şekilde kontrol ediliyor:
```typescript
const key = process.env.NEXT_PUBLIC_FAL_KEY || process.env.FAL_KEY;
```

**Yani iki key ismi kabul ediliyor:**
- `NEXT_PUBLIC_FAL_KEY` (client-side'da kullanılabilir - güvenli değil)
- `FAL_KEY` (server-side only - önerilen) ✅

**Kullanın:** `FAL_KEY` (NEXT_PUBLIC_ prefix'i olmadan)

---

### 5. Production vs Preview vs Development

Environment variable hangi environment'larda seçili?

**Kontrol:**
- Vercel Dashboard → Settings → Environment Variables
- `FAL_KEY` satırında **Production** kolonu işaretli mi? ✅

Eğer sadece Preview veya Development seçiliyse, Production'da çalışmaz!

---

## 🔧 Adım Adım Çözüm

### Adım 1: Vercel Dashboard Kontrolü

1. **https://vercel.com/dashboard** → Projenize gidin
2. **Settings** → **Environment Variables**
3. `FAL_KEY` var mı kontrol edin:
   - Eğer yoksa: **Add New** → ekleyin
   - Eğer varsa: Düzenleyin ve **Production** seçili olduğundan emin olun

### Adım 2: Deployment Yeniden Başlatma

1. **Deployments** sekmesine gidin
2. Son deployment → **"..."** → **"Redeploy"**
3. **"Use existing Build Cache"** seçeneğini **İŞARETLEMEYİN** ⚠️
4. **Redeploy** butonuna tıklayın

### Adım 3: Build Loglarını Kontrol Edin

1. **Deployments** → Son deployment'a tıklayın
2. **Build Logs** sekmesine gidin
3. Environment variables doğru yüklenmiş mi kontrol edin

**Not:** Vercel build loglarında environment variable değerleri gösterilmez (güvenlik için), sadece key isimleri gösterilir.

### Adım 4: Test

1. Deployment tamamlandıktan sonra (2-3 dakika)
2. Production URL'ye gidin: `https://www.lipclass.org` veya `https://lipclass.vercel.app`
3. Video oluşturmayı deneyin
4. Hata kayboldu mu kontrol edin

---

## 🚨 Hala Çalışmıyorsa

### Olası Nedenler:

1. **Yanlış Proje**
   - Birden fazla Vercel projeniz var mı?
   - Doğru projeye mi environment variable eklediniz?

2. **Environment Variable Gizli**
   - Vercel Dashboard'da environment variable gözükmüyor mu?
   - Silip tekrar eklemeyi deneyin

3. **Build Cache**
   - Cache'i temizlemek için:
     - Environment variable'ı silin
     - Redeploy yapın (cache temizlenir)
     - Environment variable'ı tekrar ekleyin
     - Yeniden Redeploy yapın

4. **Deployment Region**
   - Deployment hangi region'da çalışıyor?
   - Environment variable tüm region'larda mevcut mu?

---

## ✅ Hızlı Test

Production URL'de console'u açın ve şunu deneyin:

```javascript
// Console'da çalıştırın (browser DevTools)
console.log('FAL_KEY exists:', !!process.env.FAL_KEY);
// false dönerse, environment variable yüklenmemiş demektir
```

**Not:** `FAL_KEY` server-side kullanıldığı için client-side console'da görünmeyebilir. Bu normal.

---

## 📞 Son Çare

Eğer hala çalışmıyorsa:

1. Environment variable'ı **silin**
2. **Yeni bir deployment** yapın (cache temizlenir)
3. Environment variable'ı **tekrar ekleyin**
4. **Yeniden Redeploy** yapın (cache'i işaretlemeden)

Veya Vercel Support'a başvurun: https://vercel.com/support
