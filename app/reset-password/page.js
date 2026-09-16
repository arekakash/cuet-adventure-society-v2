'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // পেজ লোড হওয়ার পর কিছুক্ষণের জন্য হ্যাশ (#) টোকেন প্রসেস করার সুযোগ দেওয়া
  useEffect(() => {
    // Supabase URL-এর হ্যাশ থেকে সেশন সেট আপ করে, তাই একটু ওয়েট করা ভালো
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // যদি সেশন না থাকে, তাহলে হয়তো লিংকটি এক্সপায়ার হয়ে গেছে
        console.log("No active session found. Waiting for Supabase to parse URL hash...")
      }
    }
    checkSession()
  }, [])

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (newPassword.length < 6) {
      setErrorMsg('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('দুটি পাসওয়ার্ড মিলছে না! আবার চেক করুন।')
      return
    }

    setLoading(true)

    try {
      // Supabase এর updateUser ফাংশন কল করা
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      })

      if (error) throw error

      setSuccess(true)
      // পাসওয়ার্ড সফলভাবে চেঞ্জ হলে ২ সেকেন্ড পর ড্যাশবোর্ডে পাঠিয়ে দেবে
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error) {
      setErrorMsg('পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#050b08] text-gray-300 font-sans flex items-center justify-center py-12 px-4 sm:px-6 relative overflow-hidden">
      
      {/* Background Effects (লগইন পেজের মতো) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#050b08]/90 via-[#0a1c13]/80 to-[#050b08]/90"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#e76f51]/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-[#2d6a4f]/10 rounded-full blur-[80px] animate-pulse"></div>
      </div>

      <div className="max-w-md w-full bg-[#0a1c13]/80 backdrop-blur-2xl rounded-3xl shadow-[0_0_40px_rgba(231,111,81,0.1)] p-8 sm:p-10 relative z-10 border border-white/10">
        
        {success ? (
          // 🟢 সাকসেস স্টেট
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 border border-emerald-500/30">
              <i className="fa-solid fa-unlock-keyhole"></i>
            </div>
            <h2 className="text-2xl font-black text-white mb-3">পাসওয়ার্ড সফলভাবে সেট হয়েছে!</h2>
            <p className="text-sm text-gray-400 mb-6">
              আপনার অ্যাকাউন্টের পাসওয়ার্ড আপডেট করা হয়েছে। আপনাকে এখন স্বয়ংক্রিয়ভাবে ড্যাশবোর্ডে নিয়ে যাওয়া হবে...
            </p>
            <i className="fa-solid fa-circle-notch fa-spin text-[#e76f51] text-2xl"></i>
          </div>
        ) : (
          // 🟠 পাসওয়ার্ড সেট করার ফর্ম
          <div>
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-[#e76f51]/20 text-[#e76f51] rounded-full flex items-center justify-center text-2xl mx-auto mb-4 border border-[#e76f51]/30">
                <i className="fa-solid fa-key"></i>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">নতুন পাসওয়ার্ড সেট করুন</h2>
              <p className="text-xs sm:text-sm text-gray-400">
                নিরাপত্তার স্বার্থে এমন একটি পাসওয়ার্ড দিন যা সহজে অনুমান করা যায় না।
              </p>
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-6 text-sm text-center flex items-center justify-center gap-2">
                <i className="fa-solid fa-triangle-exclamation"></i> {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">নতুন পাসওয়ার্ড</label>
                <input 
                  type="password" 
                  required 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="অন্তত ৬ অক্ষরের পাসওয়ার্ড" 
                  className="w-full bg-black/50 border border-white/10 text-white rounded-xl block p-4 focus:border-[#e76f51] outline-none transition-all text-sm" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">পাসওয়ার্ড নিশ্চিত করুন</label>
                <input 
                  type="password" 
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="নতুন পাসওয়ার্ডটি আবার লিখুন" 
                  className="w-full bg-black/50 border border-white/10 text-white rounded-xl block p-4 focus:border-[#e76f51] outline-none transition-all text-sm" 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-[#e76f51] hover:bg-orange-600 text-white font-bold py-3.5 mt-2 rounded-xl transition-all shadow-[0_0_15px_rgba(231,111,81,0.3)] hover:-translate-y-1 flex justify-center items-center gap-2"
              >
                {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-shield-check"></i>}
                {loading ? 'আপডেট হচ্ছে...' : 'পাসওয়ার্ড আপডেট করুন'}
              </button>
            </form>

            <div className="mt-8 text-center border-t border-white/10 pt-6">
              <Link href="/login" className="text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                <i className="fa-solid fa-arrow-left"></i> লগইন পেজে ফিরে যান
              </Link>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
