'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search,
  ClipboardList,
  Loader2,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuizStore } from '@/stores/quiz-store';
import { SUBJECTS, GRADES } from '@/lib/constants';

export default function StudentQuizzesPage() {
  const { quizzes, isLoading, fetchPublishedQuizzes } = useQuizStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');

  useEffect(() => {
    fetchPublishedQuizzes();
  }, [fetchPublishedQuizzes]);

  const filteredQuizzes = quizzes.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.topic || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubject === 'all' || q.subject === filterSubject;
    const matchesGrade = filterGrade === 'all' || q.grade === filterGrade;
    return matchesSearch && matchesSubject && matchesGrade;
  });

  const difficultyLabel = (d: string) =>
    d === 'easy' ? 'Kolay' : d === 'hard' ? 'Zor' : 'Orta';
  const difficultyColor = (d: string) =>
    d === 'easy'
      ? 'bg-emerald-100 text-emerald-700'
      : d === 'hard'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Quizler</h1>
      <p className="text-muted-foreground mb-8">
        Öğretmenlerinizin oluşturduğu quizleri çözün ve kendinizi test edin
      </p>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Quiz ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Ders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Dersler</SelectItem>
            {SUBJECTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterGrade} onValueChange={setFilterGrade}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Sınıf" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Sınıflar</SelectItem>
            {GRADES.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && filteredQuizzes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">Quiz bulunamadı</h3>
          <p className="text-muted-foreground">
            Henüz yayınlanmış quiz yok veya arama filtreleriniz sonuç döndürmedi.
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredQuizzes.map((quiz, idx) => (
          <motion.div
            key={quiz.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Link href={`/dashboard/student/quizzes/${quiz.id}`}>
              <div className="border border-border rounded-xl p-5 bg-card hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline">{quiz.subject}</Badge>
                  <Badge variant="outline" className={difficultyColor(quiz.difficulty)}>
                    {difficultyLabel(quiz.difficulty)}
                  </Badge>
                </div>
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{quiz.title}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{quiz.grade}. sınıf</span>
                  <span>{quiz.numQuestions} soru</span>
                </div>
                {quiz.teacherName && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span>{quiz.teacherName}</span>
                  </div>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
