// MEB Müfredatı — Pilot Katalog (v2: pilot derslerin tüm kazanımları)
//
// Kodlama MEB'in resmi "Sınıf.Ünite.AltKonu.Kazanım" şemasına uyumlu
// (örn: 8.2.1.1). Pilot kapsam:
//   - 8. Sınıf Matematik (54 kazanım, 12 ünite)
//   - 9. Sınıf Fizik     (49 kazanım, 7 ünite — Optik dahil)
//   - 10. Sınıf Kimya    (32 kazanım, 4 ünite)
//   Toplam: 135 kazanım
//
// Tam katalog (5-12. sınıf, tüm dersler) sonraki PR'da MEB'in açık verisinden
// otomatik üretilecek.

export type CurriculumSubject = 'Matematik' | 'Fizik' | 'Kimya';
export type CurriculumGrade = '8' | '9' | '10';

export interface Kazanim {
  code: string;          // "8.2.1.1"
  title: string;         // Kazanım metni
  unitName: string;      // Ünite adı
  subject: CurriculumSubject;
  grade: CurriculumGrade;
  semester?: 1 | 2;      // 1. veya 2. dönem
}

// ── 8. Sınıf Matematik ──────────────────────────────────────────────────────
const MATH_8: Kazanim[] = [
  // Ünite 1: Çarpanlar ve Katlar
  { code: '8.1.1.1', title: 'Verilen pozitif tam sayıların pozitif tam sayı çarpanlarını bulur, pozitif tam sayıların çarpanlarını üslü ifadelerin çarpımı şeklinde yazar.', unitName: 'Çarpanlar ve Katlar', subject: 'Matematik', grade: '8', semester: 1 },
  { code: '8.1.1.2', title: 'İki doğal sayının en büyük ortak bölenini (EBOB) ve en küçük ortak katını (EKOK) hesaplar; ilgili problemleri çözer.', unitName: 'Çarpanlar ve Katlar', subject: 'Matematik', grade: '8', semester: 1 },
  { code: '8.1.1.3', title: 'Aralarında asal sayıları tanır ve örneklerle açıklar.', unitName: 'Çarpanlar ve Katlar', subject: 'Matematik', grade: '8', semester: 1 },

  // Ünite 2: Üslü İfadeler
  { code: '8.2.1.1', title: 'Tam sayıların tam sayı kuvvetlerini hesaplar; sıfırın ve negatif tam sayıların kuvvetlerini yorumlar.', unitName: 'Üslü İfadeler', subject: 'Matematik', grade: '8', semester: 1 },
  { code: '8.2.1.2', title: 'Üslü ifadelerle ilgili temel kuralları (çarpma, bölme, kuvvetin kuvveti) anlar ve birbirine denk ifadeler oluşturur.', unitName: 'Üslü İfadeler', subject: 'Matematik', grade: '8', semester: 1 },
  { code: '8.2.1.3', title: 'Sayıların ondalık gösterimlerini 10\'un tam sayı kuvvetlerini kullanarak çözümler.', unitName: 'Üslü İfadeler', subject: 'Matematik', grade: '8', semester: 1 },
  { code: '8.2.1.4', title: 'Verilen bir sayıyı 10\'un farklı tam sayı kuvvetlerini kullanarak ifade eder.', unitName: 'Üslü İfadeler', subject: 'Matematik', grade: '8', semester: 1 },
  { code: '8.2.1.5', title: 'Çok büyük ve çok küçük sayıları bilimsel gösterimle ifade eder ve karşılaştırır.', unitName: 'Üslü İfadeler', subject: 'Matematik', grade: '8', semester: 1 },

  // Ünite 3: Kareköklü İfadeler
  { code: '8.3.1.1', title: 'Tam kare doğal sayılar ile bu sayıların karekökleri arasındaki ilişkiyi belirler.', unitName: 'Kareköklü İfadeler', subject: 'Matematik', grade: '8', semester: 1 },
  { code: '8.3.1.2', title: 'Tam kare olmayan sayıların kareköklerinin hangi iki doğal sayı arasında olduğunu strateji kullanarak tahmin eder.', unitName: 'Kareköklü İfadeler', subject: 'Matematik', grade: '8', semester: 1 },
  { code: '8.3.1.3', title: 'Kareköklü bir ifadeyi a√b şeklinde yazar ve a√b şeklindeki ifadeyi √c biçiminde yazar.', unitName: 'Kareköklü İfadeler', subject: 'Matematik', grade: '8', semester: 1 },
  { code: '8.3.1.4', title: 'Kareköklü ifadelerle çarpma ve bölme işlemleri yapar.', unitName: 'Kareköklü İfadeler', subject: 'Matematik', grade: '8', semester: 1 },
  { code: '8.3.1.5', title: 'Kareköklü ifadelerle toplama ve çıkarma işlemleri yapar.', unitName: 'Kareköklü İfadeler', subject: 'Matematik', grade: '8', semester: 1 },
  { code: '8.3.1.6', title: 'Kareköklü bir ifadeyle çarpıldığında sonucu doğal sayı yapan çarpanlara örnek verir.', unitName: 'Kareköklü İfadeler', subject: 'Matematik', grade: '8', semester: 1 },
  { code: '8.3.1.7', title: 'Ondalık ifadelerin kareköklerini belirler.', unitName: 'Kareköklü İfadeler', subject: 'Matematik', grade: '8', semester: 1 },
  { code: '8.3.1.8', title: 'Gerçek sayıları tanır, rasyonel ve irrasyonel sayılarla ilişkilendirir.', unitName: 'Kareköklü İfadeler', subject: 'Matematik', grade: '8', semester: 1 },

  // Ünite 4: Veri Analizi
  { code: '8.4.1.1', title: 'En çok iki veri grubuna ait çizgi ve sütun grafiklerini yorumlar.', unitName: 'Veri Analizi', subject: 'Matematik', grade: '8', semester: 1 },
  { code: '8.4.1.2', title: 'Verileri sütun, daire veya çizgi grafiği ile gösterir ve bu gösterimler arasında uygun olan dönüşümleri yapar.', unitName: 'Veri Analizi', subject: 'Matematik', grade: '8', semester: 1 },
  { code: '8.4.1.3', title: 'Verileri inceleyerek araştırma sorularına cevap üretir.', unitName: 'Veri Analizi', subject: 'Matematik', grade: '8', semester: 1 },

  // Ünite 5: Olasılık
  { code: '8.5.1.1', title: 'Bir olaya ait olası durumları belirler.', unitName: 'Olasılık', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.5.1.2', title: '"Daha fazla", "eşit", "daha az" olası olayları ayırt eder; örneklerle açıklar.', unitName: 'Olasılık', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.5.1.3', title: 'Bir olayın olma olasılığını hesaplar.', unitName: 'Olasılık', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.5.1.4', title: 'Bağımlı ve bağımsız olayların oluşma olasılıklarını hesaplar.', unitName: 'Olasılık', subject: 'Matematik', grade: '8', semester: 2 },

  // Ünite 6: Cebirsel İfadeler ve Özdeşlikler
  { code: '8.6.1.1', title: 'Basit cebirsel ifadeleri anlar ve farklı biçimlerde yazar.', unitName: 'Cebirsel İfadeler ve Özdeşlikler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.6.1.2', title: 'Cebirsel ifadelerin çarpımını yapar.', unitName: 'Cebirsel İfadeler ve Özdeşlikler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.6.1.3', title: 'Özdeşlikleri (a+b)², (a-b)², (a+b)(a-b) modellerle açıklar.', unitName: 'Cebirsel İfadeler ve Özdeşlikler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.6.1.4', title: 'Cebirsel ifadeleri ortak çarpan parantezine alarak çarpanlarına ayırır.', unitName: 'Cebirsel İfadeler ve Özdeşlikler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.6.1.5', title: 'İki kare farkı, tam kare ve x² + bx + c biçimindeki ifadeleri çarpanlarına ayırır.', unitName: 'Cebirsel İfadeler ve Özdeşlikler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.6.1.6', title: 'Cebirsel ifadeleri kullanarak günlük hayat problemlerini matematiksel olarak modelleyerek çözer.', unitName: 'Cebirsel İfadeler ve Özdeşlikler', subject: 'Matematik', grade: '8', semester: 2 },

  // Ünite 7: Doğrusal Denklemler
  { code: '8.7.1.1', title: 'Birinci dereceden bir bilinmeyenli denklemleri çözer.', unitName: 'Doğrusal Denklemler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.7.1.2', title: 'Koordinat sistemini özellikleriyle tanır ve sıralı ikilileri gösterir.', unitName: 'Doğrusal Denklemler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.7.1.3', title: 'Aralarında doğrusal ilişki bulunan iki değişkenden birinin değerini verildiğinde diğerini bulur.', unitName: 'Doğrusal Denklemler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.7.1.4', title: 'Doğrunun eğimini modellerle açıklar; doğrusal denklemleri ve grafiklerini eğimle ilişkilendirir.', unitName: 'Doğrusal Denklemler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.7.1.5', title: 'Birinci dereceden bir bilinmeyenli denklem kurmayı gerektiren problemleri çözer.', unitName: 'Doğrusal Denklemler', subject: 'Matematik', grade: '8', semester: 2 },

  // Ünite 8: Eşitsizlikler
  { code: '8.8.1.1', title: 'Birinci dereceden bir bilinmeyenli eşitsizlik içeren günlük hayat durumlarına uygun matematik cümleleri yazar.', unitName: 'Eşitsizlikler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.8.1.2', title: 'Birinci dereceden bir bilinmeyenli eşitsizliklerin çözüm kümesini sayı doğrusunda gösterir.', unitName: 'Eşitsizlikler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.8.1.3', title: 'Birinci dereceden bir bilinmeyenli eşitsizlikleri çözer.', unitName: 'Eşitsizlikler', subject: 'Matematik', grade: '8', semester: 2 },

  // Ünite 9: Üçgenler
  { code: '8.9.1.1', title: 'Üçgende kenarortay, açıortay ve yüksekliği inşa eder.', unitName: 'Üçgenler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.9.1.2', title: 'Üçgenin iki kenar uzunluğunun toplamı veya farkı ile üçüncü kenarının uzunluğunu ilişkilendirir.', unitName: 'Üçgenler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.9.1.3', title: 'Üçgenin kenar uzunlukları ile bu kenarların karşısındaki açıların ölçüleri arasındaki ilişkiyi belirler.', unitName: 'Üçgenler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.9.1.4', title: 'Yeterli sayıda elemanının ölçüleri verilen bir üçgeni çizer.', unitName: 'Üçgenler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.9.1.5', title: 'Pisagor bağıntısını oluşturur ve problemlerde uygular.', unitName: 'Üçgenler', subject: 'Matematik', grade: '8', semester: 2 },

  // Ünite 10: Eşlik ve Benzerlik
  { code: '8.10.1.1', title: 'Eşlik ve benzerliği ilişkilendirir; eş ve benzer şekillerin kenar ve açı ilişkilerini belirler.', unitName: 'Eşlik ve Benzerlik', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.10.1.2', title: 'Benzer çokgenlerin benzerlik oranını belirler; bir çokgene eş ve benzer çokgenler oluşturur.', unitName: 'Eşlik ve Benzerlik', subject: 'Matematik', grade: '8', semester: 2 },

  // Ünite 11: Dönüşüm Geometrisi
  { code: '8.11.1.1', title: 'Nokta, doğru parçası ve diğer şekillerin öteleme sonucu oluşan görüntüsünü çizer.', unitName: 'Dönüşüm Geometrisi', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.11.1.2', title: 'Nokta, doğru parçası ve diğer şekillerin yansıma sonucu oluşan görüntüsünü çizer.', unitName: 'Dönüşüm Geometrisi', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.11.1.3', title: 'Çokgenlerin öteleme ve yansımalar sonucundaki görüntüsünü oluşturur.', unitName: 'Dönüşüm Geometrisi', subject: 'Matematik', grade: '8', semester: 2 },

  // Ünite 12: Geometrik Cisimler
  { code: '8.12.1.1', title: 'Dik prizmaları tanır, temel elemanlarını belirler, inşa eder ve açınımını çizer.', unitName: 'Geometrik Cisimler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.12.1.2', title: 'Dik prizmaların yüzey alanı bağıntılarını oluşturur ve problemlerde uygular.', unitName: 'Geometrik Cisimler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.12.1.3', title: 'Dik prizmaların hacim bağıntılarını oluşturur ve problemlerde uygular.', unitName: 'Geometrik Cisimler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.12.1.4', title: 'Dik dairesel silindirin temel elemanlarını belirler, inşa eder ve açınımını çizer.', unitName: 'Geometrik Cisimler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.12.1.5', title: 'Dik dairesel silindirin yüzey alanı bağıntısını oluşturur ve problemlerde uygular.', unitName: 'Geometrik Cisimler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.12.1.6', title: 'Dik dairesel silindirin hacim bağıntısını oluşturur ve problemlerde uygular.', unitName: 'Geometrik Cisimler', subject: 'Matematik', grade: '8', semester: 2 },
  { code: '8.12.1.7', title: 'Dik dairesel piramit ve dik koniyi tanır; temel elemanlarını belirler.', unitName: 'Geometrik Cisimler', subject: 'Matematik', grade: '8', semester: 2 },
];

// ── 9. Sınıf Fizik ──────────────────────────────────────────────────────────
const PHYSICS_9: Kazanim[] = [
  // Ünite 1: Fizik Bilimine Giriş
  { code: '9.1.1.1', title: 'Fiziğin uygarlığın gelişmesine katkısını açıklar.', unitName: 'Fizik Bilimine Giriş', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.1.1.2', title: 'Fizik biliminin alt dallarını ve çalışma alanlarını ayırt eder.', unitName: 'Fizik Bilimine Giriş', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.1.1.3', title: 'Fiziğin diğer disiplinler ile ilişkisini açıklar.', unitName: 'Fizik Bilimine Giriş', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.1.1.4', title: 'Fiziksel niceliklerin sınıflandırılmasında temel ve türetilmiş büyüklük kavramlarını ayırt eder.', unitName: 'Fizik Bilimine Giriş', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.1.1.5', title: 'SI birim sistemini ve bu sistemde kullanılan birimleri açıklar.', unitName: 'Fizik Bilimine Giriş', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.1.1.6', title: 'Skaler ve vektörel büyüklükleri örneklerle ayırt eder; vektörlerin matematiksel işlemlerini yapar.', unitName: 'Fizik Bilimine Giriş', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.1.1.7', title: 'Fizikte modellemenin önemini ve kullanım amacını açıklar.', unitName: 'Fizik Bilimine Giriş', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.1.1.8', title: 'Fiziğin teknoloji, toplum ve çevre üzerindeki etkilerini örneklerle açıklar.', unitName: 'Fizik Bilimine Giriş', subject: 'Fizik', grade: '9', semester: 1 },

  // Ünite 2: Madde ve Özellikleri
  { code: '9.2.1.1', title: 'Kütle, hacim ve özkütle arasındaki ilişkiyi açıklar; problemlerde kullanır.', unitName: 'Madde ve Özellikleri', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.2.1.2', title: 'Karışımların özkütlesinin bileşenlerin özkütlelerine bağlı olduğunu örneklerle açıklar.', unitName: 'Madde ve Özellikleri', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.2.1.3', title: 'Kütle ile ağırlık arasındaki farkı örneklerle açıklar.', unitName: 'Madde ve Özellikleri', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.2.1.4', title: 'Dayanıklılığa neden olan etkenleri keşfeder.', unitName: 'Madde ve Özellikleri', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.2.1.5', title: 'Yapışma (adezyon) ve birbirini tutma (kohezyon) kuvvetlerinin etkilerini açıklar.', unitName: 'Madde ve Özellikleri', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.2.1.6', title: 'Yüzey gerilimi ve kılcallık olaylarını günlük yaşamdan örneklerle açıklar.', unitName: 'Madde ve Özellikleri', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.2.1.7', title: 'Esneklik özelliği ile Hooke yasası arasındaki ilişkiyi analiz eder.', unitName: 'Madde ve Özellikleri', subject: 'Fizik', grade: '9', semester: 1 },

  // Ünite 3: Hareket ve Kuvvet
  { code: '9.3.1.1', title: 'Yer değiştirme, sürat ve hız kavramlarını birbirinden ayırt eder.', unitName: 'Hareket ve Kuvvet', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.3.1.2', title: 'Düzgün doğrusal hareket eden cisimlerin konum, yer değiştirme, sürat ve hız grafiklerini analiz eder.', unitName: 'Hareket ve Kuvvet', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.3.1.3', title: 'İvme kavramını açıklar.', unitName: 'Hareket ve Kuvvet', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.3.1.4', title: 'Düzgün ivmeli doğrusal hareketin grafik ve denklemlerini analiz eder.', unitName: 'Hareket ve Kuvvet', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.3.1.5', title: 'Serbest düşme hareketini analiz eder ve problemlerinde uygular.', unitName: 'Hareket ve Kuvvet', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.3.1.6', title: 'Newton\'un hareket yasalarını günlük yaşamdan örneklerle açıklar.', unitName: 'Hareket ve Kuvvet', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.3.1.7', title: 'Eylemsizlik ile kütle arasındaki ilişkiyi açıklar.', unitName: 'Hareket ve Kuvvet', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.3.1.8', title: 'Etki-tepki kuvvetlerini örneklerle açıklar.', unitName: 'Hareket ve Kuvvet', subject: 'Fizik', grade: '9', semester: 1 },
  { code: '9.3.1.9', title: 'Sürtünme kuvvetinin bağlı olduğu değişkenleri belirler.', unitName: 'Hareket ve Kuvvet', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.3.1.10', title: 'Bir cisme uygulanan kuvvetlerin bileşkesini grafik ve cebirsel yöntemlerle hesaplar.', unitName: 'Hareket ve Kuvvet', subject: 'Fizik', grade: '9', semester: 2 },

  // Ünite 4: Enerji
  { code: '9.4.1.1', title: 'İş, enerji ve güç kavramlarını birbirinden ayırt eder; ilişkilerini açıklar.', unitName: 'Enerji', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.4.1.2', title: 'Kinetik ve potansiyel enerji türlerini örneklerle açıklar.', unitName: 'Enerji', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.4.1.3', title: 'Mekanik enerjinin korunumunu örnekler üzerinde açıklar.', unitName: 'Enerji', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.4.1.4', title: 'Sürtünme kuvvetinin yaptığı işin enerji dönüşümüne etkisini analiz eder.', unitName: 'Enerji', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.4.1.5', title: 'Verim kavramını günlük yaşamdan örnekler vererek açıklar.', unitName: 'Enerji', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.4.1.6', title: 'Enerji kaynaklarını yenilenebilir ve yenilenemez olarak sınıflandırır; tasarrufun önemini açıklar.', unitName: 'Enerji', subject: 'Fizik', grade: '9', semester: 2 },

  // Ünite 5: Isı ve Sıcaklık
  { code: '9.5.1.1', title: 'Isı ve sıcaklık kavramlarını ayırt eder.', unitName: 'Isı ve Sıcaklık', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.5.1.2', title: 'Sıcaklık ölçekleri (Celsius, Kelvin, Fahrenheit) arasında dönüşüm yapar.', unitName: 'Isı ve Sıcaklık', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.5.1.3', title: 'Maddelerin öz ısılarına bağlı olarak ısı alış verişini hesaplar.', unitName: 'Isı ve Sıcaklık', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.5.1.4', title: 'Hâl değişimi süresince madde tarafından alınan ya da verilen ısıyı hesaplar.', unitName: 'Isı ve Sıcaklık', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.5.1.5', title: 'Genleşme olayını günlük yaşamdan örneklerle açıklar.', unitName: 'Isı ve Sıcaklık', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.5.1.6', title: 'Isı iletimini etkileyen değişkenleri analiz eder; iletim, konveksiyon ve ışıma yollarını ayırt eder.', unitName: 'Isı ve Sıcaklık', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.5.1.7', title: 'İklimsel olayların yorumlanmasında ısı ve sıcaklık arasındaki ilişkiyi kullanır.', unitName: 'Isı ve Sıcaklık', subject: 'Fizik', grade: '9', semester: 2 },

  // Ünite 6: Elektrostatik
  { code: '9.6.1.1', title: 'Elektrik yüklerini ve yüklü cisimler arasındaki etkileşimi açıklar.', unitName: 'Elektrostatik', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.6.1.2', title: 'Elektroskopun çalışma prensibini ve kullanım amacını açıklar.', unitName: 'Elektrostatik', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.6.1.3', title: 'Topraklama olayını günlük yaşamdan örneklerle açıklar.', unitName: 'Elektrostatik', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.6.1.4', title: 'Coulomb yasasını matematiksel olarak ifade eder; örneklerde uygular.', unitName: 'Elektrostatik', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.6.1.5', title: 'Elektriksel kuvvet ile kütle çekim kuvvetini karşılaştırır.', unitName: 'Elektrostatik', subject: 'Fizik', grade: '9', semester: 2 },

  // Ünite 7: Optik
  { code: '9.7.1.1', title: 'Aydınlanmayı ışık kaynağı ve aydınlanan yüzey ilişkisi açısından açıklar.', unitName: 'Optik', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.7.1.2', title: 'Gölgenin oluşumunu ışık kaynağı ve cismin özellikleriyle ilişkilendirir.', unitName: 'Optik', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.7.1.3', title: 'Yansıma kanunlarını açıklar; düz ve küresel aynalarda görüntü oluşumunu çizimlerle gösterir.', unitName: 'Optik', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.7.1.4', title: 'Işığın kırılmasını günlük yaşamdan örneklerle açıklar; kırılma kanunlarını uygular.', unitName: 'Optik', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.7.1.5', title: 'Merceklerin temel kavramlarını ve görüntü oluşumunu çizimlerle açıklar.', unitName: 'Optik', subject: 'Fizik', grade: '9', semester: 2 },
  { code: '9.7.1.6', title: 'Renklerin oluşumunu (toplama ve çıkarma renk karışımları) açıklar.', unitName: 'Optik', subject: 'Fizik', grade: '9', semester: 2 },
];

// ── 10. Sınıf Kimya ─────────────────────────────────────────────────────────
const CHEMISTRY_10: Kazanim[] = [
  // Ünite 1: Kimyanın Temel Kanunları ve Kimyasal Hesaplamalar
  { code: '10.1.1.1', title: 'Kütlenin korunumu kanununu örneklerle açıklar.', unitName: 'Kimyanın Temel Kanunları ve Kimyasal Hesaplamalar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.1.1.2', title: 'Sabit oranlar kanununu örneklerle açıklar.', unitName: 'Kimyanın Temel Kanunları ve Kimyasal Hesaplamalar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.1.1.3', title: 'Katlı oranlar kanununu örneklerle açıklar.', unitName: 'Kimyanın Temel Kanunları ve Kimyasal Hesaplamalar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.1.1.4', title: 'Mol kavramını ve Avogadro sayısını açıklar.', unitName: 'Kimyanın Temel Kanunları ve Kimyasal Hesaplamalar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.1.1.5', title: 'Mol, kütle ve tanecik sayısı arasındaki ilişkileri kullanarak hesaplamalar yapar.', unitName: 'Kimyanın Temel Kanunları ve Kimyasal Hesaplamalar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.1.1.6', title: 'Saf maddelerin mol kütlesini, mol hacmini ve normal şartlarda gazların mol hacmini hesaplar.', unitName: 'Kimyanın Temel Kanunları ve Kimyasal Hesaplamalar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.1.1.7', title: 'Bileşiklerin yüzde bileşimini, basit ve molekül formüllerini hesaplar.', unitName: 'Kimyanın Temel Kanunları ve Kimyasal Hesaplamalar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.1.1.8', title: 'Kimyasal denklemleri yorumlar ve denkleştirir.', unitName: 'Kimyanın Temel Kanunları ve Kimyasal Hesaplamalar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.1.1.9', title: 'Kimyasal tepkimelerde mol, kütle ve hacim ilişkilerinden yola çıkarak stokiyometri hesaplamaları yapar.', unitName: 'Kimyanın Temel Kanunları ve Kimyasal Hesaplamalar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.1.1.10', title: 'Sınırlayıcı (tepkimeye giren) bileşen kavramını açıklar ve hesaplamalarda kullanır.', unitName: 'Kimyanın Temel Kanunları ve Kimyasal Hesaplamalar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.1.1.11', title: 'Tepkime verimini hesaplar ve günlük yaşam örnekleriyle ilişkilendirir.', unitName: 'Kimyanın Temel Kanunları ve Kimyasal Hesaplamalar', subject: 'Kimya', grade: '10', semester: 1 },

  // Ünite 2: Karışımlar
  { code: '10.2.1.1', title: 'Homojen ve heterojen karışımları ayırt eder; örnekler verir.', unitName: 'Karışımlar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.2.1.2', title: 'Çözünme olayını ve çözünürlüğü etkileyen faktörleri açıklar.', unitName: 'Karışımlar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.2.1.3', title: 'Çözeltilerin derişimini farklı birimlerle (kütlece yüzde, hacimce yüzde, molarite, molalite, ppm) ifade eder.', unitName: 'Karışımlar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.2.1.4', title: 'Derişim hesaplamaları yapar; seyreltme ve karıştırma problemlerini çözer.', unitName: 'Karışımlar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.2.1.5', title: 'Koligatif özellikleri (buhar basıncı düşmesi, kaynama noktası yükselmesi, donma noktası alçalması, ozmotik basınç) günlük yaşam örnekleriyle açıklar.', unitName: 'Karışımlar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.2.1.6', title: 'Kolloitler ve süspansiyonları homojen-heterojen ayrımı çerçevesinde örneklerle açıklar.', unitName: 'Karışımlar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.2.1.7', title: 'Karışımları ayırma yöntemlerini (süzme, mıknatıs, ayıklama, buharlaştırma, damıtma, ayırma hunisi, kromatografi) örneklerle açıklar.', unitName: 'Karışımlar', subject: 'Kimya', grade: '10', semester: 1 },

  // Ünite 3: Asitler, Bazlar ve Tuzlar
  { code: '10.3.1.1', title: 'Asitler ile bazların ayırt edici özelliklerini açıklar.', unitName: 'Asitler, Bazlar ve Tuzlar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.3.1.2', title: 'Arrhenius ve Brønsted-Lowry asit-baz tanımlarını karşılaştırır.', unitName: 'Asitler, Bazlar ve Tuzlar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.3.1.3', title: 'pH ve pOH kavramlarını açıklar; sulu çözeltilerde pH-pOH hesaplamaları yapar.', unitName: 'Asitler, Bazlar ve Tuzlar', subject: 'Kimya', grade: '10', semester: 1 },
  { code: '10.3.1.4', title: 'Asit ve bazların kuvvetli/zayıf olma sebeplerini örneklerle açıklar.', unitName: 'Asitler, Bazlar ve Tuzlar', subject: 'Kimya', grade: '10', semester: 2 },
  { code: '10.3.1.5', title: 'Asit-baz tepkimelerini ve nötralleşme tepkimesini açıklar.', unitName: 'Asitler, Bazlar ve Tuzlar', subject: 'Kimya', grade: '10', semester: 2 },
  { code: '10.3.1.6', title: 'Tuzların özelliklerini ve günlük hayattaki kullanımlarını örneklerle açıklar.', unitName: 'Asitler, Bazlar ve Tuzlar', subject: 'Kimya', grade: '10', semester: 2 },
  { code: '10.3.1.7', title: 'Asitlerin metaller ve karbonat tuzlarıyla verdiği tepkimeleri açıklar.', unitName: 'Asitler, Bazlar ve Tuzlar', subject: 'Kimya', grade: '10', semester: 2 },
  { code: '10.3.1.8', title: 'Asit yağmurlarının ve hava kirliliğinin çevre ve canlılar üzerindeki etkilerini açıklar.', unitName: 'Asitler, Bazlar ve Tuzlar', subject: 'Kimya', grade: '10', semester: 2 },

  // Ünite 4: Kimya Her Yerde
  { code: '10.4.1.1', title: 'Suyun arıtım süreçlerini ve içme suyu için yapılan işlemleri açıklar.', unitName: 'Kimya Her Yerde', subject: 'Kimya', grade: '10', semester: 2 },
  { code: '10.4.1.2', title: 'Su sertliğini ve sertlik giderme yöntemlerini açıklar.', unitName: 'Kimya Her Yerde', subject: 'Kimya', grade: '10', semester: 2 },
  { code: '10.4.1.3', title: 'Yaygın olarak kullanılan polimerleri ve plastiklerin çevreye etkilerini açıklar.', unitName: 'Kimya Her Yerde', subject: 'Kimya', grade: '10', semester: 2 },
  { code: '10.4.1.4', title: 'Kişisel bakım ürünleri ve temizlik malzemelerinde bulunan kimyasalları işlevleriyle açıklar.', unitName: 'Kimya Her Yerde', subject: 'Kimya', grade: '10', semester: 2 },
  { code: '10.4.1.5', title: 'İlaçların kimyasal yapısını, etkin maddelerini ve güvenli kullanımını açıklar.', unitName: 'Kimya Her Yerde', subject: 'Kimya', grade: '10', semester: 2 },
  { code: '10.4.1.6', title: 'Geri dönüşümün önemini, yapılışını ve kimyasal atıkların yönetimini açıklar.', unitName: 'Kimya Her Yerde', subject: 'Kimya', grade: '10', semester: 2 },
];

// ── Public catalog ──────────────────────────────────────────────────────────
export const KAZANIMLAR: Kazanim[] = [...MATH_8, ...PHYSICS_9, ...CHEMISTRY_10];

const BY_SUBJECT_GRADE = new Map<string, Kazanim[]>();
const BY_CODE = new Map<string, Kazanim>();

for (const k of KAZANIMLAR) {
  const key = `${k.subject}|${k.grade}`;
  if (!BY_SUBJECT_GRADE.has(key)) BY_SUBJECT_GRADE.set(key, []);
  BY_SUBJECT_GRADE.get(key)!.push(k);
  BY_CODE.set(k.code, k);
}

export function getKazanimlarBySubjectGrade(
  subject: string,
  grade: string
): Kazanim[] {
  return BY_SUBJECT_GRADE.get(`${subject}|${grade}`) || [];
}

export function findByCode(code: string): Kazanim | undefined {
  return BY_CODE.get(code);
}

export interface CoverageReport {
  subject: CurriculumSubject;
  grade: CurriculumGrade;
  totalKazanim: number;
  coveredKazanim: number;
  coveragePercent: number;
  uncoveredCodes: string[];
}

/**
 * Compute curriculum coverage given a list of (subject, grade, codes) tuples
 * from the teacher's videos. Groups by (subject, grade) and returns coverage
 * per group.
 */
export function computeCoverage(
  videoCodes: Array<{ subject: string; grade: string; codes: string[] }>
): CoverageReport[] {
  const acc = new Map<string, Set<string>>();
  for (const v of videoCodes) {
    const key = `${v.subject}|${v.grade}`;
    if (!acc.has(key)) acc.set(key, new Set());
    const set = acc.get(key)!;
    for (const c of v.codes) set.add(c);
  }

  const reports: CoverageReport[] = [];
  // Only emit a report for (subject, grade) combos that exist in the catalog
  for (const [key, allKazanim] of BY_SUBJECT_GRADE.entries()) {
    const [subject, grade] = key.split('|') as [CurriculumSubject, CurriculumGrade];
    const covered = acc.get(key) || new Set();
    const allCodes = new Set(allKazanim.map((k) => k.code));
    const validCovered = [...covered].filter((c) => allCodes.has(c));
    const uncovered = [...allCodes].filter((c) => !covered.has(c));

    reports.push({
      subject,
      grade,
      totalKazanim: allKazanim.length,
      coveredKazanim: validCovered.length,
      coveragePercent: Math.round((validCovered.length / allKazanim.length) * 100),
      uncoveredCodes: uncovered,
    });
  }
  return reports.filter((r) => r.coveredKazanim > 0); // only groups where teacher has at least 1
}

/**
 * Subjects + grades that have catalog entries. UI uses this to filter.
 */
export const SUPPORTED_SUBJECT_GRADES: Array<{ subject: CurriculumSubject; grade: CurriculumGrade }> = [
  { subject: 'Matematik', grade: '8' },
  { subject: 'Fizik', grade: '9' },
  { subject: 'Kimya', grade: '10' },
];

export function isCatalogCovered(subject: string, grade: string): boolean {
  return BY_SUBJECT_GRADE.has(`${subject}|${grade}`);
}
