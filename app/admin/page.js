'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import AOS from 'aos'
import 'aos/dist/aos.css'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingBookings: 0,
    pendingStories: 0,
    activeEvents: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    AOS.init({ once: true, offset: 50 })
    
    const fetchAdminStats = async () => {
      try {
        const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
        const { count: bookingCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        
        setStats({
          totalUsers: userCount || 0,
          pendingBookings: bookingCount || 0,
          pendingStories: 0, 
          activeEvents: 0
        })
      } catch (error) {
        console.error('Stats loading error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAdminStats()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b08] flex items-center justify-center">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#e76f51]"></i>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050b08] pb-12 px-4 sm:px-6 relative">
      <div className="max-w-7xl mx-auto">
        
        <div className="glass-panel rounded-3xl p-6 sm:p-8 flex justify-between items-center mb-8 bg-[#0a1c13] border border-white/10" data-aos="fade-up">
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                  <i className="fa-solid fa-shield-halved text-[#e76f51]"></i> অ্যাডমিন হাব
                </h1>
                <p className="text-sm text-gray-400 mt-1 font-medium">CUET AS সিস্টেম কন্ট্রোল সেন্টারে আপনাকে স্বাগতম।</p>
            </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10" data-aos="fade-up" data-aos-delay="50">
            <Link href="/admin/stories" className="bg-[#0a1c13] border border-yellow-500/30 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all hover:bg-yellow-500/10 hover:-translate-y-1">
                <i className="fa-solid fa-book-open text-2xl mb-2 text-yellow-500"></i>
                <span className="font-black text-sm text-white">গল্প রিভিউ</span>
                <span className="mt-2 bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-md text-[10px] font-bold border border-yellow-500/30">{stats.pendingStories}</span>
            </Link>

            <Link href="/admin/create-event" className="bg-[#0a1c13] border border-white/10 hover:border-[#e76f51]/50 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all hover:-translate-y-1">
                <i className="fa-solid fa-calendar-plus text-2xl mb-2 text-[#e76f51]"></i>
                <span className="font-black text-sm text-white">নতুন ইভেন্ট</span>
            </Link>

            <Link href="/admin/bookings" className="bg-[#0a1c13] border border-blue-500/30 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all hover:bg-blue-500/10 hover:-translate-y-1 relative">
                <i className="fa-solid fa-ticket text-2xl mb-2 text-blue-400"></i>
                <span className="font-black text-sm text-white">বুকিং রিকোয়েস্ট</span>
                <span className="mt-2 bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md text-[10px] font-bold border border-blue-500/30">{stats.pendingBookings}</span>
                {stats.pendingBookings > 0 && <div className="absolute top-0 right-0 w-2 h-full bg-blue-500 animate-pulse rounded-r-2xl"></div>}
            </Link>

            <Link href="/admin/events" className="bg-[#0a1c13] border border-emerald-500/30 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all hover:bg-emerald-500/10 hover:-translate-y-1">
                <i className="fa-solid fa-bolt text-2xl mb-2 text-emerald-400"></i>
                <span className="font-black text-sm text-white">অ্যাক্টিভ ইভেন্ট</span>
                <span className="mt-2 bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-500/30">{stats.activeEvents}</span>
            </Link>
        </div>

      </div>
    </div>
  )
}
