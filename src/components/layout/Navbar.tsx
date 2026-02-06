import { PillNav } from '@/components/ui/PillNav/PillNav';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Nasıl Çalışır', href: '/#how-it-works' },
  { label: 'Özellikler', href: '/#features' },
  { label: 'SSS', href: '/#faq' },
];

export function Navbar() {
  const AuthButtons = (
    <>
      <Link href="/signin">
        <Button variant="ghost" className="font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50">
          Giriş Yap
        </Button>
      </Link>
      <Link href="/signup">
        <Button className="font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 rounded-full px-6 transition-all duration-300 hover:scale-105">
          Ücretsiz Dene
          <ArrowRight className="w-4 h-4 ml-2 opacity-80" />
        </Button>
      </Link>
    </>
  );

  const MobileAuthButtons = (
    <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100">
      <Link href="/signin" className="w-full">
        <Button variant="ghost" className="w-full justify-center text-slate-700 hover:text-indigo-600 hover:bg-slate-50 h-11 font-medium bg-slate-50 border border-slate-100">
          Giriş Yap
        </Button>
      </Link>
      <Link href="/signup" className="w-full">
        <Button className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white h-11 shadow-md shadow-indigo-200 font-medium">
          Hemen Başla
        </Button>
      </Link>
    </div>
  );

  return (
    <div className="relative w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <PillNav
          items={navItems}
          logo={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(12, 12) rotate(-45)">
                {/* Main chalk body */}
                <line x1="-8" y1="-2" x2="8" y2="-2" stroke="white" strokeWidth="1.5" />
                <line x1="-8" y1="2" x2="8" y2="2" stroke="white" strokeWidth="1.5" />
                {/* Left elliptical end */}
                <ellipse cx="-8" cy="0" rx="1.5" ry="2" fill="none" stroke="white" strokeWidth="1.5" />
                {/* Right elliptical end */}
                <ellipse cx="8" cy="0" rx="1.5" ry="2" fill="none" stroke="white" strokeWidth="1.5" />
              </g>
            </svg>
          }
          logoAlt="Chalk Logo"
          logoHref="/"
          baseColor="#313a4dff" // gray-900
          pillColor="#ffffff"
          pillTextColor="#313a4dff"
          hoveredPillTextColor="#ffffff"
          rightElement={AuthButtons}
          mobileExtras={MobileAuthButtons}
        />
      </div>
    </div>
  );
}

