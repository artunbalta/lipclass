'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, BookOpen, Loader2, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
interface WatchedVideo {
  id: string;
  title: string;
  subject: string;
  grade: string;
  curriculumCodes: string[];
}

interface SubjectGroup {
  subject: string;
  grades: string[];
  videos: WatchedVideo[];
  codes: string[];
}

const SUBJECT_EMOJI: Record<string, string> = {
  Matematik: '📐',
  Fizik: '⚡',
  Kimya: '🧪',
  Biyoloji: '🧬',
  Türkçe: '📚',
  Edebiyat: '✍️',
  Tarih: '🏛️',
  Coğrafya: '🗺️',
  İngilizce: '🌍',
  'Fen Bilimleri': '🔬',
};

export default function PortfolioPage() {
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<SubjectGroup[]>([]);
  const [totalCodes, setTotalCodes] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const exportPdf = () => {
    const date = new Date().toLocaleDateString('tr-TR');
    const rows = groups.map(g => `
      <tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:10px 12px;font-weight:600">${g.subject}</td>
        <td style="padding:10px 12px;text-align:center">${g.grades.sort((a,b)=>Number(a)-Number(b)).map(x=>x+'. Sınıf').join(', ')}</td>
        <td style="padding:10px 12px;text-align:center">${g.videos.length}</td>
        <td style="padding:10px 12px;text-align:center">${g.codes.length}</td>
        <td style="padding:10px 12px;font-size:11px;color:#64748b">${g.codes.sort().join(', ')}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">
      <title>Öğrenci Transkripti - ${user?.name ?? ''}</title>
      <style>
        body{font-family:system-ui,sans-serif;color:#0f172a;padding:32px;max-width:900px;margin:0 auto}
        h1{font-size:22px;font-weight:700;margin-bottom:4px}
        .meta{color:#64748b;font-size:13px;margin-bottom:24px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        thead tr{background:#f1f5f9}
        th{padding:10px 12px;text-align:left;font-weight:600;color:#334155}
        .footer{margin-top:24px;font-size:11px;color:#94a3b8;text-align:center}
        @media print{body{padding:16px}}
      </style>
    </head><body>
      <h1>🎓 Öğrenci Portfolyosu & MEB Kazanım Transkripti</h1>
      <p class="meta">Öğrenci: <strong>${user?.name ?? '—'}</strong> &nbsp;|&nbsp; Tarih: ${date} &nbsp;|&nbsp; Toplam: ${totalVideos} video, ${totalCodes} kazanım, ${groups.length} ders</p>
      <table>
        <thead><tr>
          <th>Ders</th><th style="text-align:center">Sınıf</th>
          <th style="text-align:center">Video</th><th style="text-align:center">Kazanım</th>
          <th>MEB Kazanım Kodları</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="footer">Bu transkript Chalk AI platformu tarafından otomatik oluşturulmuştur.</p>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };
  const [difficultyInfo, setDifficultyInfo] = useState<{
    suggestedDifficulty: string;
    successRate: number | null;
    totalAttempts: number;
  } | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const supabase = createClient();

    async function load() {
      setIsLoading(true);
      try {
        // Get all video_ids this student has watched
        const { data: analytics } = await supabase
          .from('video_analytics')
          .select('video_id')
          .eq('user_id', user!.id);

        const videoIds = [...new Set((analytics || []).map((a: any) => a.video_id as string))];

        if (videoIds.length === 0) {
          setGroups([]);
          setIsLoading(false);
          return;
        }

        // Get those videos' details
        const { data: videos } = await supabase
          .from('videos')
          .select('id, title, subject, grade, curriculum_codes')
          .in('id', videoIds);

        const watchedVideos: WatchedVideo[] = (videos || []).map((v: any) => ({
          id: v.id,
          title: v.title,
          subject: v.subject,
          grade: v.grade,
          curriculumCodes: Array.isArray(v.curriculum_codes) ? v.curriculum_codes : [],
        }));

        setTotalVideos(watchedVideos.length);

        // Group by subject
        const subjectMap = new Map<string, SubjectGroup>();
        for (const v of watchedVideos) {
          if (!subjectMap.has(v.subject)) {
            subjectMap.set(v.subject, {
              subject: v.subject,
              grades: [],
              videos: [],
              codes: [],
            });
          }
          const group = subjectMap.get(v.subject)!;
          group.videos.push(v);
          if (!group.grades.includes(v.grade)) group.grades.push(v.grade);
          for (const code of v.curriculumCodes) {
            if (!group.codes.includes(code)) group.codes.push(code);
          }
        }

        const sorted = [...subjectMap.values()].sort((a, b) =>
          a.subject.localeCompare(b.subject, 'tr')
        );
        setGroups(sorted);
        setTotalCodes(sorted.reduce((sum, g) => sum + g.codes.length, 0));

        // Fetch adaptive difficulty suggestion
        const diffRes = await fetch('/api/sr?action=difficulty');
        if (diffRes.ok) {
          const diff = await diffRes.json();
          setDifficultyInfo(diff);
        }
      } catch {
        /* silent */
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <BookOpen className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Portfolyo boş</h2>
        <p className="text-muted-foreground">
          Video izledikçe tamamlanan MEB kazanımları burada görünür.
        </p>
      </div>
    );
  }

  const difficultyLabel: Record<string, string> = {
    easy: 'Kolay',
    medium: 'Orta',
    hard: 'Zor',
  };
  const difficultyColor: Record<string, string> = {
    easy: 'text-emerald-500',
    medium: 'text-amber-500',
    hard: 'text-red-500',
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="w-7 h-7 text-primary" />
            Portfolyo & Transkript
          </h1>
          <p className="text-muted-foreground mt-1">İzlediğin videolardan kazanılan MEB kazanımları</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={exportPdf}>
          <Download className="w-4 h-4" />
          PDF İndir
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'İzlenen Video', value: totalVideos },
          { label: 'Kazanım', value: totalCodes },
          { label: 'Ders', value: groups.length },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl border border-border bg-card text-center">
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Adaptive difficulty card */}
      {difficultyInfo && difficultyInfo.totalAttempts >= 5 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between gap-4"
        >
          <div>
            <p className="font-medium text-sm">Seviye Önerisi</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Son {difficultyInfo.totalAttempts} quiz sonucuna göre önerilen zorluk
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className={cn('text-lg font-bold', difficultyColor[difficultyInfo.suggestedDifficulty])}>
              {difficultyLabel[difficultyInfo.suggestedDifficulty]}
            </p>
            {difficultyInfo.successRate !== null && (
              <p className="text-xs text-muted-foreground">
                %{Math.round(difficultyInfo.successRate * 100)} doğru
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Subject groups */}
      <div className="space-y-3">
        {groups.map((group, i) => {
          const emoji = SUBJECT_EMOJI[group.subject] || '📖';
          const isExpanded = expandedSubject === group.subject;

          return (
            <motion.div
              key={group.subject}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <button
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedSubject(isExpanded ? null : group.subject)}
              >
                <span className="text-2xl">{emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold">{group.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.videos.length} video · {group.codes.length} kazanım ·{' '}
                    {group.grades
                      .sort((a, b) => Number(a) - Number(b))
                      .map((g) => `${g}. Sınıf`)
                      .join(', ')}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {group.codes.length} kazanım
                </Badge>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  {/* Curriculum codes */}
                  {group.codes.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">MEB Kazanımları</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.codes.sort().map((code) => (
                          <Badge key={code} variant="secondary" className="text-xs font-mono">
                            ✓ {code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">İzlenen Videolar</p>
                    <div className="space-y-1.5">
                      {group.videos.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/40"
                        >
                          <span className="truncate">{v.title}</span>
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">
                            {v.grade}. Sınıf
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
