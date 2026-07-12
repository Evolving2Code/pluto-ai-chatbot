'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })
  }, [])

  async function handleLogOut() {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <p>Loading...</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">Pluto</h1>
      {user ? (
        <>
          <p className="text-gray-500">Logged in as {user.email}</p>
          <button
            onClick={handleLogOut}
            className="bg-black text-white rounded p-2 px-4"
          >
            Log out
          </button>
        </>
      ) : (
        <p className="mt-2 text-gray-500">Coming soon</p>
      )}
    </main>
  )
}