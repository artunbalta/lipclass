'use client';

import { Navbar, Footer } from '@/components/layout';
import { Hero, HowItWorks, Schools, Testimonials, FAQ } from '@/components/landing';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { ScrollSVGBackground } from '@/components/ui/scroll-svg-background';

export default function Home() {
  return (
    <AuroraBackground className="min-h-screen h-auto">
      <ScrollSVGBackground />
      <Navbar />
      <Hero />
      <HowItWorks />
      <Schools />
      <Testimonials />
      <FAQ />
      <Footer />
    </AuroraBackground>
  );
}
