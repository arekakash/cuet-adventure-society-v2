'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AOS from 'aos'
import 'aos/dist/aos.css'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    pendingBookings: 0,
    pendingClaims: 0,
    pendingStories: 0,
    activeEvents: 0,
    trashedEvents: 0,
    totalUsers: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    AOS.init({ once: true, duration: 800 })
    fetchAdminStats()
  }, [])

  const fetchAdminStats = async () => {
    try {
      // ১. পেন্ডিং বুকিং কাউন্ট
      const { count: pendingCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending')

      // ২. পেন্ডিং অ্যাটেনডেন্স ক্লেইম কাউন্ট
      const { count: claimCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'claim_pending')

      // ৩. পেন্ডিং স্টোরি কাউন্ট
      const { count: pendingStoryCount } = await supabase.from('stories').select('*', { count: 'exact', head: true }).eq('status', 'pending')

      // ৪. অ্যাক্টিভ ইভেন্ট কাউন্ট (যাদের deleted_at কলাম null)
      const { count: activeEventCount } = await supabase.from('events').select('*', { count: 'exact', head: true }).is('deleted_at', null)

      // ৫. ট্র্যাশ ইভেন্ট কাউন্ট (যাদের deleted_at null নয়)
      const { count: trashCount } = await supabase.from('events').select('*', { count: 'exact', head: true }).not('deleted_at', 'is', null)

      // ৬. টোটাল ইউজার কাউন্ট
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

      setStats({
        pendingBookings: pendingCount || 0,
        pendingClaims: claimCount || 0,
        pendingStories: pendingStoryCount || 0,
        activeEvents: activeEventCount || 0,
        trashedEvents: trashCount || 0,
        totalUsers: userCount || 0
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b08] flex items-center justify-center">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#e76f51]"></i>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050b08] text-gray-300 font-sans selection:bg-[#e76f51] selection:text-white">
      
      {/* 🔴 MOBILE & TABLET WARNING */}
      <div className="lg:hidden flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gradient-to-b from-[#0a1c13] to-[#050b08]">
        <div className="relative mb-6">
            <div className="absolute inset-0 bg-[#e76f51] blur-2xl opacity-20 rounded-full animate-pulse"></div>
            <i className="fa-solid fa-mobile-screen text-7xl text-[#e76f51] relative z-10 animate-bounce"></i>
            <i className="fa-solid fa-rotate right-0 bottom-0 absolute text-2xl text-white bg-black rounded-full p-1 z-20"></i>
        </div>
        <h2 className="text-2xl font-black text-white mb-3">স্ক্রিনটি রোটেট করুন</h2>
        <p className="text-gray-400 text-sm max-w-sm leading-relaxed mb-8">
          অ্যাডমিন প্যানেলটি অসংখ্য ডেটা এবং কন্ট্রোল সমৃদ্ধ, যা শুধুমাত্র ডেস্কটপ বা ল্যান্ডস্কেপ মোডে ব্যবহারযোগ্য। দয়া করে আপনার ফোনটি আড়াআড়ি (Landscape) করুন অথবা কম্পিউটার ব্যবহার করুন।
        </p>
        <Link href="/" className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-colors text-sm">
          <i className="fa-solid fa-arrow-left mr-2"></i> মূল ওয়েবসাইটে ফিরে যান
        </Link>
      </div>

      {/* 🟢 DESKTOP LAYOUT (Sidebar + Content) */}
      <div className="hidden lg:flex min-h-screen">
        
        {/* Sidebar */}
        <aside className="w-72 bg-[#0a1c13] border-r border-white/5 flex flex-col fixed h-screen z-20">
          <div className="p-8 border-b border-white/5">
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <i className="fa-solid fa-shield-halved text-[#e76f51]"></i> CUET AS
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-2 ml-8">Command Center</p>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
            <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-4">Main Menu</p>
            
            <Link href="/admin" className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-[#e76f51]/20 to-transparent text-white font-bold border-l-2 border-[#e76f51]">
              <i className="fa-solid fa-border-all w-5 text-center text-[#e76f51]"></i> ড্যাশবোর্ড ওভারভিউ
            </Link>
            
            <Link href="/admin/bookings" className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all font-medium group">
              <i className="fa-solid fa-ticket w-5 text-center group-hover:text-blue-400 transition-colors"></i> বুকিং ও ক্লেইম
              {(stats.pendingBookings > 0 || stats.pendingClaims > 0) && (
                <span className="ml-auto bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{stats.pendingBookings + stats.pendingClaims}</span>
              )}
            </Link>

            <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-8">Event Management</p>
            
            <Link href="/admin/create-event" className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all font-medium group">
              <i className="fa-solid fa-calendar-plus w-5 text-center group-hover:text-emerald-400 transition-colors"></i> নতুন ইভেন্ট তৈরি
            </Link>
            
            <Link href="/admin/events" className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all font-medium group">
              <i className="fa-solid fa-bolt w-5 text-center group-hover:text-yellow-400 transition-colors"></i> অ্যাক্টিভ ইভেন্ট লিস্ট
            </Link>

            <Link href="/admin/trash" className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all font-medium group">
              <i className="fa-solid fa-trash-can w-5 text-center group-hover:text-red-400 transition-colors"></i> ট্র্যাশ বিন
              {stats.trashedEvents > 0 && <span className="ml-auto bg-red-500/20 text-red-400 text-[10px] font-black px-2 py-0.5 rounded-full">{stats.trashedEvents}</span>}
            </Link>

            <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-8">Community & Content</p>

            <Link href="/admin/stories" className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all font-medium group">
              <i className="fa-solid fa-book-open w-5 text-center group-hover:text-yellow-400 transition-colors"></i> স্টোরি রিভিউ
              {stats.pendingStories > 0 && <span className="ml-auto bg-yellow-500/20 text-yellow-500 text-[10px] font-black px-2 py-0.5 rounded-full">{stats.pendingStories}</span>}
            </Link>
          </nav>

          <div className="p-4 border-t border-white/5">
            <Link href="/" className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all text-sm font-bold">
              <i className="fa-solid fa-arrow-right-from-bracket rotate-180"></i> ক্লাবের ওয়েবসাইটে যান
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 ml-72 p-10 relative h-screen overflow-y-auto">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#e76f51]/5 rounded-full blur-[120px] pointer-events-none"></div>

          <header className="flex justify-between items-center mb-10 border-b border-white/5 pb-6" data-aos="fade-down">
            <div>
              <h2 className="text-3xl font-black text-white mb-1">স্বাগতম, সেন্ট্রাল কমান্ড!</h2>
              <p className="text-sm text-gray-500">এখান থেকে পুরো সিস্টেমের উপর নজর রাখুন</p>
            </div>
          </header>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10" data-aos="fade-up">
              
              <div className="bg-[#0a1c13] border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                <div className="absolute -right-6 -top-6 text-7xl text-white/5 group-hover:text-blue-500/10 transition-colors"><i className="fa-solid fa-ticket"></i></div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">পেমেন্ট পেন্ডিং</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-4xl lg:text-5xl font-black text-white">{stats.pendingBookings}</h3>
                </div>
                <Link href="/admin/bookings" className="inline-block mt-4 text-[10px] font-bold text-blue-400 hover:text-white transition-colors">যাচাই করুন <i className="fa-solid fa-arrow-right ml-1"></i></Link>
              </div>

              <div className="bg-[#0a1c13] border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-yellow-500/30 transition-colors">
                <div className="absolute -right-6 -top-6 text-7xl text-white/5 group-hover:text-yellow-500/10 transition-colors"><i className="fa-solid fa-hand-sparkles"></i></div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">অ্যাটেনডেন্স ক্লেইম</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-4xl lg:text-5xl font-black text-white">{stats.pendingClaims}</h3>
                </div>
                <Link href="/admin/bookings" className="inline-block mt-4 text-[10px] font-bold text-yellow-500 hover:text-white transition-colors">অ্যাপ্রুভ করুন <i className="fa-solid fa-arrow-right ml-1"></i></Link>
              </div>

              <div className="bg-[#0a1c13] border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-orange-400/30 transition-colors">
                <div className="absolute -right-6 -top-6 text-7xl text-white/5 group-hover:text-orange-400/10 transition-colors"><i className="fa-solid fa-book-open"></i></div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">স্টোরি পেন্ডিং</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-4xl lg:text-5xl font-black text-white">{stats.pendingStories}</h3>
                </div>
                <Link href="/admin/stories" className="inline-block mt-4 text-[10px] font-bold text-orange-400 hover:text-white transition-colors">রিভিউ করুন <i className="fa-solid fa-arrow-right ml-1"></i></Link>
              </div>

              <div className="bg-[#0a1c13] border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                <div className="absolute -right-6 -top-6 text-7xl text-white/5 group-hover:text-emerald-500/10 transition-colors"><i className="fa-solid fa-bolt"></i></div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">অ্যাক্টিভ ইভেন্ট</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-4xl lg:text-5xl font-black text-white">{stats.activeEvents}</h3>
                </div>
                <Link href="/admin/events" className="inline-block mt-4 text-[10px] font-bold text-emerald-400 hover:text-white transition-colors">লিস্ট দেখুন <i className="fa-solid fa-arrow-right ml-1"></i></Link>
              </div>

          </div>
        </main>
      </div>
    </div>
  )
}
