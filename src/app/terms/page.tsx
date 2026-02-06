'use client';

import { motion } from 'framer-motion';
import { Navbar, Footer } from '@/components/layout';
import { FileText, Scale, AlertTriangle, CreditCard, Ban, RefreshCw, Gavel, Globe, Mail, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const sections = [
    {
        icon: FileText,
        title: 'Hizmet Tanımı',
        content: `Chalk, yapay zeka teknolojisi kullanarak eğitim içerikleri oluşturmaya yardımcı olan bir dijital platformdur. Hizmetlerimiz şunları içerir:

• **Video İçerik Üretimi:** Yapay zeka destekli eğitim videoları oluşturma
• **İçerik Kişiselleştirme:** Farklı öğrenci seviyelerine uygun materyal hazırlama
• **Müfredat Uyumu:** MEB müfredatına uygun içerik üretimi
• **Platform Erişimi:** Web tabanlı uygulama ve ilgili araçlara erişim

Bu koşullar, platformumuzu kullandığınızda sizinle aramızdaki yasal ilişkiyi düzenlemektedir.`
    },
    {
        icon: CheckCircle,
        title: 'Kullanıcı Yükümlülükleri',
        content: `Platformumuzu kullanırken aşağıdaki yükümlülüklere uymayı kabul etmektesiniz:

• **Doğru Bilgi:** Kayıt sırasında doğru ve güncel bilgiler sağlamak
• **Hesap Güvenliği:** Hesap bilgilerinizi gizli tutmak ve yetkisiz erişimi önlemek
• **Yasal Kullanım:** Platformu yalnızca yasal amaçlarla kullanmak
• **Fikri Mülkiyet:** Telif haklarına ve fikri mülkiyet haklarına saygı göstermek
• **İçerik Sorumluluğu:** Yüklediğiniz içeriklerin yasal ve uygun olmasını sağlamak
• **Etik Kullanım:** Platformu kötü niyetli veya zararlı amaçlarla kullanmamak`
    },
    {
        icon: XCircle,
        title: 'Yasaklanan Faaliyetler',
        content: `Aşağıdaki faaliyetler kesinlikle yasaktır ve hesabınızın askıya alınmasına veya sonlandırılmasına neden olabilir:

• Yasadışı, müstehcen, nefret söylemi içeren veya zararlı içerik yüklemek
• Başkalarının fikri mülkiyet haklarını ihlal eden materyaller kullanmak
• Platformun güvenliğini tehlikeye atacak eylemler gerçekleştirmek
• Otomatik botlar veya scriptler kullanarak sistemi manipüle etmek
• Diğer kullanıcıların hesaplarına yetkisiz erişim sağlamaya çalışmak
• Platformu spam, phishing veya dolandırıcılık amaçlı kullanmak
• Hizmetleri tersine mühendislik yapmak veya kaynak koduna erişmeye çalışmak
• Platformun normal işleyişini engelleyecek kötü amaçlı yazılım yaymak`
    },
    {
        icon: Scale,
        title: 'Fikri Mülkiyet Hakları',
        content: `**Chalk'a Ait Haklar:**
• Platform yazılımı, tasarımı, logoları ve tüm ilgili fikri mülkiyet Chalk'a aittir
• Platformumuz Türkiye Cumhuriyeti yasaları kapsamında telif hakkı ile korunmaktadır
• Yazılı izin olmadan platformun herhangi bir bölümü kopyalanamaz veya çoğaltılamaz

**Kullanıcıya Ait Haklar:**
• Yüklediğiniz orijinal içeriklerin fikri mülkiyet hakları size aittir
• Platformu kullanarak oluşturduğunuz eğitim materyallerinin hakları size aittir
• Chalk'a yalnızca hizmet sunumu için gerekli sınırlı lisans vermiş olursunuz`
    },
    {
        icon: CreditCard,
        title: 'Ödeme ve Abonelik',
        content: `**Ücretlendirme:**
• Hizmet ücretleri, seçilen abonelik planına göre belirlenir
• Tüm fiyatlar KDV dahil olarak gösterilir
• Fiyat değişiklikleri en az 30 gün önceden bildirilir

**Ödeme Koşulları:**
• Ödemeler aylık veya yıllık olarak tahsil edilir
• Kredi kartı, banka kartı veya havale ile ödeme kabul edilir
• Başarısız ödemelerde 7 gün içinde ödeme yapılmazsa hizmet askıya alınabilir

**İade Politikası:**
• İlk 14 gün içinde cayma hakkınız bulunmaktadır
• Yıllık planlar için kullanılmayan dönem oranında iade yapılır
• Belirli kampanya ve promosyonlar iade kapsamı dışında olabilir`
    },
    {
        icon: AlertTriangle,
        title: 'Sorumluluk Sınırlaması',
        content: `**Hizmet Garantisi:**
• Chalk hizmetleri "olduğu gibi" sunulmaktadır
• Platformun kesintisiz veya hatasız çalışacağına dair garanti verilmemektedir
• Sistemimiz düzenli bakım ve güncellemeler için geçici olarak kullanılamayabilir

**Zarar Sorumluluğu:**
• Chalk, platform kullanımından kaynaklanan dolaylı zararlardan sorumlu değildir
• Üçüncü taraf hizmetlerinden kaynaklanan sorunlar Chalk sorumluluğunda değildir
• Kullanıcı kaynaklı veri kaybından Chalk sorumlu tutulamaz

**Maksimum Sorumluluk:**
• Her durumda Chalk'ın sorumluluğu, son 12 ayda ödenen toplam ücretle sınırlıdır`
    },
    {
        icon: Ban,
        title: 'Hesap Sonlandırma',
        content: `**Kullanıcı Tarafından:**
• Hesabınızı istediğiniz zaman kapatabilirsiniz
• Kapatma talebi 30 gün içinde işleme alınır
• Verileriniz KVKK kapsamında belirlenen sürelerde saklanır

**Chalk Tarafından:**
• Kullanım koşullarının ihlali durumunda hesap askıya alınabilir veya sonlandırılabilir
• Yasadışı faaliyet tespit edildiğinde derhal sonlandırma hakkı saklıdır
• Hesap sonlandırma öncesinde mümkün olduğunca bilgilendirme yapılır

**Sonlandırma Sonrası:**
• Aktif abonelikler sonlandırma tarihine kadar devam eder
• İçeriklerinizi 30 gün içinde indirmeniz önerilir
• Yasal saklama yükümlülüklerimiz devam eder`
    },
    {
        icon: RefreshCw,
        title: 'Değişiklikler',
        content: `Chalk, bu kullanım koşullarını dilediği zaman güncelleme hakkını saklı tutar.

**Değişiklik Bildirimi:**
• Önemli değişiklikler en az 30 gün önceden e-posta ile bildirilir
• Küçük düzenlemeler platform üzerinden duyurulur
• Güncel koşullar her zaman bu sayfada yayınlanır

**Kabul:**
• Değişiklik sonrası platformu kullanmaya devam etmeniz, yeni koşulları kabul ettiğiniz anlamına gelir
• Değişiklikleri kabul etmemeniz durumunda hesabınızı kapatabilirsiniz`
    },
    {
        icon: Gavel,
        title: 'Uyuşmazlık Çözümü',
        content: `**Uygulanacak Hukuk:**
Bu kullanım koşulları, Türkiye Cumhuriyeti yasalarına tabidir.

**Yetkili Mahkeme:**
Uyuşmazlıklarda İstanbul (Merkez) Mahkemeleri ve İcra Daireleri yetkilidir.

**Alternatif Çözüm:**
• Uyuşmazlıklarda öncelikle dostane çözüm aranır
• Taraflar, dava öncesinde arabuluculuk sürecine başvurabilir
• Tüketici hakem heyetlerine başvuru hakkınız saklıdır

**Şikayet ve Başvuru:**
Şikayet ve önerileriniz için destek@chalk.com adresine yazabilirsiniz.`
    },
    {
        icon: Globe,
        title: 'Genel Hükümler',
        content: `**Bölünebilirlik:**
Bu koşulların herhangi bir hükmünün geçersiz sayılması, diğer hükümlerin geçerliliğini etkilemez.

**Feragat:**
Chalk'ın herhangi bir hak veya hükümden feragat etmemesi, gelecekte feragat edeceği anlamına gelmez.

**Tam Anlaşma:**
Bu kullanım koşulları ve gizlilik politikamız, taraflar arasındaki tam anlaşmayı oluşturur.

**Devir:**
Chalk, bu sözleşme kapsamındaki hak ve yükümlülüklerini grup şirketlerine devredebilir.

**Mücbir Sebepler:**
Doğal afetler, savaş, salgın hastalık gibi kontrol dışı olaylardan Chalk sorumlu tutulamaz.`
    }
];

export default function TermsOfUse() {
    return (
        <main className="min-h-screen">
            <Navbar />

            {/* Hero Section */}
            <section className="pt-32 pb-16 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-50/50 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40" />

                <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center max-w-3xl mx-auto"
                    >
                        <Badge variant="outline" className="mb-4 bg-slate-50 text-purple-700 border-purple-100">
                            <Scale className="w-3 h-3 mr-1" />
                            YASAL KOŞULLAR
                        </Badge>

                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-6">
                            Kullanım <span className="text-purple-600">Koşulları</span>
                        </h1>

                        <p className="text-lg text-slate-600 leading-relaxed">
                            Chalk platformunu kullanmadan önce lütfen aşağıdaki kullanım koşullarını dikkatlice okuyunuz.
                            Platformu kullanarak bu koşulları kabul etmiş sayılırsınız.
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
                                            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                                                <section.icon className="w-6 h-6 text-purple-600" />
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
                        <Card className="border-purple-100 bg-purple-50/50">
                            <CardContent className="p-6 sm:p-8">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                                        <Mail className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900 mb-2">
                                            Sorularınız mı Var?
                                        </h2>
                                        <p className="text-slate-600 mb-4">
                                            Kullanım koşullarımız hakkında sorularınız veya geri bildirimleriniz için bizimle iletişime geçebilirsiniz.
                                        </p>
                                        <div className="space-y-2 text-sm">
                                            <p className="text-slate-700">
                                                <strong>Şirket:</strong> Chalk Teknoloji A.Ş.
                                            </p>
                                            <p className="text-slate-700">
                                                <strong>E-posta:</strong> destek@chalk.com
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
