'use client';

import { motion } from 'framer-motion';
import { Navbar, Footer } from '@/components/layout';
import { Shield, Lock, Eye, Database, UserCheck, Bell, Mail, Calendar, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const sections = [
    {
        icon: Database,
        title: 'Topladığımız Veriler',
        content: `Chalk olarak hizmetlerimizi sunmak ve geliştirmek amacıyla aşağıdaki kişisel verileri topluyoruz:

• **Kimlik Bilgileri:** Ad, soyad, e-posta adresi, telefon numarası
• **Kurumsal Bilgiler:** Okul/kurum adı, görev unvanı
• **Kullanım Verileri:** Platform kullanım istatistikleri, oturum verileri
• **Eğitim İçerikleri:** Yüklenen video ve ses dosyaları, oluşturulan eğitim materyalleri
• **Teknik Veriler:** IP adresi, tarayıcı türü, cihaz bilgileri, çerez verileri

Tüm veriler 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında işlenmektedir.`
    },
    {
        icon: Lock,
        title: 'Verilerin İşlenme Amacı',
        content: `Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:

• Eğitim platformu hizmetlerinin sunulması ve yönetimi
• Yapay zeka destekli içerik üretimi ve kişiselleştirme
• Kullanıcı hesaplarının oluşturulması ve yönetimi
• Müşteri destek hizmetlerinin sağlanması
• Platform güvenliğinin sağlanması ve kötüye kullanımın önlenmesi
• Yasal yükümlülüklerin yerine getirilmesi
• Hizmet kalitesinin iyileştirilmesi ve analiz çalışmaları
• Pazarlama ve iletişim faaliyetleri (açık rıza ile)`
    },
    {
        icon: Shield,
        title: 'Veri Güvenliği',
        content: `Verilerinizin güvenliği bizim için en önemli önceliktir. Aşağıdaki güvenlik önlemlerini uyguluyoruz:

• **SSL/TLS Şifreleme:** Tüm veri aktarımları 256-bit şifreleme ile korunur
• **Veri Merkezi Güvenliği:** ISO 27001 sertifikalı veri merkezlerinde barındırma
• **Erişim Kontrolü:** Çok faktörlü kimlik doğrulama ve rol tabanlı erişim
• **Düzenli Yedekleme:** Günlük otomatik yedekleme ve felaket kurtarma planları
• **Güvenlik Denetimleri:** Periyodik güvenlik testleri ve açık taramaları
• **Personel Eğitimi:** Veri güvenliği konusunda düzenli çalışan eğitimleri`
    },
    {
        icon: Eye,
        title: 'Veri Paylaşımı',
        content: `Kişisel verileriniz yalnızca aşağıdaki durumlarda üçüncü taraflarla paylaşılır:

• **Hizmet Sağlayıcılar:** Bulut altyapı hizmetleri, ödeme işlemcileri
• **Yapay Zeka Servisleri:** İçerik üretimi için kullanılan AI servisleri (veriler anonimleştirilerek)
• **Yasal Zorunluluklar:** Mahkeme kararı veya yasal düzenleme gereği
• **İş Ortakları:** Açık rızanız ile eğitim kurumları ve partner kuruluşlar

Verileriniz asla izinsiz olarak satılmaz veya pazarlama amaçlı üçüncü taraflara aktarılmaz.`
    },
    {
        icon: UserCheck,
        title: 'Haklarınız',
        content: `KVKK kapsamında aşağıdaki haklara sahipsiniz:

• Kişisel verilerinizin işlenip işlenmediğini öğrenme
• Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme
• Verilerin işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme
• Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme
• Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme
• Verilerin silinmesini veya yok edilmesini isteme
• İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize ortaya çıkan sonuca itiraz etme
• Verilerin kanuna aykırı işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme`
    },
    {
        icon: Bell,
        title: 'Çerez Politikası',
        content: `Platformumuzda kullanıcı deneyimini geliştirmek için çerezler kullanılmaktadır:

• **Zorunlu Çerezler:** Platform işlevselliği için gerekli teknik çerezler
• **Analitik Çerezler:** Kullanım istatistikleri ve performans ölçümü
• **İşlevsel Çerezler:** Tercihlerinizi hatırlama ve kişiselleştirme

Tarayıcı ayarlarınızdan çerez tercihlerinizi yönetebilirsiniz. Zorunlu olmayan çerezleri reddetme hakkınız bulunmaktadır.`
    },
    {
        icon: Calendar,
        title: 'Veri Saklama Süresi',
        content: `Kişisel verileriniz, işleme amaçlarının gerektirdiği süre boyunca saklanır:

• **Hesap Verileri:** Hesabınız aktif olduğu sürece + 2 yıl
• **Eğitim İçerikleri:** Kullanıcı tarafından silinene kadar
• **Log Kayıtları:** Güvenlik amaçlı 1 yıl
• **Mali Kayıtlar:** Yasal zorunluluk gereği 10 yıl
• **Pazarlama Verileri:** Rıza geri çekilene kadar

Süre sonunda verileriniz güvenli şekilde silinir veya anonimleştirilir.`
    }
];

export default function PrivacyPolicy() {
    return (
        <main className="min-h-screen">
            <Navbar />

            {/* Hero Section */}
            <section className="pt-32 pb-16 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40" />

                <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center max-w-3xl mx-auto"
                    >
                        <Badge variant="outline" className="mb-4 bg-slate-50 text-indigo-700 border-indigo-100">
                            <Shield className="w-3 h-3 mr-1" />
                            KVKK UYUMLU
                        </Badge>

                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-6">
                            Gizlilik <span className="text-indigo-600">Politikası</span>
                        </h1>

                        <p className="text-lg text-slate-600 leading-relaxed">
                            Chalk olarak kişisel verilerinizin güvenliği ve gizliliği bizim için en önemli önceliktir.
                            Bu politika, verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklamaktadır.
                        </p>

                        <div className="mt-6 flex items-center justify-center gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                <span>Son Güncelleme: 6 Şubat 2026</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Content Sections */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
                    <div className="space-y-8">
                        {sections.map((section, idx) => (
                            <motion.div
                                key={section.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.05, duration: 0.5 }}
                            >
                                <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                    <CardContent className="p-6 sm:p-8">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                                <section.icon className="w-6 h-6 text-indigo-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h2 className="text-xl font-semibold text-slate-900 mb-4">
                                                    {section.title}
                                                </h2>
                                                <div
                                                    className="text-slate-600 leading-relaxed prose prose-sm max-w-none
                                                    prose-strong:text-slate-800 prose-ul:list-none prose-ul:pl-0"
                                                    dangerouslySetInnerHTML={{
                                                        __html: section.content
                                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                            .replace(/\n/g, '<br/>')
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {/* Contact Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="mt-12"
                    >
                        <Card className="border-indigo-100 bg-indigo-50/50">
                            <CardContent className="p-6 sm:p-8">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <Mail className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900 mb-2">
                                            İletişim
                                        </h2>
                                        <p className="text-slate-600 mb-4">
                                            Gizlilik politikamız veya kişisel verileriniz hakkında sorularınız için bizimle iletişime geçebilirsiniz.
                                        </p>
                                        <div className="space-y-2 text-sm">
                                            <p className="text-slate-700">
                                                <strong>Veri Sorumlusu:</strong> Chalk Teknoloji A.Ş.
                                            </p>
                                            <p className="text-slate-700">
                                                <strong>E-posta:</strong> kvkk@chalk.com
                                            </p>
                                            <p className="text-slate-700">
                                                <strong>Adres:</strong> İstanbul, Türkiye
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
