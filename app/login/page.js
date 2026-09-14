'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // আমাদের নতুন ওয়েটিং রুমের লিংক
          redirectTo: 'https://cuet-adventure-society-v2.pages.dev/auth/callback'
        }
      })
      if (error) throw error
    } catch (error) {
      alert('গুগল লগইন ফেইল করেছে: ' + error.message)
      setGoogleLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (error) throw error

      if (data.user) {
        router.push('/dashboard')
      }
    } catch (error) {
      alert('ইমেইল অথবা পাসওয়ার্ড ভুল হয়েছে! আবার চেষ্টা করুন।\n(' + error.message + ')')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!email) {
      alert('পাসওয়ার্ড রিসেট করতে আগে উপরের বক্সে আপনার ইমেইলটি লিখুন।')
      return
    }
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://cuet-adventure-society-v2.pages.dev/reset-password',
      })
      if (error) throw error
      alert('রিসেট লিংক পাঠানো হয়েছে! আপনার ইমেইল ইনবক্স চেক করুন।')
    } catch (error) {
      alert('ইমেইল পাঠাতে সমস্যা হয়েছে: ' + error.message)
    }
  }

  return (
    <main className="min-h-screen bg-[#050b08] text-gray-300 font-sans flex md:items-center justify-center py-12 px-4 sm:px-6 relative overflow-x-hidden">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#050b08]/90 via-[#0a1c13]/80 to-[#050b08]/90"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#e76f51]/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-[#2d6a4f]/10 rounded-full blur-[80px] animate-pulse"></div>
      </div>

      <div className="max-w-5xl w-full bg-[#0a1c13]/70 backdrop-blur-xl rounded-[2rem] shadow-[0_0_20px_rgba(231,111,81,0.1)] overflow-hidden flex flex-col md:flex-row relative z-10 border border-white/10">
        
        <div className="w-full md:w-5/12 bg-black/40 p-10 lg:p-14 flex flex-col justify-center border-r border-white/5 relative overflow-hidden">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-[#e76f51] transition-colors bg-white/5 px-4 py-2 rounded-full text-xs font-bold uppercase border border-white/10 w-max mb-12 relative z-10">
            ← হোমপেজে ফিরে যান
          </Link>
          
          <div className="relative z-10">
            <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-5 text-white">
              ফিরে আসার <br/><span className="text-[#e76f51]">রোমাঞ্চ</span>
            </h2>
            <p className="text-gray-400 text-sm border-l-2 border-[#e76f51] pl-4">
              আপনার পরবর্তী অ্যাডভেঞ্চার অপেক্ষা করছে। ক্লাবের ইভেন্ট বুকিং ও ড্যাশবোর্ড অ্যাক্সেস করতে লগইন করুন।
            </p>
          </div>
        </div>

        <div className="w-full md:w-7/12 p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
          <div className="mb-8 border-b border-white/10 pb-6">
            <h3 className="text-2xl lg:text-3xl font-black text-white mb-2">ড্যাশবোর্ডে লগইন করুন</h3>
            <p className="text-sm text-gray-400">নিরাপদে আপনার অ্যাকাউন্টে প্রবেশ করুন</p>
          </div>

          {/* Google Login Button */}
          <button 
            onClick={handleGoogleLogin} 
            disabled={googleLoading}
            type="button" 
            className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-gray-200 hover:border-[#e76f51]/50 font-bold py-3.5 px-4 rounded-xl transition-all mb-6 relative overflow-hidden backdrop-blur-sm shadow-sm"
          >
            {googleLoading ? (
              <i className="fa-solid fa-circle-notch fa-spin text-gray-400"></i>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.08-1.92 3.27-4.74 3.27-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.58-2.77c-.98.66-2.23 1.06-3.7 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>{googleLoading ? 'অপেক্ষা করুন...' : 'গুগল দিয়ে লগইন করুন'}</span>
          </button>

          <div className="relative flex items-center py-2 mb-6">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-[10px] sm:text-xs font-bold tracking-widest uppercase">অথবা ইমেইল দিয়ে</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">ইমেইল অ্যাড্রেস</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@cuet.ac.bd" 
                className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-4 focus:border-[#e76f51] focus:ring-1 focus:ring-[#e76f51] outline-none transition-all" 
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">পাসওয়ার্ড</label>
                <button 
                  type="button" 
                  onClick={handlePasswordReset} 
                  className="text-[10px] text-[#e76f51] hover:text-white transition-colors font-bold tracking-wide"
                >
                  পাসওয়ার্ড ভুলে গেছেন?
                </button>
              </div>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-4 focus:border-[#e76f51] focus:ring-1 focus:ring-[#e76f51] outline-none transition-all" 
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-[#e76f51] hover:bg-orange-600 text-white font-black text-lg py-4 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(231,111,81,0.4)] hover:-translate-y-1 flex justify-center items-center gap-2"
              >
                {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400">
              অ্যাকাউন্ট নেই? <Link href="/signup" className="text-[#e76f51] font-bold hover:text-white transition-colors border-b border-transparent hover:border-white pb-0.5">নতুন অ্যাডভেঞ্চার অ্যাকাউন্ট তৈরি করুন</Link>
            </p>
          </div>
        </div>

      </div>
    </main>
  )
}
