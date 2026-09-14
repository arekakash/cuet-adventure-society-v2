'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // ফর্মের স্টেট (তোমার আগের সব ফিল্ড যুক্ত করা হয়েছে)
  const [formData, setFormData] = useState({
    fullName: '', studentId: '', email: '', phone: '',
    department: '', batch: '', gender: '', bloodGroup: '',
    hall: '', tshirtSize: '', emergencyContact: '', emergencyRelation: '',
    swimmingSkill: '', hasBicycle: '', experienceLevel: '',
    fbLink: '', instaLink: '', password: '', confirmPassword: ''
  })

  // বছর জেনারেট করার লজিক
  const years = Array.from({ length: 83 }, (_, i) => 2050 - i)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      alert('পাসওয়ার্ড দুটি মিলছে না! দয়া করে আবার চেক করুন।')
      return
    }
    if (formData.password.length < 6) {
      alert('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।')
      return
    }

    setLoading(true)
    try {
      // Supabase Auth-এ সাইন আপ
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })
      if (authError) throw authError

      const user = authData.user
      if (user) {
        // Dataabase-এ বিস্তারিত তথ্য সেভ করা
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: user.id,
            full_name: formData.fullName,
            email: formData.email,
            department: formData.department.toUpperCase(),
            batch: formData.batch,
            blood_group: formData.bloodGroup,
            role: 'explorer'
          }
        ])
        if (profileError) throw profileError

        alert('অ্যাডভেঞ্চার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!')
        router.push('/dashboard')
      }
    } catch (error) {
      alert('সমস্যা হয়েছে: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#050b08] text-gray-300 font-sans flex md:items-center justify-center py-12 px-4 sm:px-6 relative overflow-x-hidden">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#050b08]/90 via-[#0a1c13]/80 to-[#050b08]/90"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#e76f51]/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#2d6a4f]/10 rounded-full blur-[80px] animate-pulse"></div>
      </div>

      {/* Main Glass Container */}
      <div className="max-w-6xl w-full bg-[#0a1c13]/70 backdrop-blur-xl rounded-[2rem] shadow-[0_0_20px_rgba(231,111,81,0.1)] overflow-hidden flex flex-col md:flex-row relative z-10 border border-white/10">
        
        {/* Left Side: Hero */}
        <div className="w-full md:w-5/12 bg-black/40 p-10 lg:p-14 flex flex-col justify-center border-r border-white/5">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-[#e76f51] transition-colors bg-white/5 px-4 py-2 rounded-full text-xs font-bold uppercase border border-white/10 w-max mb-12">
            ← হোমপেজে ফিরে যান
          </Link>
          <div className="mb-8">
            <span className="text-6xl">🔥</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-5 text-white">
            অজানার পথে <br/><span className="text-[#e76f51]">প্রথম পা</span>
          </h2>
          <p className="text-gray-400 text-sm border-l-2 border-[#e76f51] pl-4">
            একটি প্রোফাইল, অসংখ্য ট্রেইল। ক্লাবের ইভেন্ট বুকিং, ট্রেইল হিস্ট্রি এবং সেফটি ইনডেক্স ম্যানেজ করতে আজই আপনার অ্যাডভেঞ্চার আইডি তৈরি করুন।
          </p>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-7/12 p-8 sm:p-12 lg:p-16">
          <div className="mb-8 border-b border-white/10 pb-6">
            <h3 className="text-2xl lg:text-3xl font-black text-white mb-2">অ্যাডভেঞ্চার অ্যাকাউন্ট তৈরি করুন</h3>
            <p className="text-sm text-gray-400">
              ইতোমধ্যে কি অ্যাকাউন্ট আছে? <Link href="/login" className="text-[#e76f51] font-bold hover:text-white transition-colors border-b border-transparent hover:border-white">এখানে লগইন করুন</Link>
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            {/* Row 1: Name & ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">আপনার নাম *</label>
                <input type="text" id="fullName" required value={formData.fullName} onChange={handleChange} placeholder="Full Name" className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 focus:border-[#e76f51] focus:ring-1 focus:ring-[#e76f51] outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">স্টুডেন্ট আইডি *</label>
                <input type="text" id="studentId" required value={formData.studentId} onChange={handleChange} placeholder="e.g. 2101001" className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 focus:border-[#e76f51] focus:ring-1 focus:ring-[#e76f51] outline-none transition-all" />
              </div>
            </div>

            {/* Row 2: Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">ইমেইল অ্যাড্রেস *</label>
                <input type="email" id="email" required value={formData.email} onChange={handleChange} placeholder="example@cuet.ac.bd" className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 focus:border-[#e76f51] focus:ring-1 focus:ring-[#e76f51] outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">নিজের ফোন নম্বর *</label>
                <input type="tel" id="phone" required value={formData.phone} onChange={handleChange} placeholder="01XXXXXXXXX" className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 focus:border-[#e76f51] focus:ring-1 focus:ring-[#e76f51] outline-none transition-all" />
              </div>
            </div>

            {/* Row 3: Dept & Batch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">ডিপার্টমেন্ট *</label>
                <input type="text" id="department" required value={formData.department} onChange={handleChange} placeholder="e.g. ME, CE..." className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 focus:border-[#e76f51] focus:ring-1 focus:ring-[#e76f51] outline-none transition-all uppercase" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">ব্যাচ (সাল) *</label>
                <select id="batch" required value={formData.batch} onChange={handleChange} className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 focus:border-[#e76f51] outline-none appearance-none">
                  <option value="" disabled>নির্বাচন করুন</option>
                  {years.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
            </div>

            {/* Row 4: Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-white/10 pt-5 mt-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">পাসওয়ার্ড *</label>
                <input type="password" id="password" required value={formData.password} onChange={handleChange} placeholder="••••••••" className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 focus:border-[#e76f51] focus:ring-1 focus:ring-[#e76f51] outline-none transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">পুনরায় পাসওয়ার্ড দিন *</label>
                <input type="password" id="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 focus:border-[#e76f51] focus:ring-1 focus:ring-[#e76f51] outline-none transition-all" />
              </div>
            </div>

            <div className="pt-6">
              <button type="submit" disabled={loading} className="w-full bg-[#e76f51] hover:bg-orange-600 text-white font-black text-lg py-4 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(231,111,81,0.4)] hover:-translate-y-1 flex justify-center items-center gap-2">
                {loading ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'অ্যাডভেঞ্চার অ্যাকাউন্ট তৈরি করুন'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </main>
  )
}
