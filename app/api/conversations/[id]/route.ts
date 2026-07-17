import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  let title: string
  try {
    const body = await request.json()
    title = body.title

    if (!title || typeof title !== 'string' || !title.trim()) {
      return new Response('Title is required', { status: 400 })
    }
  } catch {
    return new Response('Invalid request body', { status: 400 })
  }

  const { error } = await supabase
    .from('conversations')
    .update({ title: title.trim().slice(0, 100) })
    .eq('id', id)

  if (error) {
    return new Response('Failed to rename conversation', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { error } = await supabase.from('conversations').delete().eq('id', id)

  if (error) {
    return new Response('Failed to delete conversation', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
