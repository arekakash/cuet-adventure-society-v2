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
  
  // 🔴 আপডেটেড ফিল্টারিং স্টেট (Sort & Month যুক্ত করা হয়েছে)
  const [filters, setFilters] = useState({ 
      category: 'All', 
      year: 'All', 
      month: 'All', 
      sortOrder: 'desc' // 'desc' = Newest First, 'asc' = Oldest First
  })

  // 🔴 2014 থেকে 2100 পর্যন্ত সাল
  const allYears = Array.from({ length: 2100 - 2014 + 1 }, (_, i) => 2100 - i)
  
  const months = [
      { value: '0', label: 'জানুয়ারি' }, { value: '1', label: 'ফেব্রুয়ারি' }, { value: '2', label: 'মার্চ' },
      { value: '3', label: 'এপ্রিল' }, { value: '4', label: 'মে' }, { value: '5', label: 'জুন' },
      { value: '6', label: 'জুলাই' }, { value: '7', label: 'আগস্ট' }, { value: '8', label: 'সেপ্টেম্বর' },
      { value: '9', label: 'অক্টোবর' }, { value: '10', label: 'নভেম্বর' }, { value: '11', label: 'ডিসেম্বর' }
  ]

  const [globalStats, setGlobalStats] = useState({
    totalExpeditions: 0,
    totalExplorers: 0,
    totalDistance: 0
  })

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteStep, setDeleteStep] = useState(1)
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingEventId, setDeletingEventId] = useState(null)
  const [eventToDelete, setEventToDelete] = useState(null) // 🔴 ডিলিট করার সময় ইভেন্টের ডেটা ধরে রাখার জন্য

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 })
    fetchPastEvents()
    checkAdminAccess()
  }, [])

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
        .order('start_date', { ascending: false }) // Default DB sort

      if (error) throw error

      if (data) {
        setEvents(data)
        setFilteredEvents(data)

        const totalExpeditions = data.length
        const totalExplorers = data.reduce((sum, ev) => {
  // যদি booked_seats এর মান 0 এর চেয়ে বেশি থাকে, তবে সেটি ব্যবহার করবে। 
  // না থাকলে total_seats থেকে available_seats বিয়োগ করে অভিযাত্রী সংখ্যা বের করবে।
  const participants = ev.booked_seats > 0 
    ? ev.booked_seats 
    : Math.max(0, (ev.total_seats || 0) - (ev.available_seats || 0));
    
  return sum + participants;
}, 0);

        const totalDistance = data.reduce((sum, ev) => sum + (ev.stats_meta?.distance || 0), 0)

        setGlobalStats({ totalExpeditions, totalExplorers, totalDistance })
      }
    } catch (error) {
      console.error("Error fetching past events:", error.message)
    } finally {
      setLoading(false)
    }
  }

  // 🔴 অ্যাডভান্সড ফিল্টার ও সর্টিং লজিক
  useEffect(() => {
    let result = [...events] // Clone array for sorting mutation

    // ১. Category Filter
    if (filters.category !== 'All') {
      result = result.filter(ev => ev.category === filters.category)
    }
    
    // ২. Year Filter
    if (filters.year !== 'All') {
      result = result.filter(ev => new Date(ev.start_date).getFullYear().toString() === filters.year.toString())
    }

    // ৩. Month Filter
    if (filters.month !== 'All') {
      result = result.filter(ev => new Date(ev.start_date).getMonth().toString() === filters.month.toString())
    }

    // 8. Sorting Logic
    result.sort((a, b) => {
        const dateA = new Date(a.start_date).getTime()
        const dateB = new Date(b.start_date).getTime()
        return filters.sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

    setFilteredEvents(result)
  }, [filters, events])

  // 🔴 সংশোধিত ડিলিট লজিক (Rollback সহ)
  const handleMoveToTrash = async () => {
    try {
      // ১. প্রথমে এই ইভেন্টের বুকিংগুলো খুঁজে বের করো
      const { data: bookings } = await supabase
        .from('bookings')
        .select('user_id')
        .eq('event_id', deletingEventId)
        .in('status', ['approved', 'free_booking'])

      // ২. যদি বুকিং থাকে, তবে তাদের পয়েন্ট মাইনাস করো (Rollback)
      if (bookings && bookings.length > 0 && eventToDelete) {
        const statsMeta = eventToDelete.stats_meta || {}
        const category = (eventToDelete.category || "").toLowerCase().trim()
        const distanceToSubtract = Number(statsMeta.distance) || 0
        const iqToSubtract = Number(statsMeta.survival_iq) || 0
        const treksCount = Number(statsMeta.treks) || 1

        const rollbackPromises = bookings.map(async (b) => {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('survival_iq, total_events, total_treks, total_distance, total_rides, cycling_distance, total_swims, swimming_distance, total_runs, running_distance')
            .eq('id', b.user_id)
            .single()
          
          if (userProfile) {
            const updates = {
              survival_iq: Math.max(0, (Number(userProfile.survival_iq) || 0) - iqToSubtract),
              total_events: Math.max(0, (Number(userProfile.total_events) || 0) - 1)
            }

            if (category.includes('trekking') || category.includes('camping') || category.includes('day tour')) {
              updates.total_treks = Math.max(0, (Number(userProfile.total_treks) || 0) - treksCount)
              updates.total_distance = Math.max(0, (Number(userProfile.total_distance) || 0) - distanceToSubtract)
            } else if (category.includes('cycling')) {
              updates.total_rides = Math.max(0, (Number(userProfile.total_rides) || 0) - treksCount)
              updates.cycling_distance = Math.max(0, (Number(userProfile.cycling_distance) || 0) - distanceToSubtract)
            } else if (category.includes('swimming') || category.includes('houseboat') || category.includes('cruise')) {
              updates.total_swims = Math.max(0, (Number(userProfile.total_swims) || 0) - treksCount)
              updates.swimming_distance = Math.max(0, (Number(userProfile.swimming_distance) || 0) - distanceToSubtract)
            } else if (category.includes('running')) {
              updates.total_runs = Math.max(0, (Number(userProfile.total_runs) || 0) - treksCount)
              updates.running_distance = Math.max(0, (Number(userProfile.running_distance) || 0) - distanceToSubtract)
            } else {
              updates.total_treks = Math.max(0, (Number(userProfile.total_treks) || 0) - treksCount)
            }

            await supabase.from('profiles').update(updates).eq('id', b.user_id)
          }
        })
        
        await Promise.all(rollbackPromises)
      }

      // ৩. এরপর ইভেন্টটিকে ট্র্যাশ বিনে পাঠাও
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingEventId)

      if (error) throw error

      alert('অতীতের ইভেন্টটি সফলভাবে ট্র্যাশ বিনে পাঠানো হয়েছে এবং ইউজারদের পয়েন্ট রিভার্স করা হয়েছে!')
      
      setEvents(events.filter(ev => ev.id !== deletingEventId))
      setFilteredEvents(filteredEvents.filter(ev => ev.id !== deletingEventId))
      setIsDeleteModalOpen(false)
      
    } catch (error) {
      console.error(error)
      alert('সমস্যা হয়েছে: ' + error.message)
    }
  }

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
    <div className="min-h-screen bg-[#050b08] text-gray-300 font-sans relative overflow-x-hidden pt-20 sm:pt-24 pb-16">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-[#e76f51]/5 rounded-full blur-[100px] sm:blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-64 sm:w-96 h-64 sm:h-96 bg-[#2d6a4f]/5 rounded-full blur-[100px] sm:blur-[120px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-6 relative z-10">
        
        <div className="text-center mb-8 sm:mb-12" data-aos="fade-down">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-[#e76f51] transition-colors bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold uppercase border border-white/10 mb-4 sm:mb-6">
            <i className="fa-solid fa-arrow-left"></i> হোমপেজে ফিরে যান
          </Link>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white tracking-tight mb-2 sm:mb-4 drop-shadow-lg">
            এক্সপেডিশন <span className="text-[#e76f51]">আর্কাইভ</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-xs sm:text-sm md:text-base px-2">
            আমাদের অতীত অভিযান ও ক্যাম্পিংয়ের এক বিশাল সংগ্রহশালা।
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8 sm:mb-12 px-2 sm:px-0" data-aos="fade-up" data-aos-delay="100">
          <div className="bg-[#0a1c13]/80 backdrop-blur-md border border-[#2d6a4f]/30 p-2 sm:p-6 rounded-xl sm:rounded-3xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-5 shadow-lg text-center sm:text-left">
            <div className="w-6 h-6 sm:w-14 sm:h-14 rounded-full bg-[#2d6a4f]/20 flex items-center justify-center text-[#2d6a4f] text-[10px] sm:text-2xl shrink-0">
              <i className="fa-solid fa-route"></i>
            </div>
            <div>
              <p className="text-sm sm:text-3xl font-black text-white leading-none">{globalStats.totalExpeditions}</p>
              <p className="text-[7px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">সফল অভিযান</p>
            </div>
          </div>
          <div className="bg-[#0a1c13]/80 backdrop-blur-md border border-[#e76f51]/30 p-2 sm:p-6 rounded-xl sm:rounded-3xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-5 shadow-lg text-center sm:text-left">
            <div className="w-6 h-6 sm:w-14 sm:h-14 rounded-full bg-[#e76f51]/20 flex items-center justify-center text-[#e76f51] text-[10px] sm:text-2xl shrink-0">
              <i className="fa-solid fa-users-viewfinder"></i>
            </div>
            <div>
              <p className="text-sm sm:text-3xl font-black text-white leading-none">{globalStats.totalExplorers}</p>
              <p className="text-[7px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">অভিযাত্রী</p>
            </div>
          </div>
          <div className="bg-[#0a1c13]/80 backdrop-blur-md border border-blue-500/30 p-2 sm:p-6 rounded-xl sm:rounded-3xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-5 shadow-lg text-center sm:text-left">
            <div className="w-6 h-6 sm:w-14 sm:h-14 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-[10px] sm:text-2xl shrink-0">
              <i className="fa-solid fa-shoe-prints"></i>
            </div>
            <div>
              <p className="text-sm sm:text-3xl font-black text-white leading-none">{globalStats.totalDistance} <span className="text-[8px] sm:text-lg font-normal">km+</span></p>
              <p className="text-[7px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">মোট দূরত্ব</p>
            </div>
          </div>
        </div>

        {/* 🔴 আপডেটেড ফিল্টার সেকশন */}
        <div className="bg-white/5 border border-white/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl mb-8 sm:mb-10 backdrop-blur-sm mx-2 sm:mx-0" data-aos="fade-up" data-aos-delay="200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            
            <select 
              value={filters.category} 
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              className="bg-black/50 border border-white/10 text-white text-[10px] sm:text-sm rounded-lg px-2 sm:px-4 py-2 sm:py-2.5 outline-none focus:border-[#e76f51]"
            >
              <option value="All">সব ক্যাটাগরি</option>
              <option value="Trekking">Trekking</option>
              <option value="Camping">Camping</option>
              <option value="Cycling">Cycling</option>
              <option value="Swimming">Swimming</option>
              <option value="Houseboat/Cruise">Houseboat/Cruise</option>
              <option value="Day Tour">Day Tour</option>
            </select>
            
            <select 
              value={filters.year} 
              onChange={(e) => setFilters({...filters, year: e.target.value})}
              className="bg-black/50 border border-white/10 text-white text-[10px] sm:text-sm rounded-lg px-2 sm:px-4 py-2 sm:py-2.5 outline-none focus:border-[#e76f51]"
            >
              <option value="All">সব বছর</option>
              {allYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <select 
              value={filters.month} 
              onChange={(e) => setFilters({...filters, month: e.target.value})}
              className="bg-black/50 border border-white/10 text-white text-[10px] sm:text-sm rounded-lg px-2 sm:px-4 py-2 sm:py-2.5 outline-none focus:border-[#e76f51]"
            >
              <option value="All">সব মাস</option>
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>

            <select 
              value={filters.sortOrder} 
              onChange={(e) => setFilters({...filters, sortOrder: e.target.value})}
              className="bg-black/50 border border-white/10 text-white text-[10px] sm:text-sm rounded-lg px-2 sm:px-4 py-2 sm:py-2.5 outline-none focus:border-[#e76f51]"
            >
              <option value="desc">নতুন থেকে পুরনো</option>
              <option value="asc">পুরনো থেকে নতুন</option>
            </select>

          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <i className="fa-solid fa-compass fa-spin text-4xl sm:text-5xl text-[#e76f51]"></i>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-16 sm:py-20 text-center bg-white/5 border border-white/10 rounded-2xl mx-2 sm:mx-0">
            <i className="fa-regular fa-folder-open text-4xl sm:text-6xl text-gray-600 mb-3 sm:mb-4"></i>
            <h3 className="text-lg sm:text-xl font-bold text-gray-400">কোনো আর্কাইভ পাওয়া যায়নি</h3>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 lg:gap-8 px-2 sm:px-0">
            {filteredEvents.map((ev, index) => (
              <div key={ev.id} className="relative group block" data-aos="fade-up" data-aos-delay={(index % 4) * 50}>
                
                {/* 🔴 Admin Edit & Delete Buttons */}
                {isAdmin && (
                  <div className="absolute top-2 right-2 z-30 flex flex-col gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Link 
                      href={`/admin/events/edit?id=${ev.id}`}
                      className="bg-blue-500/90 text-white w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors shadow-lg border border-blue-400/50"
                      title="ইভেন্ট এডিট করুন"
                    >
                      <i className="fa-solid fa-pen text-[8px] sm:text-xs"></i>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        setDeletingEventId(ev.id)
                        setEventToDelete(ev) // 🔴 ডিলিট করার সময় ইভেন্টের ডেটা স্টেট-এ সেট করা হলো
                        setIsDeleteModalOpen(true)
                        setDeleteStep(1)
                      }}
                      className="bg-red-500/90 text-white w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg border border-red-400/50"
                      title="ট্র্যাশে পাঠান"
                    >
                      <i className="fa-solid fa-trash-can text-[8px] sm:text-xs"></i>
                    </button>
                  </div>
                )}

                <Link href={`/event-details?id=${ev.id}`} className="block h-full bg-[#0a1c13] rounded-xl sm:rounded-3xl border border-white/10 hover:border-[#e76f51]/50 overflow-hidden shadow-md flex flex-col">
                    {/* 🔴 Image Container - Taller on mobile (h-32 instead of h-24) */}
                    <div className="relative h-32 sm:h-48 w-full overflow-hidden shrink-0">
                      <img src={ev.cover_photo} alt={ev.title} className="w-full h-full object-cover transform sm:group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a1c13] via-transparent to-transparent"></div>
                      
                      {/* 🔴 Badges - Increased text size and padding for clarity */}
                      <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-20 bg-emerald-500/90 backdrop-blur-sm text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-lg border border-emerald-400/50">
                        <i className="fa-solid fa-check-double mr-0.5"></i> Mission Accomplished
                      </div>

                      <div className="absolute bottom-2 left-2 sm:top-4 sm:right-4 sm:bottom-auto sm:left-auto z-20 bg-black/70 backdrop-blur-md text-[#e76f51] sm:text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border border-white/10">
                        <i className={getCategoryIcon(ev.category)}></i> <span className="hidden sm:inline">{ev.category}</span>
                      </div>
                    </div>

                    {/* 🔴 Text Container - Increased padding, font sizes, and 2-line title */}
                    <div className="p-3 sm:p-5 relative flex-grow flex flex-col justify-center">
                      <p className="text-[10px] sm:text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-widest">
                        {new Date(ev.start_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                      </p>
                      <h3 className="text-sm sm:text-lg font-black text-white mb-1 sm:mb-2 line-clamp-2 group-hover:text-[#e76f51] transition-colors leading-tight">
                        {ev.title}
                      </h3>
                      <p className="text-[11px] sm:text-sm text-gray-400 line-clamp-1 mt-1">
                        <i className="fa-solid fa-location-dot mr-1"></i>{ev.destination}
                      </p>
                    </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Modal unchanged but compacted padding */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0a1c13] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full mx-auto relative shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            {deleteStep === 1 && (
              <div className="text-center">
                <i className="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-3 animate-pulse"></i>
                <h3 className="text-xl font-black text-white mb-2">চরম সতর্কতা!</h3>
                <p className="text-gray-400 text-xs mb-5">
                  ইভেন্টটি ট্র্যাশ বিনে জমা হবে এবং <span className="text-red-400 font-bold">সকল ইউজারের পয়েন্ট মাইনাস হয়ে যাবে</span>। নিশ্চিত?
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setIsDeleteModalOpen(false)} className="w-1/2 bg-white/5 text-white py-2.5 rounded-lg text-xs font-bold transition-all">বাতিল</button>
                  <button onClick={() => setDeleteStep(2)} className="w-1/2 bg-red-500/20 text-red-500 border border-red-500/50 py-2.5 rounded-lg text-xs font-bold transition-all">পরবর্তী ধাপ</button>
                </div>
              </div>
            )}

            {deleteStep === 2 && (
              <div className="text-center">
                <i className="fa-solid fa-clipboard-check text-4xl text-orange-500 mb-3"></i>
                <h3 className="text-lg font-black text-white mb-3">দায়িত্ব স্বীকার</h3>
                <label className="flex items-start gap-2 text-left bg-black/40 p-3 rounded-xl border border-white/5 mb-5 cursor-pointer">
                  <input type="checkbox" className="mt-0.5 w-4 h-4 accent-red-500 shrink-0" checked={isCheckboxChecked} onChange={(e) => setIsCheckboxChecked(e.target.checked)} />
                  <span className="text-[10px] text-gray-300">আমি নিজ দায়িত্বে এটি করছি।</span>
                </label>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteStep(1)} className="w-1/2 bg-white/5 text-white py-2.5 rounded-lg text-xs font-bold transition-all">পেছনে</button>
                  <button disabled={!isCheckboxChecked} onClick={() => setDeleteStep(3)} className={`w-1/2 py-2.5 rounded-lg text-xs font-bold transition-all ${isCheckboxChecked ? 'bg-red-500 text-white' : 'bg-red-500/20 text-red-500/50'}`}>পরবর্তী ধাপ</button>
                </div>
              </div>
            )}

            {deleteStep === 3 && (
              <div className="text-center">
                <i className="fa-solid fa-skull-crossbones text-4xl text-red-600 mb-3"></i>
                <h3 className="text-lg font-black text-white mb-2">চূড়ান্ত পদক্ষেপ</h3>
                <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE" className="w-full bg-black/40 border border-red-500/30 text-white text-center font-black tracking-widest rounded-lg p-3 outline-none mb-5 uppercase text-sm" />
                <div className="flex gap-3">
                  <button onClick={() => setDeleteStep(2)} className="w-1/2 bg-white/5 text-white py-2.5 rounded-lg text-xs font-bold transition-all">পেছনে</button>
                  <button disabled={deleteConfirmText !== 'DELETE'} onClick={handleMoveToTrash} className={`w-1/2 py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 ${deleteConfirmText === 'DELETE' ? 'bg-red-600 text-white' : 'bg-red-500/20 text-red-500/50'}`}><i className="fa-solid fa-trash-can"></i> ডিলিট</button>
                </div>
              </div>
            )}

            <button onClick={() => setIsDeleteModalOpen(false)} className="absolute -top-3 -right-3 w-8 h-8 bg-black border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white"><i className="fa-solid fa-xmark text-xs"></i></button>
          </div>
        </div>
      )}
    </div>
  )
}
