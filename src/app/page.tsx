'use client';

import { Navbar, Footer } from '@/components/layout';
import { Hero, HowItWorks } from '@/components/landing';
import { AuroraBackground } from '@/components/ui/aurora-background';

export default function Home() {
  return (
    <AuroraBackground className="min-h-screen h-auto">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Footer />
    </AuroraBackground>
  );
}
