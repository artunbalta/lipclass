'use client';

import { motion } from 'framer-motion';
import { Check, Sparkles, ArrowRight, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MOCK_PRICING_PLANS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function Pricing() {
  return (
    <section id="pricing" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-muted/30" />
      
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-accent/10 rounded-full blur-[120px]" />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Fiyatlandırma
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Her Bütçeye Uygun <span className="text-primary">Planlar</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Ücretsiz başlayın, büyüdükçe yükseltin. Tüm planlar 14 gün ücretsiz deneme içerir.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-6 max-w-6xl mx-auto">
          {MOCK_PRICING_PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={cn(
                'relative group',
                plan.highlighted && 'lg:-mt-4 lg:mb-4'
              )}
            >
              {/* Highlighted Badge */}
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-primary to-accent text-white border-0 px-4 py-1">
                    <Sparkles className="w-3 h-3 mr-1" />
                    En Popüler
                  </Badge>
                </div>
              )}

              <div className={cn(
                'relative h-full p-6 lg:p-8 rounded-2xl bg-card border transition-all duration-300',
                plan.highlighted
                  ? 'border-primary shadow-xl shadow-primary/10'
                  : 'border-border hover:border-primary/30 hover:shadow-lg'
              )}>
                {/* Plan Header */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl lg:text-5xl font-bold">
                      {plan.price === 0 ? 'Ücretsiz' : plan.currency + plan.price}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground">/{plan.period}</span>
                    )}
                  </div>
                  {plan.price > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Yıllık ödemede %20 indirim
                    </p>
                  )}
                </div>

                {/* CTA Button */}
                <Link href="/signup" className="block mb-6">
                  <Button 
                    className={cn(
                      'w-full font-medium',
                      plan.highlighted
                        ? 'bg-gradient-to-r from-primary to-primary/80 hover:opacity-90'
                        : ''
                    )}
                    variant={plan.highlighted ? 'default' : 'outline'}
                    size="lg"
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <div className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                        plan.highlighted
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="text-sm text-foreground/80">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Gradient Overlay for Highlighted */}
                {plan.highlighted && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 pointer-events-none" />
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ Teaser */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl bg-muted/50 border border-border">
            <HelpCircle className="w-8 h-8 text-primary" />
            <div className="text-center sm:text-left">
              <p className="font-medium">Sorularınız mı var?</p>
              <p className="text-sm text-muted-foreground">
                Fiyatlandırma ve özellikler hakkında detaylı bilgi için bize ulaşın.
              </p>
            </div>
            <Button variant="outline" className="shrink-0">
              SSS&apos;ya Git
            </Button>
          </div>
        </motion.div>

        {/* Money Back Guarantee */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-muted-foreground">
            🛡️ 30 gün koşulsuz para iade garantisi. Risk yok, denemeniz ücretsiz.
          </p>
        </motion.div>

        {/* Enterprise CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 p-8 lg:p-12 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,white_0%,transparent_50%)]" />
          </div>

          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <Badge className="bg-white/10 text-white border-0 mb-4">
                Kurumsal Çözüm
              </Badge>
              <h3 className="text-2xl lg:text-3xl font-bold mb-2">
                Okulunuz için özel teklif alın
              </h3>
              <p className="text-white/70 max-w-xl">
                50+ öğretmeni olan okullar için özel fiyatlandırma, 
                dedicated destek ve özelleştirilmiş çözümler sunuyoruz.
              </p>
            </div>
            <Button 
              size="lg" 
              variant="secondary"
              className="shrink-0 bg-white text-slate-900 hover:bg-white/90"
            >
              Teklif Al
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
