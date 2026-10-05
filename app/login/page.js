'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [fbLoading, setFbLoading] = useState(false) 
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetStatus, setResetStatus] = useState('idle') 

  const [showErrorModal, setShowErrorModal] = useState(false)

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://cuetas.pages.dev/auth/callback'
        }
      })
      if (error) throw error
    } catch (error) {
      alert('গুগল লগইন ফেইল করেছে: ' + error.message)
      setGoogleLoading(false)
    }
  }

  const handleFacebookLogin = async () => {
    setFbLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: 'https://cuetas.pages.dev/auth/callback'
        }
      })
      if (error) throw error
    } catch (error) {
      alert('ফেসবুক লগইন ফেইল করেছে: ' + error.message)
      setFbLoading(false)
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
      if (error.message.includes('JWT') || error.message.includes('future') || error.message.includes('expired')) {
        alert(
          '⚠️ আপনার ডিভাইসের ঘড়ির সময় সঠিক নেই!\n\n' +
          'দয়া করে আপনার মোবাইলের বা কম্পিউটারের সেটিংসে গিয়ে "Automatic Date & Time" (Network Time) চালু করুন এবং পেজটি রিলোড দিয়ে আবার চেষ্টা করুন। ঘড়ির সময় ঠিক না থাকলে নিরাপত্তার কারণে লগইন করা যায় না।'
        );
      } else {
        setShowErrorModal(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const submitPasswordReset = async (e) => {
    e.preventDefault()
    if (!resetEmail) return
    
    setResetStatus('loading')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'https://cuetas.pages.dev/reset-password',
      })
      if (error) throw error
      
      setResetStatus('success')
    } catch (error) {
      alert('ইমেইল পাঠাতে সমস্যা হয়েছে: ' + error.message)
      setResetStatus('idle')
    }
  }

  const openResetModal = () => {
    setResetEmail(email)
    setResetStatus('idle')
    setShowResetModal(true)
  }

  return (
    <main className="min-h-screen bg-[#fcf9f2] dark:bg-[#050b08] text-gray-800 dark:text-gray-300 font-sans flex md:items-center justify-center py-12 px-4 sm:px-6 relative overflow-x-hidden transition-colors duration-500">
      
      {/* 🔴 Background Effects (Light & Dark Support) */}
      <div className="fixed inset-0 z-0 pointer-events-none transition-colors duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-[#fcf9f2]/90 via-[#f3eedd]/80 to-[#fcf9f2]/90 dark:from-[#050b08]/90 dark:via-[#0a1c13]/80 dark:to-[#050b08]/90"></div>
        {/* Light Mode Blobs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-yellow-300/20 dark:bg-[#e76f51]/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-emerald-700/10 dark:bg-[#2d6a4f]/10 rounded-full blur-[80px] animate-pulse"></div>
      </div>

      <div className="max-w-5xl w-full bg-white/60 dark:bg-[#0a1c13]/70 backdrop-blur-xl rounded-[2rem] shadow-soft dark:shadow-[0_0_20px_rgba(231,111,81,0.1)] overflow-hidden flex flex-col md:flex-row relative z-10 border border-yellow-700/10 dark:border-white/10 transition-colors duration-500">
        
        {/* Left Column */}
        <div className="w-full md:w-5/12 bg-emerald-950/5 dark:bg-black/40 p-10 lg:p-14 flex flex-col justify-center border-r border-emerald-900/10 dark:border-white/5 relative overflow-hidden transition-colors duration-500">
          <Link href="/" className="inline-flex items-center gap-2 text-emerald-800 dark:text-gray-400 hover:text-black dark:hover:text-[#e76f51] transition-colors bg-white/50 dark:bg-white/5 px-4 py-2 rounded-full text-xs font-bold uppercase border border-emerald-900/10 dark:border-white/10 w-max mb-12 relative z-10 shadow-sm dark:shadow-none">
            ← হোমপেজে ফিরে যান
          </Link>
          
          <div className="relative z-10">
            <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-5 text-gray-900 dark:text-white transition-colors duration-500">
              চুয়েট অ্যাডভেঞ্চার <br/>
              <span className="text-yellow-600 dark:text-[#e76f51]">সোসাইটি</span>
            </h2>
            <p className="text-emerald-800 dark:text-gray-400 text-sm border-l-2 border-yellow-500 dark:border-[#e76f51] pl-4 font-medium transition-colors duration-500">
              অজানাকে জানার যাত্রায় আপনাকে স্বাগতম। আপনার অ্যাকাউন্টে প্রবেশ করুন
            </p>
          </div>
        </div>

        {/* Right Column: Login Form */}
        <div className="w-full md:w-7/12 p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
          <div className="mb-8 border-b border-gray-200 dark:border-white/10 pb-6 transition-colors duration-500">
            <h3 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white mb-2 transition-colors duration-500">ড্যাশবোর্ডে লগইন করুন</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-500">নিরাপদে আপনার অ্যাকাউন্টে প্রবেশ করুন</p>
          </div>

          {/* Social Login Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Google Login Button */}
            <button 
              onClick={handleGoogleLogin} 
              disabled={googleLoading || fbLoading}
              type="button" 
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:border-yellow-500 dark:hover:border-[#e76f51]/50 font-bold py-3.5 px-4 rounded-xl transition-all relative overflow-hidden backdrop-blur-sm shadow-sm hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(231,111,81,0.2)] hover:-translate-y-0.5"
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
              <span className="text-sm">{googleLoading ? 'অপেক্ষা করুন...' : 'Google'}</span>
            </button>

            {/* Facebook Login Button */}
            <button 
              onClick={handleFacebookLogin} 
              disabled={fbLoading || googleLoading}
              type="button" 
              className="w-full flex items-center justify-center gap-3 bg-[#1877F2]/5 dark:bg-[#1877F2]/10 border border-[#1877F2]/20 dark:border-[#1877F2]/30 text-[#1877F2] hover:bg-[#1877F2] hover:text-white font-bold py-3.5 px-4 rounded-xl transition-all relative overflow-hidden backdrop-blur-sm shadow-sm hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(24,119,242,0.4)] hover:-translate-y-0.5"
            >
              {fbLoading ? (
                <i className="fa-solid fa-circle-notch fa-spin text-current"></i>
              ) : (
                <i className="fa-brands fa-facebook text-lg"></i>
              )}
              <span className="text-sm">{fbLoading ? 'অপেক্ষা করুন...' : 'Facebook'}</span>
            </button>
          </div>

          <div className="relative flex items-center py-2 mb-6">
            <div className="flex-grow border-t border-gray-200 dark:border-white/10 transition-colors duration-500"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 dark:text-gray-500 text-[10px] sm:text-xs font-bold tracking-widest uppercase transition-colors duration-500">অথবা ইমেইল দিয়ে</span>
            <div className="flex-grow border-t border-gray-200 dark:border-white/10 transition-colors duration-500"></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors duration-500">ইমেইল অ্যাড্রেস</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@cuet.ac.bd" 
                className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl block p-4 focus:border-yellow-500 dark:focus:border-[#e76f51] focus:ring-1 focus:ring-yellow-500 dark:focus:ring-[#e76f51] outline-none shadow-sm dark:shadow-none transition-all duration-300" 
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors duration-500">পাসওয়ার্ড</label>
                
                <button 
                  type="button" 
                  onClick={openResetModal} 
                  className="group flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  <span>পাসওয়ার্ড ভুলে গেছেন?</span>
                  <span className="bg-yellow-100 dark:bg-[#e76f51]/10 text-yellow-700 dark:text-[#e76f51] px-2 py-0.5 rounded-full border border-yellow-200 dark:border-[#e76f51]/20 group-hover:bg-yellow-500 dark:group-hover:bg-[#e76f51] group-hover:text-white transition-all flex items-center gap-1">
                    <i className="fa-solid fa-key text-[9px]"></i> রিসেট
                  </span>
                </button>
              </div>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl block p-4 focus:border-yellow-500 dark:focus:border-[#e76f51] focus:ring-1 focus:ring-yellow-500 dark:focus:ring-[#e76f51] outline-none shadow-sm dark:shadow-none transition-all duration-300" 
              />
            </div>

            <div className="pt-2">
              {/* 🔴 Login Button (Pastel Yellow in Light, Orange in Dark) */}
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-yellow-500 hover:bg-yellow-600 dark:bg-[#e76f51] dark:hover:bg-orange-600 text-gray-900 dark:text-white font-black text-lg py-4 px-4 rounded-xl transition-all shadow-md dark:shadow-[0_0_15px_rgba(231,111,81,0.4)] hover:-translate-y-1 flex justify-center items-center gap-2"
              >
                {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-right-to-bracket"></i>}
                {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-500">
              অ্যাকাউন্ট নেই? <Link href="/signup" className="text-emerald-700 dark:text-[#e76f51] font-bold hover:text-black dark:hover:text-white transition-colors border-b border-transparent hover:border-black dark:hover:border-white pb-0.5">নতুন অ্যাডভেঞ্চার অ্যাকাউন্ট তৈরি করুন</Link>
            </p>
          </div>
        </div>
      </div>

      {/* 🔴 পাসওয়ার্ড রিসেট কাস্টম পপআপ (Modal) */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-emerald-950/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => setShowResetModal(false)}></div>
          
          <div className="bg-white dark:bg-[#0a1c13] border border-yellow-200 dark:border-[#e76f51]/30 rounded-3xl p-6 sm:p-8 w-full max-w-md relative z-10 shadow-2xl dark:shadow-[0_0_40px_rgba(231,111,81,0.15)] transform transition-all duration-500">
            
            <button onClick={() => setShowResetModal(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-black/50 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
              <i className="fa-solid fa-xmark"></i>
            </button>

            {resetStatus === 'success' ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-emerald-200 dark:border-emerald-500/30 transition-colors duration-500">
                  <i className="fa-solid fa-envelope-circle-check"></i>
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 transition-colors duration-500">লিংক পাঠানো হয়েছে!</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 transition-colors duration-500">
                  <strong className="text-gray-900 dark:text-white">{resetEmail}</strong> ঠিকানায় একটি পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে।
                </p>

                <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-4 mb-8 text-left flex items-start gap-3 shadow-inner transition-colors duration-500">
                  <i className="fa-solid fa-triangle-exclamation text-yellow-600 dark:text-yellow-500 mt-0.5 text-lg animate-pulse"></i>
                  <div>
                    <strong className="text-yellow-700 dark:text-yellow-500 block mb-1 text-sm">ইমেইল খুঁজে পাচ্ছেন না?</strong>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      অনেক সময় সিকিউরিটির কারণে ইমেইল সরাসরি ইনবক্সে না গিয়ে <strong className="text-gray-800 dark:text-white border-b border-gray-400 dark:border-white border-dashed pb-0.5">Spam</strong> বা <strong className="text-gray-800 dark:text-white border-b border-gray-400 dark:border-white border-dashed pb-0.5">Junk</strong> ফোল্ডারে চলে যেতে পারে। দয়া করে আপনার স্প্যাম ফোল্ডারটি চেক করুন।
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setShowResetModal(false)} 
                  className="w-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white font-bold py-3 rounded-xl transition-all"
                >
                  ঠিক আছে, বুঝতে পেরেছি
                </button>
              </div>
            ) : (
              <div className="py-2">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-[#e76f51]/20 text-yellow-600 dark:text-[#e76f51] rounded-full flex items-center justify-center text-xl mb-4 border border-yellow-200 dark:border-[#e76f51]/30 transition-colors duration-500">
                  <i className="fa-solid fa-unlock-keyhole"></i>
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 transition-colors duration-500">পাসওয়ার্ড রিকভারি</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6 transition-colors duration-500">
                  আপনার অ্যাকাউন্টের ইমেইল অ্যাড্রেসটি দিন। আমরা আপনাকে একটি পাসওয়ার্ড রিসেট লিংক পাঠিয়ে দেবো।
                </p>

                <form onSubmit={submitPasswordReset} className="space-y-5">
                  <div>
                    <input 
                      type="email" 
                      required 
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="আপনার ইমেইল লিখুন" 
                      className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl block p-4 focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none transition-all text-sm shadow-sm dark:shadow-none" 
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={resetStatus === 'loading'} 
                    className="w-full bg-yellow-500 hover:bg-yellow-600 dark:bg-[#e76f51] dark:hover:bg-orange-600 text-gray-900 dark:text-white font-bold py-3.5 rounded-xl transition-all shadow-md dark:shadow-[0_0_15px_rgba(231,111,81,0.3)] flex justify-center items-center gap-2"
                  >
                    {resetStatus === 'loading' ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-regular fa-paper-plane"></i>}
                    {resetStatus === 'loading' ? 'পাঠানো হচ্ছে...' : 'রিসেট লিংক পাঠান'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔴 মজার এরর পপআপ (Modal) */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-emerald-950/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => setShowErrorModal(false)}></div>
          
          <div className="bg-white dark:bg-[#0a1c13] border border-red-200 dark:border-red-500/30 rounded-3xl p-6 sm:p-8 w-full max-w-sm relative z-10 shadow-2xl dark:shadow-[0_0_40px_rgba(239,68,68,0.15)] transform transition-all text-center duration-500">
            
            <div className="text-6xl animate-bounce mb-4">
              😉
            </div>
            
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 transition-colors duration-500">ভুল পাসওয়ার্ড!</h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6 transition-colors duration-500">
              আপনার যে পাসওয়ার্ড ভুলে যাওয়ার রোগ শুরু হয়েছে তা কি বাসায় জানে? <br/><br/>
              দয়া করে সঠিক পাসওয়ার্ড দিন।
            </p>

            <button 
              onClick={() => setShowErrorModal(false)} 
              className="w-full bg-red-50 dark:bg-red-500/20 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white border border-red-200 dark:border-red-500/50 font-bold py-3 rounded-xl transition-all shadow-sm dark:shadow-none"
            >
              ঠিক আছে, আবার চেষ্টা করছি
            </button>
          </div>
        </div>
      )}

    </main>
  )
}
