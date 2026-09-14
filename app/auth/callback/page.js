'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // ম্যানুয়ালি সেশন চেক করা
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      }
    }
    checkSession()

    // সুপাবেজ যখনই URL থেকে টোকেন সেভ করে ফেলবে, তখনই ড্যাশবোর্ডে পাঠাবে
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push('/dashboard')
      }
    })

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[#050b08] flex flex-col items-center justify-center text-white">
      <i className="fa-solid fa-circle-notch fa-spin text-5xl text-[#e76f51] mb-6"></i>
      <h2 className="text-xl font-bold tracking-widest uppercase">লগইন ভেরিফাই করা হচ্ছে...</h2>
      <p className="text-gray-400 mt-2 text-sm">দয়া করে পেজটি কাটবেন না, কয়েক সেকেন্ড অপেক্ষা করুন</p>
    </div>
  )
}
