// Constants used across the application
export const SUBJECTS = [
  'Matematik',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Türkçe',
  'Edebiyat',
  'Tarih',
  'Coğrafya',
  'İngilizce',
  'Fen Bilimleri',
];

export const GRADES = [
  { value: '5', label: '5. Sınıf' },
  { value: '6', label: '6. Sınıf' },
  { value: '7', label: '7. Sınıf' },
  { value: '8', label: '8. Sınıf' },
  { value: '9', label: '9. Sınıf' },
  { value: '10', label: '10. Sınıf' },
  { value: '11', label: '11. Sınıf' },
  { value: '12', label: '12. Sınıf' },
];

export const PROMPT_TEMPLATES = [
  {
    id: 'basic',
    name: 'Temel Anlatım',
    template: '{konu} konusunu {sinif}. sınıf öğrencilerine uygun şekilde, temel kavramlardan başlayarak anlat.',
  },
  {
    id: 'detailed',
    name: 'Detaylı Anlatım',
    template: '{konu} konusunu detaylı bir şekilde ele al. Örneklerle destekle ve öğrencilerin sıkça yaptığı hataları belirt.',
  },
  {
    id: 'interactive',
    name: 'İnteraktif',
    template: '{konu} konusunu öğrencilerin aktif katılımını sağlayacak şekilde anlat. Sorular sor ve düşünmeye teşvik et.',
  },
  {
    id: 'practical',
    name: 'Pratik Odaklı',
    template: '{konu} konusunu günlük hayattan örneklerle anlat. Nerede ve nasıl kullanıldığını göster.',
  },
];
