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

export default function SignInPage() {
  return <LoginPage colors={customColors} />;
}
