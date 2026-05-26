'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Clock,
  Users,
  Video,
  Calendar,
  Download,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/dashboard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useVideoStore } from '@/stores/video-store';
import { Skeleton } from '@/components/ui/skeleton';
import { computeCoverage, findByCode } from '@/lib/curriculum/meb-catalog';
import { cn } from '@/lib/utils';

// Mock analytics data
const mockChartData = {
  views: [
    { day: 'Pzt', value: 45 },
    { day: 'Sal', value: 62 },
    { day: 'Çar', value: 38 },
    { day: 'Per', value: 81 },
    { day: 'Cum', value: 94 },
    { day: 'Cmt', value: 67 },
    { day: 'Paz', value: 52 },
  ],
  engagement: [
    { day: 'Pzt', value: 65 },
    { day: 'Sal', value: 72 },
    { day: 'Çar', value: 58 },
    { day: 'Per', value: 85 },
    { day: 'Cum', value: 91 },
    { day: 'Cmt', value: 68 },
    { day: 'Paz', value: 59 },
  ],
};

const topVideos = [
  { id: '1', title: 'Birinci Dereceden Denklemler', views: 245, engagement: 87, trend: 'up' },
  { id: '2', title: 'Oran ve Orantı', views: 312, engagement: 82, trend: 'up' },
  { id: '3', title: 'Üçgenler ve Özellikleri', views: 189, engagement: 76, trend: 'down' },
  { id: '4', title: 'Kareköklü Sayılar', views: 156, engagement: 71, trend: 'up' },
];

export default function TeacherAnalyticsPage() {
  const { stats, videos, fetchVideos } = useVideoStore();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [chartData, setChartData] = useState(mockChartData.views);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  useEffect(() => {
    // Simulate different data based on time range
    setChartData(timeRange === 'week' ? mockChartData.views : mockChartData.engagement);
  }, [timeRange]);

  // Compute MEB coverage from the teacher's published/processing videos
  const coverageReports = useMemo(() => {
    const input = videos
      .filter((v) => v.status === 'published' || v.status === 'slides_ready' || v.status === 'processing')
      .map((v) => ({
        subject: v.subject,
        grade: v.grade,
        codes: v.curriculumCodes || [],
      }));
    return computeCoverage(input);
  }, [videos]);

  const videosByCode = useMemo(() => {
    const map = new Map<string, Array<{ id: string; title: string }>>();
    for (const v of videos) {
      for (const code of v.curriculumCodes || []) {
        if (!map.has(code)) map.set(code, []);
        map.get(code)!.push({ id: v.id, title: v.title });
      }
    }
    return map;
  }, [videos]);

  const maxValue = Math.max(...chartData.map(d => d.value));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">İstatistikler</h1>
          <p className="text-muted-foreground mt-1">
            Video performansınızı ve öğrenci etkileşimlerini takip edin
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Rapor İndir
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Paylaş
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
        <TabsList>
          <TabsTrigger value="week">Haftalık</TabsTrigger>
          <TabsTrigger value="month">Aylık</TabsTrigger>
          <TabsTrigger value="year">Yıllık</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Toplam İzlenme"
          value={stats.totalViews.toLocaleString()}
          icon={Eye}
          trend={{ value: 12, isPositive: true }}
          color="primary"
        />
        <StatsCard
          title="Ortalama İzlenme Süresi"
          value="8:24"
          icon={Clock}
          trend={{ value: 5, isPositive: true }}
          color="accent"
        />
        <StatsCard
          title="Aktif Öğrenci"
          value={stats.studentCount}
          icon={Users}
          color="emerald"
        />
        <StatsCard
          title="Tamamlanma Oranı"
          value="78%"
          icon={Video}
          trend={{ value: 3, isPositive: false }}
          color="amber"
        />
      </div>

      {/* MEB Müfredat Kapsamı */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-xl border border-border bg-card"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              🎯 MEB Müfredat Kapsamı
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Oluşturduğun videoların kapsadığı MEB kazanımları.
              <span className="ml-1 italic">(Pilot: Matematik 8, Fizik 9, Kimya 10)</span>
            </p>
          </div>
        </div>

        {coverageReports.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <p>Henüz kazanım etiketli video yok.</p>
            <p className="text-xs mt-1">Video oluştururken veya editörden kazanım seçebilirsin.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {coverageReports.map((r) => {
              const key = `${r.subject}|${r.grade}`;
              const isExpanded = expandedReport === key;
              const colorCls =
                r.coveragePercent >= 60 ? 'bg-emerald-500'
                : r.coveragePercent >= 30 ? 'bg-amber-500'
                : 'bg-rose-500';

              return (
                <div key={key} className="border border-border rounded-lg p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedReport(isExpanded ? null : key)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {r.subject} — {r.grade}. Sınıf
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {r.coveredKazanim} / {r.totalKazanim} kazanım
                        </Badge>
                      </div>
                      <span className={cn(
                        'text-sm font-mono font-bold',
                        r.coveragePercent >= 60 ? 'text-emerald-600' : r.coveragePercent >= 30 ? 'text-amber-600' : 'text-rose-600'
                      )}>
                        %{r.coveragePercent}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={cn('h-2 rounded-full transition-all', colorCls)}
                        style={{ width: `${r.coveragePercent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {isExpanded ? '↑ Detayı gizle' : '↓ Kapsanmayan kazanımları göster'}
                    </p>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      {r.uncoveredCodes.length === 0 ? (
                        <p className="text-xs text-emerald-600">Tüm kazanımları işlemişsin! 🎉</p>
                      ) : (
                        <>
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Kapsanmayan kazanımlar:
                          </p>
                          <div className="space-y-1 max-h-60 overflow-y-auto">
                            {r.uncoveredCodes.slice(0, 30).map((code) => {
                              const k = findByCode(code);
                              return (
                                <div key={code} className="flex items-start gap-2 text-xs">
                                  <span className="font-mono text-rose-500 shrink-0">{code}</span>
                                  <span className="text-foreground/70">{k?.title || ''}</span>
                                </div>
                              );
                            })}
                            {r.uncoveredCodes.length > 30 && (
                              <p className="text-[11px] text-muted-foreground italic">
                                ... ve {r.uncoveredCodes.length - 30} kazanım daha
                              </p>
                            )}
                          </div>
                        </>
                      )}

                      {/* Covered codes with links */}
                      {videosByCode.size > 0 && (
                        <div className="pt-2 mt-2 border-t border-border">
                          <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
                            İşlediğin kazanımlar:
                          </p>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {Array.from(videosByCode.entries())
                              .filter(([code]) => {
                                const k = findByCode(code);
                                return k && k.subject === r.subject && k.grade === r.grade;
                              })
                              .map(([code, vids]) => {
                                const k = findByCode(code);
                                return (
                                  <div key={code} className="text-xs">
                                    <span className="font-mono text-emerald-600">{code}</span>
                                    <span className="text-foreground/70 ml-2">{k?.title?.slice(0, 60)}</span>
                                    <div className="ml-4 text-[11px] text-muted-foreground">
                                      {vids.map((v) => (
                                        <span key={v.id} className="inline-block mr-2">→ {v.title}</span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Views Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl border border-border bg-card"
        >
          <h3 className="font-semibold mb-4">İzlenme Trendi</h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {chartData.map((item, index) => (
              <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative w-full h-full flex items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(item.value / maxValue) * 100}%` }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-lg min-h-[20px]"
                  />
                </div>
                <span className="text-xs text-muted-foreground">{item.day}</span>
                <span className="text-xs font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Engagement Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-xl border border-border bg-card"
        >
          <h3 className="font-semibold mb-4">Etkileşim Oranı</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Video Tamamlama</span>
                <span className="font-medium">78%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '78%' }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Beğeni Oranı</span>
                <span className="font-medium">92%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '92%' }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="h-full bg-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Paylaşım</span>
                <span className="font-medium">34%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '34%' }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="h-full bg-accent"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Yorum/Etkileşim</span>
                <span className="font-medium">56%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '56%' }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className="h-full bg-amber-500"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Videos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 rounded-xl border border-border bg-card"
      >
        <h3 className="font-semibold mb-4">En Popüler Videolar</h3>
        <div className="space-y-4">
          {topVideos.map((video, index) => (
            <div
              key={video.id}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="text-2xl font-bold text-muted-foreground">
                  #{index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{video.title}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {video.views} görüntülenme
                    </span>
                    <span>{video.engagement}% etkileşim</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {video.trend === 'up' ? (
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-destructive" />
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Insights */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-xl border border-primary/30 bg-primary/5"
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Pozitif Trend
          </h3>
          <p className="text-sm text-muted-foreground">
            Bu hafta video izlenmeleriniz %12 arttı. Özellikle &quot;Oran ve Orantı&quot; 
            videosu en çok ilgi gören içerik oldu.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-xl border border-amber-500/30 bg-amber-500/5"
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Öneri
          </h3>
          <p className="text-sm text-muted-foreground">
            Ortalama izlenme süresini artırmak için videolarınızı 10-15 dakika 
            aralığında tutmanız önerilir.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
