'use client';

import { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  getKazanimlarBySubjectGrade,
  isCatalogCovered,
  findByCode,
  type Kazanim,
} from '@/lib/curriculum/meb-catalog';
import { cn } from '@/lib/utils';

interface KazanimPickerProps {
  subject: string;
  grade: string;
  selectedCodes: string[];
  onChange: (codes: string[]) => void;
  compact?: boolean;
}

/**
 * Multi-select picker for MEB kazanım codes filtered by (subject, grade).
 *
 * Behavior:
 *   - When (subject, grade) is not in the pilot catalog, shows an info note.
 *   - Kazanımlar are grouped by unit name.
 *   - Search filter on code and title.
 *   - Selected codes shown as removable badges above the list.
 */
export function KazanimPicker({
  subject,
  grade,
  selectedCodes,
  onChange,
  compact = false,
}: KazanimPickerProps) {
  const [search, setSearch] = useState('');

  const isCovered = isCatalogCovered(subject, grade);
  const all = useMemo(
    () => getKazanimlarBySubjectGrade(subject, grade),
    [subject, grade]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (k) => k.code.toLowerCase().includes(q) || k.title.toLowerCase().includes(q)
    );
  }, [all, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Kazanim[]>();
    for (const k of filtered) {
      if (!map.has(k.unitName)) map.set(k.unitName, []);
      map.get(k.unitName)!.push(k);
    }
    return map;
  }, [filtered]);

  const toggle = (code: string) => {
    if (selectedCodes.includes(code)) {
      onChange(selectedCodes.filter((c) => c !== code));
    } else {
      onChange([...selectedCodes, code]);
    }
  };

  if (!subject || !grade) {
    return (
      <div className="text-xs text-muted-foreground italic px-3 py-2 rounded-md bg-muted/50">
        Önce ders ve sınıf seçin.
      </div>
    );
  }

  if (!isCovered) {
    return (
      <div className="text-xs text-muted-foreground px-3 py-2 rounded-md bg-amber-50 border border-amber-200">
        ℹ️ <strong>{subject} {grade}. sınıf</strong> şu an pilot kataloğumuzda yok.
        Pilot kapsam: <strong>Matematik 8</strong>, <strong>Fizik 9</strong>, <strong>Kimya 10</strong>.
        İhtiyacın olduğunda diğer dersleri ekleriz.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Selected badges */}
      {selectedCodes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCodes.map((code) => {
            const k = findByCode(code);
            return (
              <Badge
                key={code}
                variant="secondary"
                className="gap-1.5 pl-2 pr-1 py-1 text-xs"
              >
                <span className="font-mono">{code}</span>
                {k && <span className="hidden sm:inline truncate max-w-[200px]">{k.title.slice(0, 40)}</span>}
                <button
                  type="button"
                  onClick={() => toggle(code)}
                  className="ml-0.5 rounded-full hover:bg-black/10 p-0.5"
                  title="Kaldır"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => onChange([])}
          >
            Hepsini temizle
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Kazanım kodu veya konu ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Grouped list */}
      <div
        className={cn(
          'rounded-lg border border-border bg-card overflow-y-auto',
          compact ? 'max-h-56' : 'max-h-80'
        )}
      >
        {[...grouped.entries()].map(([unit, items]) => (
          <div key={unit} className="border-b border-border last:border-b-0">
            <div className="px-3 py-1.5 bg-muted/40 text-[11px] font-medium text-muted-foreground sticky top-0">
              {unit}
            </div>
            {items.map((k) => {
              const isSelected = selectedCodes.includes(k.code);
              return (
                <button
                  key={k.code}
                  type="button"
                  onClick={() => toggle(k.code)}
                  className={cn(
                    'w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-muted/60 transition-colors border-b border-border/50 last:border-b-0',
                    isSelected && 'bg-primary/5'
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex items-center justify-center w-4 h-4 rounded border-2 shrink-0',
                      isSelected ? 'bg-primary border-primary' : 'border-gray-300'
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-primary">{k.code}</span>
                      {k.semester && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {k.semester}. dönem
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-foreground/80 mt-0.5 leading-snug">{k.title}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
        {grouped.size === 0 && (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground italic">
            Eşleşen kazanım bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}
