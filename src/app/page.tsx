'use client';

import { Navbar, Footer } from '@/components/layout';
import { Hero, HowItWorks, Schools, Testimonials, FAQ, Comparison, DemoShowcase, CTA } from '@/components/landing';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <Schools />
      <HowItWorks />
      <Comparison />
      <DemoShowcase />
      <Testimonials />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
