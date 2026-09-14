'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState("গুগল থেকে ডেটা গ্রহণ করা হচ্ছে...")
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    let isMounted = true;

    const processLogin = async () => {
      try {
        // ১. URL-এ কোনো এরর আছে কি না চেক করা
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('error')) {
          throw new Error(urlParams.get('error_description') || "লগইন বাতিল করা হয়েছে")
        }

        // ২. URL থেকে গুগলের পাঠানো সিক্রেট 'কোড' সংগ্রহ করা
        const code = urlParams.get('code')
        
        if (code) {
          if (isMounted) setStatus("অ্যাকাউন্ট ভেরিফাই করা হচ্ছে...")
          
          // জোর করে কোডটি এক্সচেঞ্জ করা (যাতে সুপাবেজ মিস না করে)
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error && error.message !== "Auth session missing!") {
             console.error("Exchange Error:", error)
          }
        }

        // ৩. একটু সময় দিয়ে চেক করা সেশন সেভ হয়েছে কি না
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session) {
            if (isMounted) setStatus("লগইন সফল! ড্যাশবোর্ডে নেওয়া হচ্ছে...")
            router.push('/dashboard')
          } else {
            if (isMounted) setErrorMsg("সেশন তৈরি করা যায়নি! ক্লাউডফেয়ার বা সুপাবেজে কানেকশন সমস্যা হতে পারে।")
          }
        }, 1500)

      } catch (err) {
        if (isMounted) setErrorMsg(err.message)
      }
    }

    processLogin()

    return () => {
      isMounted = false;
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[#050b08] flex flex-col items-center justify-center text-white px-6 text-center">
      {!errorMsg ? (
        <>
          <i className="fa-solid fa-circle-notch fa-spin text-5xl text-[#e76f51] mb-6"></i>
          <h2 className="text-xl font-bold tracking-widest uppercase">{status}</h2>
          <p className="text-gray-400 mt-2 text-sm">দয়া করে পেজটি কাটবেন না</p>
        </>
      ) : (
        <div className="bg-[#0a1c13] p-8 rounded-2xl border border-red-500/30 shadow-xl max-w-md w-full">
          <i className="fa-solid fa-triangle-exclamation text-5xl text-red-500 mb-4 animate-bounce"></i>
          <h2 className="text-xl font-black text-white mb-2">কোথাও সমস্যা হয়েছে!</h2>
          <p className="text-red-400 font-medium mb-6">{errorMsg}</p>
          <Link href="/login" className="inline-block bg-white/10 hover:bg-[#e76f51] text-white px-6 py-3 rounded-xl font-bold transition-colors">
            লগইন পেজে ফিরে যান
          </Link>
        </div>
      )}
    </div>
  )
}
