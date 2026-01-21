'use client';

import LoginPage from '@/components/ui/animated-characters-login-page';

// Karakter renklerini buradan özelleştirebilirsiniz
const customColors = {
  primary: '#6366f1',      // Sol arkadaki uzun karakter (indigo)
  black: '#2D2D2D',        // Ortadaki siyah karakter
  secondary: '#f97316',    // Sol öndeki yarım daire karakter (turuncu)
  accent: '#10b981',       // Sağ öndeki uzun karakter (yeşil)
  pupil: '#2D2D2D',        // Göz bebeği rengi
};

// Karakter şekillerini buradan özelleştirebilirsiniz
const customShapes = {
  primary: {
    width: '180px',           // Genişlik
    height: '400px',          // Normal yükseklik
    heightTyping: '440px',    // Yazarken yükseklik (opsiyonel)
    borderRadius: '10px 10px 0 0',  // Üst köşeler yuvarlatılmış
    left: '70px',             // Sol pozisyon
    shape: 'rounded' as const, // Şekil tipi: 'rectangle' | 'circle' | 'semicircle' | 'rounded'
  },
  black: {
    width: '120px',
    height: '310px',
    borderRadius: '8px 8px 0 0',
    left: '240px',
    shape: 'rounded' as const,
  },
  secondary: {
    width: '240px',
    height: '200px',
    borderRadius: '120px 120px 0 0',  // Yarım daire için genişlik/2
    left: '0px',
    shape: 'semicircle' as const,
  },
  accent: {
    width: '140px',
    height: '230px',
    borderRadius: '70px 70px 0 0',   // Yuvarlatılmış üst
    left: '310px',
    shape: 'rounded' as const,
  },
};

export default function SignInPage() {
  return <LoginPage colors={customColors} shapes={customShapes} />;
}
