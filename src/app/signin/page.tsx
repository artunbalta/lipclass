'use client';

import LoginPage from '@/components/ui/animated-characters-login-page';

// Çocuksu, neşeli renkler
const customColors = {
  primary: '#FF6B9D',      // Pembe - Sol arkadaki uzun karakter
  black: '#4A90E2',        // Mavi - Ortadaki karakter
  secondary: '#FFC857',    // Sarı - Sol öndeki yarım daire karakter
  accent: '#95E1D3',       // Açık yeşil/mint - Sağ öndeki uzun karakter
  pupil: '#2D2D2D',        // Göz bebeği rengi (koyu)
};

// Çocuksu ve çeşitli boyutlar
const customShapes = {
  primary: {
    width: '160px',           // Biraz daha dar
    height: '380px',          // Biraz daha kısa
    heightTyping: '420px',    // Yazarken uzar
    borderRadius: '20px 20px 0 0',  // Daha yuvarlatılmış köşeler
    left: '80px',             // Pozisyon ayarı
    shape: 'rounded' as const,
  },
  black: {
    width: '110px',           // Biraz daha dar
    height: '280px',          // Orta boy
    heightTyping: '320px',    // Yazarken uzar
    borderRadius: '15px 15px 0 0',  // Yuvarlatılmış
    left: '250px',            // Pozisyon ayarı
    shape: 'rounded' as const,
  },
  secondary: {
    width: '220px',           // Biraz daha dar
    height: '180px',          // Kısa ve yuvarlak
    borderRadius: '110px 110px 0 0',  // Yarım daire
    left: '10px',             // Biraz daha sağa
    shape: 'semicircle' as const,
  },
  accent: {
    width: '130px',           // Biraz daha dar
    height: '210px',          // Orta-kısa boy
    borderRadius: '65px 65px 0 0',   // Yuvarlatılmış üst
    left: '320px',            // Pozisyon ayarı
    shape: 'rounded' as const,
  },
};

export default function SignInPage() {
  return <LoginPage colors={customColors} shapes={customShapes} />;
}
