'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import AOS from 'aos'
import 'aos/dist/aos.css'

export default function PastEventsPage() {
  const [events, setEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [loading, setLoading] = useState(true)
  
  // ফিল্টারিং স্টেট
  const [filters, setFilters] = useState({ category: 'All', year: 'All' })
  const [availableYears, setAvailableYears] = useState([])

  // গ্লোবাল স্ট্যাটস
  const [globalStats, setGlobalStats] = useState({
    totalExpeditions: 0,
    totalExplorers: 0,
    totalDistance: 0
  })

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 })
    fetchPastEvents()
  }, [])

  const fetchPastEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'completed')
        .is('deleted_at', null)
        .order('start_date', { ascending: false })

      if (error) throw error

      if (data) {
        setEvents(data)
        setFilteredEvents(data)

        // বছরগুলো বের করা ফিল্টারের জন্য
        const years = [...new Set(data.map(ev => new Date(ev.start_date).getFullYear()))].sort((a, b) => b - a)
        setAvailableYears(years)

        // গ্লোবাল স্ট্যাটস ক্যালকুলেশন
        const totalExpeditions = data.length
        const totalExplorers = data.reduce((sum, ev) => sum + (ev.booked_seats || 0), 0)
        const totalDistance = data.reduce((sum, ev) => sum + (ev.stats_meta?.distance || 0), 0)

        setGlobalStats({ totalExpeditions, totalExplorers, totalDistance })
      }
    } catch (error) {
      console.error("Error fetching past events:", error.message)
    } finally {
      setLoading(false)
    }
  }

  // ফিল্টার লজিক
  useEffect(() => {
    let result = events
    if (filters.category !== 'All') {
      result = result.filter(ev => ev.category === filters.category)
    }
    if (filters.year !== 'All') {
      result = result.filter(ev => new Date(ev.start_date).getFullYear().toString() === filters.year.toString())
    }
    setFilteredEvents(result)
  }, [filters, events])

  return (
    <div className="min-h-screen bg-[#050b08] text-gray-300 font-sans relative overflow-x-hidden pt-24 pb-16">
      
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#e76f51]/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#2d6a4f]/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-12" data-aos="fade-down">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-[#e76f51] transition-colors bg-white/5 px-4 py-2 rounded-full text-xs font-bold uppercase border border-white/10 mb-6">
            <i className="fa-solid fa-arrow-left"></i> হোমপেজে ফিরে যান
          </Link>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4 drop-shadow-lg">
            এক্সপেডিশন <span className="text-[#e76f51]">আর্কাইভ</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base">
            আমাদের অতীত অভিযান, ট্রেকিং এবং ক্যাম্পিংয়ের এক বিশাল সংগ্রহশালা। যেখানে মিশে আছে অসংখ্য অভিযাত্রীর পদচিহ্ন আর অমূল্য স্মৃতি।
          </p>
        </div>

        {/* Global Stats Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12" data-aos="fade-up" data-aos-delay="100">
          <div className="bg-[#0a1c13]/80 backdrop-blur-md border border-[#2d6a4f]/30 p-6 rounded-3xl flex items-center justify-center gap-5 shadow-lg">
            <div className="w-14 h-14 rounded-full bg-[#2d6a4f]/20 flex items-center justify-center text-[#2d6a4f] text-2xl">
              <i className="fa-solid fa-route"></i>
            </div>
            <div>
              <p className="text-3xl font-black text-white">{globalStats.totalExpeditions}</p>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">সফল অভিযান</p>
            </div>
          </div>
          <div className="bg-[#0a1c13]/80 backdrop-blur-md border border-[#e76f51]/30 p-6 rounded-3xl flex items-center justify-center gap-5 shadow-lg">
            <div className="w-14 h-14 rounded-full bg-[#e76f51]/20 flex items-center justify-center text-[#e76f51] text-2xl">
              <i className="fa-solid fa-users-viewfinder"></i>
            </div>
            <div>
              <p className="text-3xl font-black text-white">{globalStats.totalExplorers}</p>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">অংশগ্রহণকারী অভিযাত্রী</p>
            </div>
          </div>
          <div className="bg-[#0a1c13]/80 backdrop-blur-md border border-blue-500/30 p-6 rounded-3xl flex items-center justify-center gap-5 shadow-lg">
            <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-2xl">
              <i className="fa-solid fa-shoe-prints"></i>
            </div>
            <div>
              <p className="text-3xl font-black text-white">{globalStats.totalDistance} <span className="text-lg">km+</span></p>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">মোট হাঁটার দূরত্ব</p>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white/5 border border-white/10 p-4 rounded-2xl mb-10 gap-4 backdrop-blur-sm" data-aos="fade-up" data-aos-delay="200">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <i className="fa-solid fa-filter text-gray-400"></i>
            <span className="text-sm font-bold text-white tracking-widest uppercase">ফিল্টার:</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <select 
              value={filters.category} 
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              className="bg-black/50 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#e76f51] cursor-pointer"
            >
              <option value="All">সব ক্যাটাগরি</option>
              <option value="Trekking">Trekking</option>
              <option value="Camping">Camping</option>
              <option value="Houseboat/Cruise">Houseboat/Cruise</option>
              <option value="Day Tour">Day Tour</option>
            </select>
            
            <select 
              value={filters.year} 
              onChange={(e) => setFilters({...filters, year: e.target.value})}
              className="bg-black/50 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#e76f51] cursor-pointer"
            >
              <option value="All">সব বছর</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <i className="fa-solid fa-compass fa-spin text-5xl text-[#e76f51]"></i>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-20 text-center bg-white/5 border border-white/10 rounded-3xl" data-aos="zoom-in">
            <i className="fa-regular fa-folder-open text-6xl text-gray-600 mb-4"></i>
            <h3 className="text-xl font-bold text-gray-400">কোনো আর্কাইভ পাওয়া যায়নি</h3>
            <p className="text-sm text-gray-500 mt-2">অন্য কোনো ক্যাটাগরি বা বছর নির্বাচন করে দেখুন।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredEvents.map((ev, index) => (
              <Link href={`/event-details?id=${ev.id}`} key={ev.id} className="group relative rounded-3xl overflow-hidden bg-[#0a1c13] border border-white/10 hover:border-[#e76f51]/50 transition-all duration-500 hover:-translate-y-2 shadow-lg block" data-aos="fade-up" data-aos-delay={index * 100}>
                
                {/* Cover Image */}
                <div className="relative h-56 w-full overflow-hidden">
                  <img src={ev.cover_photo} alt={ev.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a1c13] via-transparent to-transparent"></div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 left-4 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg border border-emerald-400/50 flex items-center gap-1.5">
                    <i className="fa-solid fa-check-double"></i> Mission Accomplished
                  </div>

                  {/* Category Badge */}
                  <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/20">
                    {ev.category}
                  </div>
                </div>

                {/* Event Info */}
                <div className="p-6 relative">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-[#e76f51] mb-2 uppercase tracking-widest">
                    <i className="fa-solid fa-calendar"></i>
                    <span>{new Date(ev.start_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
                  </div>
                  
                  <h3 className="text-xl font-black text-white mb-2 line-clamp-1 group-hover:text-[#e76f51] transition-colors">{ev.title}</h3>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2"><i className="fa-solid fa-map-location-dot mr-1"></i> {ev.destination}</p>
                  
                  {/* Stats Mini Grid */}
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10">
                    <div className="bg-white/5 p-2 rounded-xl text-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">অভিযাত্রী</p>
                      <p className="font-black text-gray-200">{ev.booked_seats || 0} জন</p>
                    </div>
                    <div className="bg-white/5 p-2 rounded-xl text-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">দূরত্ব</p>
                      <p className="font-black text-blue-400">{ev.stats_meta?.distance || 0} km</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
