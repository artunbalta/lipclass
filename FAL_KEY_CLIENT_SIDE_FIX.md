# FAL_KEY Client-Side Sorunu - Çözüm

## 🚨 Sorun

Video generation client-side'da çalışıyor, ancak `FAL_KEY` server-side only.

**Next.js Kuralı:**
- `NEXT_PUBLIC_*` prefix'i → Client-side'da erişilebilir ✅
- Prefix olmayan → Sadece server-side'da erişilebilir ❌

---

## ✅ Hızlı Çözüm

Vercel'de `NEXT_PUBLIC_FAL_KEY` ekleyin:

1. **Vercel Dashboard** → Projenize gidin
2. **Settings** → **Environment Variables**
3. **Add New:**
   - **Key:** `NEXT_PUBLIC_FAL_KEY`
   - **Value:** `REDACTED_ROTATE_BEFORE_USING`
   - **Environments:** ☑ Production ☑ Preview ☑ Development
4. **Add** → **Redeploy** (cache işaretlemeden)

**Not:** Kod zaten `NEXT_PUBLIC_FAL_KEY` kontrol ediyor, bu yüzden çalışacak.

**⚠️ Güvenlik:** `NEXT_PUBLIC_*` variables client bundle'a dahil edilir. Geçici çözüm olarak kullanın.
