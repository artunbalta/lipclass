'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Copy, Check, Loader2, ChevronDown, ChevronRight,
  Trash2, Video, ClipboardList, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useVideoStore } from '@/stores/video-store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Classroom {
  id: string;
  name: string;
  subject: string | null;
  grade: string | null;
  join_code: string;
  created_at: string;
  classroom_members?: [{ count: number }];
}

interface StudentRow {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  joinedAt: string;
  watchedVideos: number;
  quizAttempts: number;
  quizScore: number | null;
}

interface AssignmentRow {
  id: string;
  classroom_id: string;
  video_id: string;
  title: string | null;
  deadline: string | null;
  videos: { id: string; title: string; subject: string; grade: string } | null;
}

export default function TeacherClassroomsPage() {
  const { videos, fetchVideos } = useVideoStore();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [students, setStudents] = useState<Record<string, StudentRow[]>>({});
  const [assignments, setAssignments] = useState<Record<string, AssignmentRow[]>>({});
  const [loadingStudents, setLoadingStudents] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [assigningTo, setAssigningTo] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [deadline, setDeadline] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    const res = await fetch('/api/classrooms');
    if (res.ok) {
      const d = await res.json();
      setClassrooms(d.classrooms ?? []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); fetchVideos(); }, [load, fetchVideos]);

  const loadStudents = useCallback(async (classroomId: string) => {
    if (students[classroomId]) return;
    setLoadingStudents(classroomId);
    const [sRes, aRes] = await Promise.all([
      fetch(`/api/classrooms/${classroomId}/students`),
      fetch(`/api/assignments?classroom_id=${classroomId}`),
    ]);
    if (sRes.ok) {
      const d = await sRes.json();
      setStudents(prev => ({ ...prev, [classroomId]: d.students ?? [] }));
    }
    if (aRes.ok) {
      const d = await aRes.json();
      setAssignments(prev => ({ ...prev, [classroomId]: d.assignments ?? [] }));
    }
    setLoadingStudents(null);
  }, [students]);

  const handleExpand = (id: string) => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next) loadStudents(next);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch('/api/classrooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), subject: newSubject || undefined, grade: newGrade || undefined }),
    });
    if (res.ok) {
      const d = await res.json();
      setClassrooms(prev => [d.classroom, ...prev]);
      setNewName(''); setNewSubject(''); setNewGrade('');
      setShowCreate(false);
      toast.success('Sınıf oluşturuldu!');
    } else {
      toast.error('Hata oluştu.');
    }
    setCreating(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleAssign = async (classroomId: string) => {
    if (!selectedVideoId) return;
    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classroom_id: classroomId,
        video_id: selectedVideoId,
        deadline: deadline || undefined,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setAssignments(prev => ({
        ...prev,
        [classroomId]: [d.assignment, ...(prev[classroomId] ?? [])],
      }));
      setAssigningTo(null);
      setSelectedVideoId('');
      setDeadline('');
      toast.success('Ödev atandı!');
    } else {
      const e = await res.json();
      toast.error(e.error ?? 'Hata');
    }
  };

  const deleteAssignment = async (classroomId: string, assignmentId: string) => {
    const res = await fetch(`/api/assignments?id=${assignmentId}`, { method: 'DELETE' });
    if (res.ok) {
      setAssignments(prev => ({
        ...prev,
        [classroomId]: (prev[classroomId] ?? []).filter(a => a.id !== assignmentId),
      }));
    }
  };

  const publishedVideos = videos.filter(v => v.status === 'published' || v.status === 'slides_ready');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Sınıflarım
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Öğrencilerinize sınıf kodu paylaşın, ilerlemelerini takip edin.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="gap-2">
          <Plus className="w-4 h-4" />
          Yeni Sınıf
        </Button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
              <p className="font-medium text-sm">Yeni Sınıf Oluştur</p>
              <div className="grid sm:grid-cols-3 gap-3">
                <Input
                  placeholder="Sınıf adı (ör. 8-A Matematik)"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="sm:col-span-1"
                />
                <Input
                  placeholder="Ders (opsiyonel)"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                />
                <Input
                  placeholder="Sınıf seviyesi (opsiyonel)"
                  value={newGrade}
                  onChange={e => setNewGrade(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={creating || !newName.trim()} size="sm">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Oluştur'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>İptal</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Classroom list */}
      {classrooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-medium">Henüz sınıf yok</p>
          <p className="text-sm text-muted-foreground">Yukarıdaki butona tıklayarak ilk sınıfınızı oluşturun.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classrooms.map((cls, i) => {
            const isExpanded = expandedId === cls.id;
            const memberCount = cls.classroom_members?.[0]?.count ?? 0;

            return (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                {/* Row header */}
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => handleExpand(cls.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{cls.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[cls.subject, cls.grade ? `${cls.grade}. Sınıf` : null].filter(Boolean).join(' · ')}
                      {memberCount > 0 && ` · ${memberCount} öğrenci`}
                    </p>
                  </div>

                  {/* Join code chip */}
                  <button
                    onClick={e => { e.stopPropagation(); copyCode(cls.join_code); }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-colors shrink-0',
                      copiedCode === cls.join_code
                        ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                        : 'border-border hover:border-primary text-foreground'
                    )}
                  >
                    {copiedCode === cls.join_code ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {cls.join_code}
                  </button>

                  {isExpanded
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {loadingStudents === cls.id ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="p-4 space-y-5">
                        {/* Students */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            Öğrenciler ({students[cls.id]?.length ?? 0})
                          </p>
                          {(students[cls.id] ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">
                              Henüz kimse katılmadı. Kodu paylaşın: <span className="font-mono font-bold">{cls.join_code}</span>
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {students[cls.id].map(s => (
                                <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/40">
                                  <Avatar className="w-8 h-8 shrink-0">
                                    <AvatarImage src={s.avatar} />
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                      {s.name?.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{s.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                                  </div>
                                  <div className="text-right shrink-0 space-y-0.5">
                                    <p className="text-xs text-muted-foreground">{s.watchedVideos} video</p>
                                    {s.quizScore !== null && (
                                      <p className={cn(
                                        'text-xs font-medium',
                                        s.quizScore >= 70 ? 'text-emerald-600' : s.quizScore >= 40 ? 'text-amber-600' : 'text-destructive'
                                      )}>
                                        %{s.quizScore} quiz
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Assignments */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Ödevler ({assignments[cls.id]?.length ?? 0})
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 h-7 text-xs"
                              onClick={() => setAssigningTo(assigningTo === cls.id ? null : cls.id)}
                            >
                              <Plus className="w-3 h-3" />
                              Ödev Ata
                            </Button>
                          </div>

                          <AnimatePresence>
                            {assigningTo === cls.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden mb-3"
                              >
                                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                                  <select
                                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
                                    value={selectedVideoId}
                                    onChange={e => setSelectedVideoId(e.target.value)}
                                  >
                                    <option value="">Video seç...</option>
                                    {publishedVideos.map(v => (
                                      <option key={v.id} value={v.id}>{v.title} ({v.subject} · {v.grade}. Sınıf)</option>
                                    ))}
                                  </select>
                                  <Input
                                    type="datetime-local"
                                    placeholder="Son teslim tarihi (opsiyonel)"
                                    value={deadline}
                                    onChange={e => setDeadline(e.target.value)}
                                    className="text-sm"
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" className="h-7 text-xs" disabled={!selectedVideoId} onClick={() => handleAssign(cls.id)}>
                                      Ata
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAssigningTo(null)}>
                                      İptal
                                    </Button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {(assignments[cls.id] ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">Henüz ödev atanmadı.</p>
                          ) : (
                            <div className="space-y-2">
                              {assignments[cls.id].map(a => (
                                <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 text-sm">
                                  <Video className="w-4 h-4 text-primary shrink-0" />
                                  <span className="flex-1 truncate">{a.videos?.title ?? 'Video'}</span>
                                  {a.deadline && (
                                    <span className="text-xs text-muted-foreground shrink-0">
                                      {new Date(a.deadline).toLocaleDateString('tr-TR')}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => deleteAssignment(cls.id, a.id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
