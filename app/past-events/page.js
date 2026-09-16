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
  const [isAdmin, setIsAdmin] = useState(false)
  
  // ফিল্টারিং স্টেট
  const [filters, setFilters] = useState({ category: 'All', year: 'All' })
  const [availableYears, setAvailableYears] = useState([])

  // গ্লোবাল স্ট্যাটস
  const [globalStats, setGlobalStats] = useState({
    totalExpeditions: 0,
    totalExplorers: 0,
    totalDistance: 0
  })

  // 3-Step Delete Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteStep, setDeleteStep] = useState(1)
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingEventId, setDeletingEventId] = useState(null)

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 })
    fetchPastEvents()
    checkAdminAccess()
  }, [])

  // ইউজারের রোল চেক করার ফাংশন
  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      
      if (data && data.role === 'admin') {
        setIsAdmin(true)
      }
    }
  }

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

  // ট্র্যাশে পাঠানোর লজিক
  const handleMoveToTrash = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingEventId)

      if (error) throw error

      alert('অতীতের ইভেন্টটি সফলভাবে ট্র্যাশ বিনে পাঠানো হয়েছে।')
      
      // লোকাল স্টেট আপডেট করে সাথে সাথেই কার্ডটি গায়েব করে দেওয়া
      setEvents(events.filter(ev => ev.id !== deletingEventId))
      setFilteredEvents(filteredEvents.filter(ev => ev.id !== deletingEventId))
      setIsDeleteModalOpen(false)
      
    } catch (error) {
      console.error(error)
      alert('সমস্যা হয়েছে: ' + error.message)
    }
  }

  // 🔴 ক্যাটাগরি অনুযায়ী ডায়নামিক আইকন সেট করার ফাংশন
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Trekking': return 'fa-solid fa-mountain'
      case 'Cycling': return 'fa-solid fa-bicycle'
      case 'Swimming': return 'fa-solid fa-person-swimming'
      case 'Camping': return 'fa-solid fa-campground'
      case 'Houseboat/Cruise': return 'fa-solid fa-ship'
      case 'Day Tour': return 'fa-solid fa-bus-simple'
      case 'Workshop': return 'fa-solid fa-chalkboard-user'
      case 'Expedition': return 'fa-solid fa-map-location-dot'
      default: return 'fa-solid fa-compass'
    }
  }

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
            
            {/* 🔴 আপডেট করা ড্রপডাউন ক্যাটাগরি */}
            <select 
              value={filters.category} 
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              className="bg-black/50 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#e76f51] cursor-pointer font-bold"
            >
              <option value="All">সব ক্যাটাগরি</option>
              <option value="Trekking">Trekking</option>
              <option value="Camping">Camping</option>
              <option value="Cycling">Cycling</option>
              <option value="Swimming">Swimming</option>
              <option value="Houseboat/Cruise">Houseboat/Cruise</option>
              <option value="Expedition">Expedition</option>
              <option value="Day Tour">Day Tour</option>
              <option value="Workshop">Workshop</option>
            </select>
            
            <select 
              value={filters.year} 
              onChange={(e) => setFilters({...filters, year: e.target.value})}
              className="bg-black/50 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[#e76f51] cursor-pointer font-bold"
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
                  <div className="absolute top-4 left-4 z-20 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg border border-emerald-400/50 flex items-center gap-1.5">
                    <i className="fa-solid fa-check-double"></i> Mission Accomplished
                  </div>

                  {/* 🔴 Category Badge with Icon */}
                  <div className="absolute top-4 right-4 z-20 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5">
                    <i className={getCategoryIcon(ev.category)}></i> {ev.category}
                  </div>

                  {/* অ্যাডমিন ডিলিট বাটন (শুধুমাত্র অ্যাডমিন দেখবে) */}
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeletingEventId(ev.id);
                        setIsDeleteModalOpen(true);
                        setDeleteStep(1);
                        setIsCheckboxChecked(false);
                        setDeleteConfirmText('');
                      }}
                      className="absolute top-14 right-4 z-30 bg-red-500/90 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg border border-red-400/50"
                      title="ট্র্যাশে পাঠান"
                    >
                      <i className="fa-solid fa-trash-can text-xs"></i>
                    </button>
                  )}
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
                      {/* 🔴 ডায়নামিক স্ট্যাটস আইকন */}
                      <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5 flex justify-center items-center gap-1">
                        <i className={ev.category === 'Cycling' ? 'fa-solid fa-bicycle' : ev.category === 'Swimming' ? 'fa-solid fa-person-swimming' : 'fa-solid fa-shoe-prints'}></i> 
                        দূরত্ব
                      </p>
                      <p className="font-black text-blue-400">{ev.stats_meta?.distance || 0} {ev.category === 'Swimming' ? 'm' : 'km'}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 🔴 3-STEP DELETE MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0a1c13] border border-red-500/30 rounded-3xl p-8 max-w-md w-full mx-auto relative shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            
            {/* Step 1: Extreme Warning */}
            {deleteStep === 1 && (
              <div className="text-center">
                <i className="fa-solid fa-triangle-exclamation text-5xl text-red-500 mb-4 animate-pulse"></i>
                <h3 className="text-2xl font-black text-white mb-2">চরম সতর্কতা!</h3>
                <p className="text-gray-400 text-sm mb-6">
                  আপনি অতীতের একটি সফল ইভেন্ট ডিলিট করতে যাচ্ছেন। এটি ট্র্যাশ বিনে জমা হবে এবং <span className="text-red-400 font-bold">৩০ দিন পর চিরতরে মুছে যাবে</span>। আপনি কি নিশ্চিত?
                </p>
                <div className="flex gap-4">
                  <button onClick={() => setIsDeleteModalOpen(false)} className="w-1/2 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-all">বাতিল করুন</button>
                  <button onClick={() => setDeleteStep(2)} className="w-1/2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/50 py-3 rounded-xl font-bold transition-all">পরবর্তী ধাপ</button>
                </div>
              </div>
            )}

            {/* Step 2: Checkbox Confirmation */}
            {deleteStep === 2 && (
              <div className="text-center">
                <i className="fa-solid fa-clipboard-check text-5xl text-orange-500 mb-4"></i>
                <h3 className="text-xl font-black text-white mb-4">দায়িত্ব স্বীকার</h3>
                <label className="flex items-start gap-3 text-left bg-black/40 p-4 rounded-xl border border-white/5 mb-6 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="mt-1 w-5 h-5 accent-red-500" 
                    checked={isCheckboxChecked}
                    onChange={(e) => setIsCheckboxChecked(e.target.checked)}
                  />
                  <span className="text-sm text-gray-300">আমি বুঝতে পারছি যে এই ইভেন্ট ডিলিট করলে ইউজারদের বুকিং হিস্ট্রি বা স্ট্যাটস প্রভাবিত হতে পারে। আমি নিজ দায়িত্বে এটি করছি।</span>
                </label>
                <div className="flex gap-4">
                  <button onClick={() => setDeleteStep(1)} className="w-1/2 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-all">পেছনে যান</button>
                  <button 
                    disabled={!isCheckboxChecked}
                    onClick={() => setDeleteStep(3)} 
                    className={`w-1/2 py-3 rounded-xl font-bold transition-all ${isCheckboxChecked ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-red-500/20 text-red-500/50 cursor-not-allowed'}`}
                  >পরবর্তী ধাপ</button>
                </div>
              </div>
            )}

            {/* Step 3: Manual Type & Final Delete */}
            {deleteStep === 3 && (
              <div className="text-center">
                <i className="fa-solid fa-skull-crossbones text-5xl text-red-600 mb-4"></i>
                <h3 className="text-xl font-black text-white mb-2">চূড়ান্ত পদক্ষেপ</h3>
                <p className="text-gray-400 text-xs mb-4">ট্র্যাশ বিনে পাঠাতে নিচের বক্সে ইংরেজিতে বড় হাতের অক্ষরে <span className="font-bold text-white select-none">DELETE</span> টাইপ করুন।</p>
                <input 
                  type="text" 
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE" 
                  className="w-full bg-black/40 border border-red-500/30 text-white text-center font-black tracking-widest rounded-xl p-4 focus:border-red-500 outline-none mb-6 uppercase"
                />
                <div className="flex gap-4">
                  <button onClick={() => setDeleteStep(2)} className="w-1/2 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-all">পেছনে যান</button>
                  <button 
                    disabled={deleteConfirmText !== 'DELETE'}
                    onClick={handleMoveToTrash} 
                    className={`w-1/2 py-3 rounded-xl font-black transition-all flex items-center justify-center gap-2 ${deleteConfirmText === 'DELETE' ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.6)]' : 'bg-red-500/20 text-red-500/50 cursor-not-allowed'}`}
                  >
                    <i className="fa-solid fa-trash-can"></i> ট্র্যাশে পাঠান
                  </button>
                </div>
              </div>
            )}

            {/* Close Button */}
            <button onClick={() => setIsDeleteModalOpen(false)} className="absolute -top-4 -right-4 w-10 h-10 bg-black border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
