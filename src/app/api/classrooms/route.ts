// GET  /api/classrooms  — list classrooms for current user
//   teacher → own classrooms with student counts
//   student → joined classrooms
// POST /api/classrooms  — create classroom (teacher only)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single();
  const role = profile?.role;

  if (role === 'teacher') {
    const { data, error } = await sb
      .from('classrooms')
      .select('*, classroom_members(count)')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ classrooms: data ?? [] });
  }

  // student
  const { data, error } = await sb
    .from('classroom_members')
    .select('classroom_id, joined_at, classrooms(*)')
    .eq('student_id', user.id)
    .order('joined_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ classrooms: (data ?? []).map((m: any) => ({ ...m.classrooms, joinedAt: m.joined_at })) });
}

export async function POST(request: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  // Generate unique join code
  let join_code = randomCode();
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await sb.from('classrooms').select('id').eq('join_code', join_code).single();
    if (!existing) break;
    join_code = randomCode();
  }

  const { data, error } = await sb
    .from('classrooms')
    .insert({
      teacher_id: user.id,
      name: body.name,
      subject: body.subject ?? null,
      grade: body.grade ?? null,
      join_code,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ classroom: data }, { status: 201 });
}
