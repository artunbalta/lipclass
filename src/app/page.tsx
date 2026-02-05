'use client';

import { Navbar, Footer } from '@/components/layout';
import { Hero, HowItWorks, Schools, Testimonials, FAQ, Comparison, DemoShowcase, CTA, AboutUs } from '@/components/landing';

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
      <AboutUs />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
