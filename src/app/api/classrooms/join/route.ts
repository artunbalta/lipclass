// POST /api/classrooms/join  { code: string }
// Student joins a classroom by 6-char code.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const code = body?.code?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

  const { data: classroom, error: findErr } = await sb
    .from('classrooms')
    .select('id, name, teacher_id')
    .eq('join_code', code)
    .single();

  if (findErr || !classroom) {
    return NextResponse.json({ error: 'Sınıf bulunamadı. Kodu kontrol edin.' }, { status: 404 });
  }

  // Prevent teacher joining own class
  if (classroom.teacher_id === user.id) {
    return NextResponse.json({ error: 'Kendi sınıfınıza katılamazsınız.' }, { status: 400 });
  }

  const { error: joinErr } = await sb
    .from('classroom_members')
    .upsert({ classroom_id: classroom.id, student_id: user.id }, { onConflict: 'classroom_id,student_id', ignoreDuplicates: true });

  if (joinErr) return NextResponse.json({ error: joinErr.message }, { status: 500 });
  return NextResponse.json({ classroom: { id: classroom.id, name: classroom.name } });
}
