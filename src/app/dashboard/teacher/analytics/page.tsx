'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Clock,
  Users,
  Video,
  Download,
  Share2,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatsCard } from '@/components/dashboard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useVideoStore } from '@/stores/video-store';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { computeCoverage, findByCode } from '@/lib/curriculum/meb-catalog';

// ── Real analytics response shape (mirrors /api/teacher/analytics) ─────────
interface AnalyticsResponse {
  range: 'week' | 'month' | 'year';
  totals: {
    totalViews: number;
    totalVideos: number;
    studentCount: number;
    completionRate: number;
    avgWatchSeconds: number;
    likeRate: number;
    quizAvgScore: number | null;
    quizAttempts: number;
  };
  trend: {
    views: Array<{ label: string; value: number }>;
    completion: Array<{ label: string; value: number }>;
  };
  topVideos: Array<{
    id: string;
    title: string;
    views: number;
    completionRate: number;
    likeCount: number;
    trend: 'up' | 'down' | 'flat';
  }>;
}

function formatDurationMMSS(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface ClassroomWithStudents {
  id: string;
  name: string;
  join_code: string;
  students: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    watchedVideos: number;
    quizAttempts: number;
    quizScore: number | null;
  }>;
}

export default function TeacherAnalyticsPage() {
  const { videos, fetchVideos } = useVideoStore();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'students'>('overview');
  const [classrooms, setClassrooms] = useState<ClassroomWithStudents[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Fetch real aggregated analytics whenever the range changes. The setState
  // calls before fetch are intentional — they reset the UI to a loading state
  // before subscribing to the external HTTP "system".
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    /* eslint-disable react-hooks/set-state-in-effect */
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    fetch(`/api/teacher/analytics?range=${timeRange}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || `Sunucu hatası (${r.status})`);
        }
        return r.json() as Promise<AnalyticsResponse>;
      })
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch((e) => {
        if (cancelled || e.name === 'AbortError') return;
        setAnalyticsError(e instanceof Error ? e.message : 'Veri alınamadı');
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false);
      });
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [timeRange]);

  const loadStudents = useCallback(async () => {
    if (classrooms.length > 0) return;
    setStudentsLoading(true);
    const res = await fetch('/api/classrooms');
    if (!res.ok) { setStudentsLoading(false); return; }
    const { classrooms: cls } = (await res.json()) as {
      classrooms: Array<{ id: string; name: string; join_code: string }>;
    };
    const withStudents = await Promise.all(
      (cls ?? []).map(async (c) => {
        const sRes = await fetch(`/api/classrooms/${c.id}/students`);
        const sData = sRes.ok
          ? ((await sRes.json()) as { students?: ClassroomWithStudents['students'] })
          : { students: [] };
        return { id: c.id, name: c.name, join_code: c.join_code, students: sData.students ?? [] };
      })
    );
    setClassrooms(withStudents);
    setStudentsLoading(false);
  }, [classrooms.length]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeTab === 'students') loadStudents();
  }, [activeTab, loadStudents]);

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

  // Derive chart series + scaffolding from the real response.
  const chartData = analytics?.trend.views ?? [];
  const completionSeries = analytics?.trend.completion ?? [];
  const maxValue = Math.max(1, ...chartData.map((d) => d.value));
  const topVideos = analytics?.topVideos ?? [];
  const totals = analytics?.totals;

  // Compare current vs previous bucket halves to give an honest "trend".
  // Skip when there are too few buckets to be meaningful.
  function halfTrend(series: Array<{ value: number }>): { delta: number; isPositive: boolean } | null {
    if (!series || series.length < 4) return null;
    const half = Math.floor(series.length / 2);
    const prev = series.slice(0, half).reduce((s, x) => s + x.value, 0);
    const curr = series.slice(half).reduce((s, x) => s + x.value, 0);
    if (prev === 0 && curr === 0) return null;
    if (prev === 0) return { delta: 100, isPositive: curr > 0 };
    const pct = Math.round(((curr - prev) / prev) * 100);
    return { delta: Math.abs(pct), isPositive: pct >= 0 };
  }

  const viewsTrend = halfTrend(chartData);
  const completionTrend = halfTrend(completionSeries);

  // Honest insight: pick the top-1 video and call out its trend; fall back to
  // a "create more content" nudge when we don't have data.
  const insightTop = topVideos[0];
  const insightAvgWatch = totals?.avgWatchSeconds ?? 0;

  // ── CSV export + share ───────────────────────────────────────────────────
  const [shareCopied, setShareCopied] = useState(false);

  const handleDownloadReport = useCallback(() => {
    if (!analytics) {
      showToast.error('Henüz veri yok', 'Analiz yüklendikten sonra deneyin.');
      return;
    }
    // CSV is wider than PDF for spreadsheet teachers — keep it simple, no PDF lib.
    const rangeLabel =
      timeRange === 'week' ? 'Haftalik' : timeRange === 'month' ? 'Aylik' : 'Yillik';
    const today = new Date().toISOString().slice(0, 10);

    const escape = (val: string | number | null | undefined): string => {
      const s = val === null || val === undefined ? '' : String(val);
      // RFC 4180 — wrap in quotes if contains comma/newline/quote, escape quotes
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines: string[] = [];
    lines.push(`# Chalk Analytics Report — ${rangeLabel} — ${today}`);
    lines.push('');
    lines.push('## Ozet');
    lines.push('Metrik,Deger');
    lines.push(`Toplam İzlenme,${analytics.totals.totalViews}`);
    lines.push(`Toplam Video,${analytics.totals.totalVideos}`);
    lines.push(`Öğrenci Sayısı,${analytics.totals.studentCount}`);
    lines.push(`Tamamlama Oranı,%${analytics.totals.completionRate}`);
    lines.push(`Ortalama İzlenme (sn),${analytics.totals.avgWatchSeconds}`);
    lines.push(`Beğeni Oranı,%${analytics.totals.likeRate}`);
    if (analytics.totals.quizAvgScore !== null) {
      lines.push(`Quiz Ortalaması,%${analytics.totals.quizAvgScore}`);
    }
    lines.push(`Quiz Denemeleri,${analytics.totals.quizAttempts}`);
    lines.push('');
    lines.push('## İzlenme Trendi');
    lines.push('Periyot,İzlenme,Tamamlama %');
    for (let i = 0; i < analytics.trend.views.length; i++) {
      const v = analytics.trend.views[i];
      const c = analytics.trend.completion[i];
      lines.push(`${escape(v.label)},${v.value},${c?.value ?? ''}`);
    }
    lines.push('');
    lines.push('## En İyi Videolar');
    lines.push('Başlık,İzlenme,Tamamlama %,Beğeni,Trend');
    for (const tv of analytics.topVideos) {
      lines.push(
        [
          escape(tv.title),
          tv.views,
          tv.completionRate,
          tv.likeCount,
          tv.trend,
        ].join(','),
      );
    }

    // UTF-8 BOM so Excel opens Turkish characters correctly.
    const csv = '﻿' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chalk-analytics-${rangeLabel.toLowerCase()}-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast.success('Rapor indirildi', `${a.download}`);
  }, [analytics, timeRange]);

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = analytics?.totals
      ? `Chalk: ${analytics.totals.totalViews} izlenme, ${analytics.totals.studentCount} öğrenci · ${timeRange}`
      : 'Chalk analitik özetim';
    try {
      const navWithShare = navigator as Navigator & {
        share?: (data: ShareData) => Promise<void>;
      };
      if (navWithShare.share) {
        await navWithShare.share({ title: 'Chalk Analytics', text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      showToast.success('Link kopyalandı', 'Bu sayfanın URL\'si panoda.');
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      // User cancelled share sheet — silent.
    }
  }, [analytics, timeRange]);

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
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadReport}
            disabled={!analytics}
          >
            <Download className="w-4 h-4 mr-2" />
            Rapor İndir
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            {shareCopied ? (
              <Check className="w-4 h-4 mr-2 text-emerald-500" />
            ) : (
              <Share2 className="w-4 h-4 mr-2" />
            )}
            {shareCopied ? 'Kopyalandı' : 'Paylaş'}
          </Button>
        </div>
      </div>

      {/* Main tab selector */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'students')}>
        <TabsList>
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="students">Öğrenci Detayı</TabsTrigger>
        </TabsList>

        {/* ── STUDENTS TAB ──────────────────────────── */}
        <TabsContent value="students" className="mt-6 space-y-4">
          {studentsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : classrooms.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Henüz sınıf yok</p>
              <p className="text-sm mt-1">
                Sınıflarım sayfasından sınıf oluşturup öğrenci ekleyebilirsiniz.
              </p>
            </div>
          ) : (
            classrooms.map((cls) => {
              const isExp = expandedClass === cls.id;
              const avgScore = cls.students.length > 0
                ? Math.round(cls.students.filter(s => s.quizScore !== null).reduce((a, s) => a + (s.quizScore ?? 0), 0) / Math.max(1, cls.students.filter(s => s.quizScore !== null).length))
                : null;
              return (
                <div key={cls.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedClass(isExp ? null : cls.id)}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cls.students.length} öğrenci
                        {avgScore !== null && ` · Ort. %${avgScore} quiz`}
                      </p>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs shrink-0">{cls.join_code}</Badge>
                    {isExp
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>

                  {isExp && (
                    <div className="border-t border-border p-4">
                      {cls.students.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Bu sınıfta henüz öğrenci yok.</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground px-2 mb-1">
                            <span className="col-span-2">Öğrenci</span>
                            <span className="text-center">Video</span>
                            <span className="text-center">Quiz</span>
                          </div>
                          {cls.students.map(s => (
                            <div key={s.id} className="grid grid-cols-4 items-center p-2 rounded-lg bg-muted/40 gap-2">
                              <div className="col-span-2 flex items-center gap-2 min-w-0">
                                <Avatar className="w-7 h-7 shrink-0">
                                  <AvatarImage src={s.avatar} />
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {s.name?.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{s.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                                </div>
                              </div>
                              <p className="text-center text-sm">{s.watchedVideos}</p>
                              <p className={cn(
                                'text-center text-sm font-medium',
                                s.quizScore === null ? 'text-muted-foreground'
                                : s.quizScore >= 70 ? 'text-emerald-600'
                                : s.quizScore >= 40 ? 'text-amber-600'
                                : 'text-destructive'
                              )}>
                                {s.quizScore !== null ? `%${s.quizScore}` : '—'}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>

        {/* ── OVERVIEW TAB ──────────────────────────── */}
        <TabsContent value="overview" className="mt-0">

      {/* Time Range Selector */}
      <div className="mt-6">
      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
        <TabsList>
          <TabsTrigger value="week">Haftalık</TabsTrigger>
          <TabsTrigger value="month">Aylık</TabsTrigger>
          <TabsTrigger value="year">Yıllık</TabsTrigger>
        </TabsList>
      </Tabs>
      </div>

      {/* Stats Overview */}
      {analyticsLoading && !analytics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : analyticsError ? (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          İstatistikler yüklenemedi: {analyticsError}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Toplam İzlenme"
            value={(totals?.totalViews ?? 0).toLocaleString()}
            icon={Eye}
            trend={viewsTrend ? { value: viewsTrend.delta, isPositive: viewsTrend.isPositive } : undefined}
            color="primary"
          />
          <StatsCard
            title="Ortalama İzlenme Süresi"
            value={formatDurationMMSS(totals?.avgWatchSeconds ?? 0)}
            icon={Clock}
            color="accent"
          />
          <StatsCard
            title="Aktif Öğrenci"
            value={totals?.studentCount ?? 0}
            icon={Users}
            color="emerald"
          />
          <StatsCard
            title="Tamamlanma Oranı"
            value={`%${totals?.completionRate ?? 0}`}
            icon={Video}
            trend={
              completionTrend
                ? { value: completionTrend.delta, isPositive: completionTrend.isPositive }
                : undefined
            }
            color="amber"
          />
        </div>
      )}

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
          {chartData.length === 0 || chartData.every((d) => d.value === 0) ? (
            <div className="h-64 flex flex-col items-center justify-center text-sm text-muted-foreground">
              <Eye className="w-8 h-8 mb-2 opacity-40" />
              <p>Bu aralıkta henüz izlenme yok.</p>
            </div>
          ) : (
            <div className="h-64 flex items-end justify-between gap-2">
              {chartData.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex-1 flex flex-col items-center gap-2">
                  <div className="relative w-full h-full flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(item.value / maxValue) * 100}%` }}
                      transition={{ delay: index * 0.05, duration: 0.5 }}
                      className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-lg min-h-[4px]"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Engagement Chart — real metrics derived from totals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-xl border border-border bg-card"
        >
          <h3 className="font-semibold mb-4">Etkileşim Oranı</h3>
          {totals && totals.totalViews > 0 ? (
            <div className="space-y-4">
              <EngagementBar
                label="Video Tamamlama"
                value={totals.completionRate}
                color="bg-emerald-500"
                delay={0.3}
              />
              <EngagementBar
                label="Beğeni Oranı"
                value={totals.likeRate}
                color="bg-primary"
                delay={0.4}
              />
              <EngagementBar
                label="Quiz Başarı Ortalaması"
                value={totals.quizAvgScore ?? 0}
                suffix={
                  totals.quizAvgScore === null
                    ? '— (deneme yok)'
                    : `(${totals.quizAttempts} cevap)`
                }
                color="bg-accent"
                delay={0.5}
                muted={totals.quizAvgScore === null}
              />
              <EngagementBar
                label="Aktif Öğrenci / İzlenme"
                value={
                  totals.totalViews === 0
                    ? 0
                    : Math.round((totals.studentCount / totals.totalViews) * 100)
                }
                color="bg-amber-500"
                delay={0.6}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Etkileşim hesaplanabilmesi için en az 1 izlenme gerek.
            </p>
          )}
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
        {topVideos.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Video className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Bu aralıkta sıralanacak izlenme yok.</p>
          </div>
        ) : (
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
                        {video.views} izlenme
                      </span>
                      <span>%{video.completionRate} tamamlama</span>
                      {video.likeCount > 0 && <span>{video.likeCount} beğeni</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {video.trend === 'up' ? (
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  ) : video.trend === 'down' ? (
                    <TrendingDown className="w-5 h-5 text-destructive" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Insights — derived from real data, not hard-coded */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-xl border border-primary/30 bg-primary/5"
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {viewsTrend?.isPositive ? 'Pozitif Trend' : viewsTrend ? 'Düşüş' : 'Trend'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {viewsTrend
              ? viewsTrend.isPositive
                ? `Bu aralıkta izlenmeleriniz önceki yarıya göre %${viewsTrend.delta} arttı.`
                : `Bu aralıkta izlenmeleriniz önceki yarıya göre %${viewsTrend.delta} azaldı.`
              : 'Yeterli veri yok — birkaç gün sonra trendi göstereceğiz.'}
            {insightTop ? ` En çok izlenen: "${insightTop.title}".` : ''}
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
            {insightAvgWatch === 0
              ? 'Henüz izlenme verisi yok. Bir videonu sınıfa atayıp tekrar kontrol et.'
              : insightAvgWatch < 120
              ? `Ortalama izlenme ${formatDurationMMSS(insightAvgWatch)}. Öğrenciler ilk 2 dakikada bırakıyor — başlangıçta dikkat çekici bir kanca slaytı kullanmayı dene.`
              : insightAvgWatch < 300
              ? `Ortalama izlenme ${formatDurationMMSS(insightAvgWatch)}. Orta seviyede — videoyu 5-8 dakika tutarsan tamamlama oranı genelde yükselir.`
              : `Ortalama izlenme süresi ${formatDurationMMSS(insightAvgWatch)} — çok iyi. Bu uzunluğu koruyup quiz slaytı ekleyerek etkileşimi artırabilirsin.`}
          </p>
        </motion.div>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Reusable engagement bar — extracted so the chart card stays scannable.
function EngagementBar({
  label,
  value,
  color,
  delay,
  suffix,
  muted,
}: {
  label: string;
  value: number;
  color: string;
  delay: number;
  suffix?: string;
  muted?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className={cn('font-medium', muted && 'text-muted-foreground')}>
          {muted ? suffix : `%${clamped}${suffix ? ` ${suffix}` : ''}`}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ delay, duration: 0.8 }}
          className={cn('h-full', color)}
        />
      </div>
    </div>
  );
}
