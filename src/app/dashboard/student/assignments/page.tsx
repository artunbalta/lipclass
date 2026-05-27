'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Play, Check, Loader2, Clock, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Assignment {
  id: string;
  classroom_id: string;
  video_id: string;
  title: string | null;
  deadline: string | null;
  completed: boolean;
  videos: {
    id: string;
    title: string;
    subject: string;
    grade: string;
    thumbnailUrl: string | null;
    duration: number;
    status: string;
  } | null;
  classrooms: { id: string; name: string } | null;
}

function isOverdue(deadline: string) {
  return new Date(deadline) < new Date();
}

function formatDeadline(deadline: string) {
  const d = new Date(deadline);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff < 0) return 'Süresi doldu';
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Bugün';
  if (days === 1) return 'Yarın';
  return `${days} gün kaldı`;
}

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');

  const load = useCallback(async () => {
    setIsLoading(true);
    const res = await fetch('/api/assignments');
    if (res.ok) {
      const d = await res.json();
      setAssignments(d.assignments ?? []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = assignments.filter(a => {
    if (filter === 'pending') return !a.completed;
    if (filter === 'done') return a.completed;
    return true;
  });

  const pending = assignments.filter(a => !a.completed).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <ClipboardList className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Ödev yok</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Öğretmeniniz bir sınıfa sizi ekleyip ödev atadığında burada görünür.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Ödevlerim
          </h1>
          {pending > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {pending} bekleyen ödev
            </p>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'pending', 'done'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {{ all: 'Tümü', pending: 'Bekleyen', done: 'Tamamlanan' }[f]}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          Bu filtrede ödev yok.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((a, i) => {
            const overdue = a.deadline && !a.completed && isOverdue(a.deadline);
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  'rounded-xl border bg-card overflow-hidden',
                  a.completed ? 'border-emerald-500/30 opacity-70' : overdue ? 'border-destructive/30' : 'border-border'
                )}
              >
                <div className="flex items-center gap-3 p-4">
                  {/* Completion dot */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    a.completed ? 'bg-emerald-500/20' : 'bg-muted'
                  )}>
                    {a.completed
                      ? <Check className="w-4 h-4 text-emerald-600" />
                      : <Play className="w-4 h-4 text-muted-foreground" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn('font-medium truncate', a.completed && 'line-through text-muted-foreground')}>
                      {a.videos?.title ?? 'Video'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {a.videos && (
                        <span className="text-xs text-muted-foreground">
                          {a.videos.subject} · {a.videos.grade}. Sınıf
                        </span>
                      )}
                      {a.classrooms && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="w-3 h-3" />
                          {a.classrooms.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {a.deadline && !a.completed && (
                      <span className={cn(
                        'flex items-center gap-1 text-xs font-medium',
                        overdue ? 'text-destructive' : 'text-amber-600'
                      )}>
                        <Clock className="w-3 h-3" />
                        {formatDeadline(a.deadline)}
                      </span>
                    )}
                    {!a.completed && a.videos && (
                      <Link href={`/dashboard/student/watch/${a.video_id}`}>
                        <Button size="sm" className="h-7 text-xs gap-1">
                          <Play className="w-3 h-3" />
                          İzle
                        </Button>
                      </Link>
                    )}
                    {a.completed && (
                      <Badge variant="secondary" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 text-xs">
                        Tamamlandı
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
