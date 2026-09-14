'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export default function AdminLayout({ children }) {
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let isMounted = true

    const checkAdminAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        if (isMounted) router.push('/login')
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (!error && profile?.role === 'admin') {
        if (isMounted) setAuthorized(true)
      } else {
        if (isMounted) router.push('/dashboard')
      }
    }

    checkAdminAccess()

    return () => {
      isMounted = false
    }
  }, [router, pathname])

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#050b08] flex flex-col items-center justify-center text-center p-4">
        <i className="fa-solid fa-shield-halved text-6xl text-red-500 mb-4 animate-pulse"></i>
        <h2 className="text-2xl font-black text-white mb-2">অ্যাক্সেস ডিনাইড!</h2>
        <p className="text-gray-400">এই এরিয়ায় প্রবেশ করার জন্য আপনার অ্যাডমিন পারমিশন নেই।</p>
      </div>
    )
  }

  return (
    <div className="admin-wrapper relative z-10 pt-20">
      {children}
    </div>
  )
}
