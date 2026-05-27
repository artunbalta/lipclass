// GET  /api/notifications          → unread notifications (latest 20)
// PATCH /api/notifications?id=...  → mark single as read
// PATCH /api/notifications?all=1   → mark all as read

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await sb
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notifications: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);

  if (searchParams.get('all') === '1') {
    await sb.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    return NextResponse.json({ ok: true });
  }

  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await sb.from('notifications').update({ read: true }).eq('id', id).eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}

// Helper: insert a notification (called internally from other routes)
export async function insertNotification(
  sb: Awaited<ReturnType<typeof createClient>>,
  payload: { user_id: string; type: string; title: string; body?: string; link?: string }
) {
  await sb.from('notifications').insert(payload);
}
