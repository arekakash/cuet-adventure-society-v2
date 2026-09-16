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
  
  // 🔴 মোবাইলের জন্য সাইডবার স্টেট
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    AOS.init({ once: true, duration: 800 })
    fetchAdminStats()
  }, [])

  const fetchAdminStats = async () => {
    try {
      const { count: pendingCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      const { count: claimCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'claim_pending')
      const { count: pendingStoryCount } = await supabase.from('stories').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      const { count: activeEventCount } = await supabase.from('events').select('*', { count: 'exact', head: true }).is('deleted_at', null)
      const { count: trashCount } = await supabase.from('events').select('*', { count: 'exact', head: true }).not('deleted_at', 'is', null)
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
    <div className="min-h-screen bg-[#050b08] text-gray-300 font-sans selection:bg-[#e76f51] selection:text-white flex flex-col lg:flex-row">
      
      {/* 🔴 MOBILE HEADER (শুধুমাত্র মোবাইলে দেখাবে) */}
      <div className="lg:hidden flex items-center justify-between bg-[#0a1c13] border-b border-white/5 p-4 sticky top-0 z-30">
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <i className="fa-solid fa-shield-halved text-[#e76f51]"></i> CUET AS
        </h1>
        <button onClick={() => setIsSidebarOpen(true)} className="text-white text-2xl hover:text-[#e76f51] transition-colors">
          <i className="fa-solid fa-bars"></i>
        </button>
      </div>

      {/* 🔴 MOBILE OVERLAY (সাইডবার ওপেন থাকলে পেছনের ব্ল্যাক ওভারলে) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm" 
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* 🟢 RESPONSIVE SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0a1c13] border-r border-white/5 flex flex-col transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 lg:p-8 border-b border-white/5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <i className="fa-solid fa-shield-halved text-[#e76f51]"></i> CUET AS
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-2 ml-8">Command Center</p>
          </div>
          {/* মোবাইলে সাইডবার ক্লোজ বাটন */}
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white text-2xl">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-4">Main Menu</p>
          
          <Link href="/admin" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-[#e76f51]/20 to-transparent text-white font-bold border-l-2 border-[#e76f51]">
            <i className="fa-solid fa-border-all w-5 text-center text-[#e76f51]"></i> ড্যাশবোর্ড ওভারভিউ
          </Link>
          
          <Link href="/admin/bookings" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all font-medium group">
            <i className="fa-solid fa-ticket w-5 text-center group-hover:text-blue-400 transition-colors"></i> বুকিং ও ক্লেইম
            {(stats.pendingBookings > 0 || stats.pendingClaims > 0) && (
              <span className="ml-auto bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{stats.pendingBookings + stats.pendingClaims}</span>
            )}
          </Link>

          <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-8">Event Management</p>
          
          <Link href="/admin/create-event" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all font-medium group">
            <i className="fa-solid fa-calendar-plus w-5 text-center group-hover:text-emerald-400 transition-colors"></i> নতুন ইভেন্ট তৈরি
          </Link>
          
          <Link href="/admin/events" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all font-medium group">
            <i className="fa-solid fa-bolt w-5 text-center group-hover:text-yellow-400 transition-colors"></i> অ্যাক্টিভ ইভেন্ট লিস্ট
          </Link>

          <Link href="/admin/trash" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all font-medium group">
            <i className="fa-solid fa-trash-can w-5 text-center group-hover:text-red-400 transition-colors"></i> ট্র্যাশ বিন
            {stats.trashedEvents > 0 && <span className="ml-auto bg-red-500/20 text-red-400 text-[10px] font-black px-2 py-0.5 rounded-full">{stats.trashedEvents}</span>}
          </Link>

          <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-8">Community & Content</p>

          <Link href="/admin/stories" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all font-medium group">
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

      {/* 🟢 MAIN CONTENT AREA */}
      <main className="flex-1 lg:ml-72 p-5 sm:p-10 relative min-h-screen">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-[#e76f51]/5 rounded-full blur-[80px] sm:blur-[120px] pointer-events-none"></div>

        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-8 border-b border-white/5 pb-6 gap-4" data-aos="fade-down">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">স্বাগতম, সেন্ট্রাল কমান্ড!</h2>
            <p className="text-xs sm:text-sm text-gray-500">এখান থেকে পুরো সিস্টেমের উপর নজর রাখুন</p>
          </div>
          <div className="inline-block bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] self-start sm:self-auto">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
               Admin Access
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10" data-aos="fade-up">
            
            <div className="bg-[#0a1c13] border border-white/5 p-5 sm:p-6 rounded-3xl relative overflow-hidden group hover:border-blue-500/30 transition-colors shadow-lg">
              <div className="absolute -right-4 -top-4 sm:-right-6 sm:-top-6 text-6xl sm:text-7xl text-white/5 group-hover:text-blue-500/10 transition-colors"><i className="fa-solid fa-ticket"></i></div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">পেমেন্ট পেন্ডিং</p>
              <div className="flex items-end gap-3">
                <h3 className="text-4xl lg:text-5xl font-black text-white">{stats.pendingBookings}</h3>
              </div>
              <Link href="/admin/bookings" className="inline-block mt-4 text-[10px] font-bold text-blue-400 hover:text-white transition-colors relative z-10">যাচাই করুন <i className="fa-solid fa-arrow-right ml-1"></i></Link>
            </div>

            <div className="bg-[#0a1c13] border border-white/5 p-5 sm:p-6 rounded-3xl relative overflow-hidden group hover:border-yellow-500/30 transition-colors shadow-lg">
              <div className="absolute -right-4 -top-4 sm:-right-6 sm:-top-6 text-6xl sm:text-7xl text-white/5 group-hover:text-yellow-500/10 transition-colors"><i className="fa-solid fa-hand-sparkles"></i></div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">অ্যাটেনডেন্স ক্লেইম</p>
              <div className="flex items-end gap-3">
                <h3 className="text-4xl lg:text-5xl font-black text-white">{stats.pendingClaims}</h3>
              </div>
              <Link href="/admin/bookings" className="inline-block mt-4 text-[10px] font-bold text-yellow-500 hover:text-white transition-colors relative z-10">অ্যাপ্রুভ করুন <i className="fa-solid fa-arrow-right ml-1"></i></Link>
            </div>

            <div className="bg-[#0a1c13] border border-white/5 p-5 sm:p-6 rounded-3xl relative overflow-hidden group hover:border-orange-400/30 transition-colors shadow-lg">
              <div className="absolute -right-4 -top-4 sm:-right-6 sm:-top-6 text-6xl sm:text-7xl text-white/5 group-hover:text-orange-400/10 transition-colors"><i className="fa-solid fa-book-open"></i></div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">স্টোরি পেন্ডিং</p>
              <div className="flex items-end gap-3">
                <h3 className="text-4xl lg:text-5xl font-black text-white">{stats.pendingStories}</h3>
              </div>
              <Link href="/admin/stories" className="inline-block mt-4 text-[10px] font-bold text-orange-400 hover:text-white transition-colors relative z-10">রিভিউ করুন <i className="fa-solid fa-arrow-right ml-1"></i></Link>
            </div>

            <div className="bg-[#0a1c13] border border-white/5 p-5 sm:p-6 rounded-3xl relative overflow-hidden group hover:border-emerald-500/30 transition-colors shadow-lg">
              <div className="absolute -right-4 -top-4 sm:-right-6 sm:-top-6 text-6xl sm:text-7xl text-white/5 group-hover:text-emerald-500/10 transition-colors"><i className="fa-solid fa-bolt"></i></div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">অ্যাক্টিভ ইভেন্ট</p>
              <div className="flex items-end gap-3">
                <h3 className="text-4xl lg:text-5xl font-black text-white">{stats.activeEvents}</h3>
              </div>
              <Link href="/admin/events" className="inline-block mt-4 text-[10px] font-bold text-emerald-400 hover:text-white transition-colors relative z-10">লিস্ট দেখুন <i className="fa-solid fa-arrow-right ml-1"></i></Link>
            </div>

        </div>
      </main>
    </div>
  )
}
