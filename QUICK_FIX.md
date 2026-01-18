# ⚡ Hızlı Çözüm - Trigger Hatası

## ❌ Hata: "Database error creating new user"

Manuel kullanıcı oluştururken bu hatayı alıyorsanız, trigger'ı güncelleyin.

## ✅ Çözüm (2 Adım)

### Adım 1: SQL Editor'de Trigger'ı Güncelleyin

**Supabase Dashboard → SQL Editor**'e gidin ve **`supabase/fix-trigger-v2.sql`** dosyasının içeriğini **tamamen kopyalayıp çalıştırın**.

Bu SQL:
- ✅ Mevcut trigger'ı kaldırır
- ✅ Gelişmiş hata yönetimi ile yeni trigger oluşturur
- ✅ Role yoksa otomatik `'student'` atar
- ✅ Name yoksa email'den alır
- ✅ Hata durumunda kullanıcı oluşturmayı engellemez

### Adım 2: Tekrar Deneyin

1. **Authentication → Users → Add user**
2. Email: `artunbalta1@gmail.com` (veya istediğiniz email)
3. Password: Şifre girin
4. **Auto Confirm User**: ✅
5. **(Opsiyonel) User Metadata** - Role eklemek isterseniz:
   ```json
   {
     "name": "Artun Balta",
     "role": "teacher"
   }
   ```
   veya
   ```json
   {
     "name": "Artun Balta", 
     "role": "student"
   }
   ```
6. **Create user** butonuna tıklayın

## 🔍 Role Nasıl Belirlenir?

- **User Metadata'da `role` varsa** → O role kullanılır (`teacher` veya `student`)
- **User Metadata'da `role` yoksa** → Otomatik `'student'` atanır
- **Sonradan değiştirmek için** → Table Editor → profiles → role sütununu güncelleyin

## ✅ Test

Kullanıcı oluşturduktan sonra:

1. **Table Editor → profiles** tablosuna gidin
2. Yeni kullanıcıyı bulun (email ile arayın)
3. `role` sütunu `student` veya `teacher` olmalı
4. `name` sütunu doldurulmuş olmalı

## ⚠️ Hala Hata Alıyorsanız

1. **SQL Editor → Logs** sekmesinde hatayı kontrol edin
2. **Table Editor → profiles** → Kullanıcı oluşmuş mu kontrol edin
3. Aynı email'de başka kullanıcı var mı kontrol edin (unique constraint)

---

**Önemli:** Trigger güncellemesini sadece bir kez yapmanız yeterli. Tüm yeni kullanıcılar için otomatik çalışacak.
