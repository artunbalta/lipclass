'use client';

import { Navbar, Footer } from '@/components/layout';
import { Hero, HowItWorks, Features, Testimonials, Pricing } from '@/components/landing';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Testimonials />
      <Pricing />
      <Footer />
    </main>
  );
}
