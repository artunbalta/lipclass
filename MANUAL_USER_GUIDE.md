# Manuel Kullanıcı Oluşturma Rehberi - Supabase

## ⚠️ Sorun

Supabase Dashboard'dan manuel kullanıcı oluştururken "Database error creating new user" hatası alıyorsunuz.

## ✅ Çözüm

### 1. Trigger'ı Güncelleyin

**Supabase Dashboard → SQL Editor**'e gidin ve şu SQL'i çalıştırın:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
    COALESCE(
      CASE 
        WHEN NEW.raw_user_meta_data->>'role' IN ('teacher', 'student') 
        THEN (NEW.raw_user_meta_data->>'role')::user_role
        ELSE NULL
      END,
      'student'::user_role
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Bu trigger:
- ✅ Metadata'da `role` yoksa default `'student'` atar
- ✅ Metadata'da `name` yoksa email'i kullanır
- ✅ Profile zaten varsa hata vermez (ON CONFLICT)

### 2. Manuel Kullanıcı Oluştururken Role Nasıl Belirlenir?

#### Yöntem 1: User Metadata ile (Önerilen)

1. **Supabase Dashboard → Authentication → Users**
2. **"Add user"** butonuna tıklayın
3. Formu doldurun:
   - **Email**: `ogretmen@okul.com`
   - **Password**: Şifre girin
   - **Auto Confirm User**: ✅ (Checkbox'ı işaretleyin)
   - **User Metadata**: Şu JSON'ı ekleyin:
   
   ```json
   {
     "name": "Ayşe Yılmaz",
     "role": "teacher"
   }
   ```
   
   veya öğrenci için:
   
   ```json
   {
     "name": "Mehmet Kaya",
     "role": "student"
   }
   ```

4. **"Create user"** butonuna tıklayın

**Önemli:** `role` metadata'sında sadece `"teacher"` veya `"student"` kullanabilirsiniz.

#### Yöntem 2: Sonradan Güncelleme

Eğer kullanıcıyı zaten oluşturduysanız:

1. **Table Editor → profiles** tablosuna gidin
2. Kullanıcıyı bulun
3. **role** sütununu manuel olarak `teacher` veya `student` yapın
4. Kaydedin

### 3. Kontrol

Kullanıcı oluşturulduktan sonra:

- **Table Editor → profiles** → Yeni kullanıcıyı görmelisiniz
- **role** sütunu doğru değeri göstermelidir (`teacher` veya `student`)

## 📋 Örnek User Metadata

### Öğretmen için:
```json
{
  "name": "Ayşe Yılmaz",
  "role": "teacher",
  "school": "Atatürk Ortaokulu",
  "subject": "Matematik"
}
```

### Öğrenci için:
```json
{
  "name": "Mehmet Kaya",
  "role": "student",
  "school": "Atatürk Ortaokulu",
  "grade": "8. Sınıf"
}
```

## 🔍 Hata Kontrolü

Eğer hala hata alıyorsanız:

1. **SQL Editor**'de trigger'ın çalıştığını kontrol edin:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. **Logs** sekmesinde hatayı kontrol edin

3. **Table Editor → profiles** → Kullanıcının oluşup oluşmadığını kontrol edin

## ⚡ Hızlı Test

Test için bir kullanıcı oluşturun:

1. **Authentication → Users → Add user**
2. Email: `test@example.com`
3. Password: `test123456`
4. Auto Confirm: ✅
5. User Metadata:
   ```json
   {
     "name": "Test User",
     "role": "student"
   }
   ```
6. Create user
7. **Table Editor → profiles** → Kullanıcıyı kontrol edin

---

**Not:** Manuel kullanıcı oluşturma nadiren kullanılır. Genellikle uygulama üzerinden Sign Up yapılır ve role otomatik olarak metadata'ya eklenir.
