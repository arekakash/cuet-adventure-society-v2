'use client'// app/admin/events/page.js
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ActiveEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'upcoming')
        .is('deleted_at', null) // 🟢 ফিক্স: ট্র্যাশে পাঠানো ইভেন্টগুলো ফিল্টার করে বাদ দেওয়া হলো
        .order('created_at', { ascending: false })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleCompleteEvent = async (eventId, statsMeta) => {
    if (!window.confirm("সতর্কতা! এটি মার্ক করলে ট্যুরে অংশ নেওয়া সবার ড্যাশবোর্ডে স্ট্যাটস যোগ হয়ে যাবে। আপনি কি নিশ্চিত?")) return
    
    setProcessingId(eventId)

    try {
      // ১. ইভেন্টের স্ট্যাটাস কমপ্লিট করা
      const { error: eventError } = await supabase
        .from('events')
        .update({ status: 'completed' })
        .eq('id', eventId)

      if (eventError) throw eventError

      // ২. এই ইভেন্টের 'approved' বুকিংগুলো খুঁজে বের করা
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('user_id')
        .eq('event_id', eventId)
        .eq('status', 'approved')

      if (bookingError) throw bookingError

      // ৩. অংশগ্রহণকারী সকল ইউজারের পয়েন্ট আপডেট করা
      if (bookings && bookings.length > 0) {
        const updatePromises = bookings.map(async (b) => {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('total_treks, total_distance')
            .eq('id', b.user_id)
            .single()
          
          if (userProfile) {
            await supabase
              .from('profiles')
              .update({
                total_treks: (userProfile.total_treks || 0) + (statsMeta?.treks || 0),
                total_distance: (userProfile.total_distance || 0) + (statsMeta?.distance || 0)
              })
              .eq('id', b.user_id)
          }
        })
        
        await Promise.all(updatePromises)
      }

      alert("ম্যাজিক সফল! ইভেন্ট সম্পন্ন হয়েছে এবং সবার স্ট্যাটাস অটোমেটিক আপডেট হয়ে গেছে!")
      fetchEvents()
    } catch (error) {
      alert("সমস্যা হয়েছে: " + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b08] flex items-center justify-center">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-emerald-400"></i>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 relative text-gray-300">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
          <Link href="/admin" className="text-gray-400 hover:text-white bg-white/5 p-3 rounded-xl transition-colors">
              <i className="fa-solid fa-arrow-left"></i>
          </Link>
          <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                  <i className="fa-solid fa-bolt text-yellow-500"></i> অ্যাক্টিভ ইভেন্টসমূহ
              </h1>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-6 border-l-2 border-yellow-500 pl-3">
          সতর্কতা: কোনো ইভেন্ট 'Mark Completed' করলে অংশগ্রহণকারী সকল ইউজারের ড্যাশবোর্ডে গ্যামিফিকেশন স্ট্যাটস (ট্রেক, দূরত্ব) স্বয়ংক্রিয়ভাবে যোগ হয়ে যাবে।
        </p>

        {events.length === 0 ? (
          <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-10 text-center">
            <i className="fa-solid fa-campground text-5xl text-gray-600 mb-4 opacity-50"></i>
            <p className="text-gray-400 font-bold text-lg">বর্তমানে কোনো অ্যাক্টিভ ইভেন্ট নেই!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((ev) => (
              <div key={ev.id} className="bg-[#0a1c13] border border-yellow-500/20 p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row gap-5 justify-between items-start md:items-center transition-all hover:bg-black/40">
                  <div className="flex-grow">
                      <h3 className="text-lg font-bold text-white mb-2">{ev.title}</h3>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-2">
                        <span className="bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                          <i className="fa-solid fa-chair text-[#e76f51]"></i> Booked: <span className="font-bold text-emerald-400">{ev.booked_seats || 0} / {ev.total_seats}</span>
                        </span>
                        <span className="bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                          <i className="fa-solid fa-calendar text-blue-400"></i> Date: {new Date(ev.start_date).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-2">
                        Reward: {ev.stats_meta?.treks || 0} Treks, {ev.stats_meta?.distance || 0}km
                      </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3 w-full md:w-auto shrink-0 mt-2 md:mt-0">
                      
                      {/* ডায়নামিক রাউটিং এর বদলে কুয়েরি প্যারামিটার ব্যবহার করা হলো */}
                      <Link 
                        href={`/admin/events/details?id=${ev.id}`} 
                        className="w-full sm:w-auto bg-[#e76f51]/20 text-[#e76f51] border border-[#e76f51]/30 hover:bg-[#e76f51] hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                      >
                          <i className="fa-solid fa-chart-pie"></i> ইভেন্ট ড্যাশবোর্ড
                      </Link>
                      
                      <Link 
                        href={`/admin/events/edit?id=${ev.id}`} 
                        className="w-full sm:w-auto bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                      >
                          <i className="fa-solid fa-pen-to-square"></i> Edit
                      </Link>

                      <button 
                        onClick={() => handleCompleteEvent(ev.id, ev.stats_meta)}
                        disabled={processingId === ev.id}
                        className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-black px-5 py-2.5 rounded-xl text-sm font-black shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                          {processingId === ev.id ? (
                            <i className="fa-solid fa-circle-notch fa-spin"></i>
                          ) : (
                            <i className="fa-solid fa-flag-checkered"></i>
                          )}
                          Mark Completed
                      </button>
                  </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ActiveEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'upcoming')
        .order('created_at', { ascending: false })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleCompleteEvent = async (eventId, statsMeta) => {
    if (!window.confirm("সতর্কতা! এটি মার্ক করলে ট্যুরে অংশ নেওয়া সবার ড্যাশবোর্ডে স্ট্যাটস যোগ হয়ে যাবে। আপনি কি নিশ্চিত?")) return
    
    setProcessingId(eventId)

    try {
      // ১. ইভেন্টের স্ট্যাটাস কমপ্লিট করা
      const { error: eventError } = await supabase
        .from('events')
        .update({ status: 'completed' })
        .eq('id', eventId)

      if (eventError) throw eventError

      // ২. এই ইভেন্টের 'approved' বুকিংগুলো খুঁজে বের করা
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('user_id')
        .eq('event_id', eventId)
        .eq('status', 'approved')

      if (bookingError) throw bookingError

      // ৩. অংশগ্রহণকারী সকল ইউজারের পয়েন্ট আপডেট করা
      if (bookings && bookings.length > 0) {
        const updatePromises = bookings.map(async (b) => {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('total_treks, total_distance')
            .eq('id', b.user_id)
            .single()
          
          if (userProfile) {
            await supabase
              .from('profiles')
              .update({
                total_treks: (userProfile.total_treks || 0) + (statsMeta?.treks || 0),
                total_distance: (userProfile.total_distance || 0) + (statsMeta?.distance || 0)
              })
              .eq('id', b.user_id)
          }
        })
        
        await Promise.all(updatePromises)
      }

      alert("ম্যাজিক সফল! ইভেন্ট সম্পন্ন হয়েছে এবং সবার স্ট্যাটাস অটোমেটিক আপডেট হয়ে গেছে!")
      fetchEvents()
    } catch (error) {
      alert("সমস্যা হয়েছে: " + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b08] flex items-center justify-center">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-emerald-400"></i>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 relative text-gray-300">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
          <Link href="/admin" className="text-gray-400 hover:text-white bg-white/5 p-3 rounded-xl transition-colors">
              <i className="fa-solid fa-arrow-left"></i>
          </Link>
          <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                  <i className="fa-solid fa-bolt text-yellow-500"></i> অ্যাক্টিভ ইভেন্টসমূহ
              </h1>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-6 border-l-2 border-yellow-500 pl-3">
          সতর্কতা: কোনো ইভেন্ট 'Mark Completed' করলে অংশগ্রহণকারী সকল ইউজারের ড্যাশবোর্ডে গ্যামিফিকেশন স্ট্যাটস (ট্রেক, দূরত্ব) স্বয়ংক্রিয়ভাবে যোগ হয়ে যাবে।
        </p>

        {events.length === 0 ? (
          <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-10 text-center">
            <i className="fa-solid fa-campground text-5xl text-gray-600 mb-4 opacity-50"></i>
            <p className="text-gray-400 font-bold text-lg">বর্তমানে কোনো অ্যাক্টিভ ইভেন্ট নেই!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((ev) => (
              <div key={ev.id} className="bg-[#0a1c13] border border-yellow-500/20 p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row gap-5 justify-between items-start md:items-center transition-all hover:bg-black/40">
                  <div className="flex-grow">
                      <h3 className="text-lg font-bold text-white mb-2">{ev.title}</h3>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-2">
                        <span className="bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                          <i className="fa-solid fa-chair text-[#e76f51]"></i> Booked: <span className="font-bold text-emerald-400">{ev.booked_seats || 0} / {ev.total_seats}</span>
                        </span>
                        <span className="bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                          <i className="fa-solid fa-calendar text-blue-400"></i> Date: {new Date(ev.start_date).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-2">
                        Reward: {ev.stats_meta?.treks || 0} Treks, {ev.stats_meta?.distance || 0}km
                      </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3 w-full md:w-auto shrink-0 mt-2 md:mt-0">
                      
                      {/* ডায়নামিক রাউটিং এর বদলে কুয়েরি প্যারামিটার ব্যবহার করা হলো */}
                      <Link 
                        href={`/admin/events/details?id=${ev.id}`} 
                        className="w-full sm:w-auto bg-[#e76f51]/20 text-[#e76f51] border border-[#e76f51]/30 hover:bg-[#e76f51] hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                      >
                          <i className="fa-solid fa-chart-pie"></i> ইভেন্ট ড্যাশবোর্ড
                      </Link>
                      
                      <Link 
                        href={`/admin/events/edit?id=${ev.id}`} 
                        className="w-full sm:w-auto bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                      >
                          <i className="fa-solid fa-pen-to-square"></i> Edit
                      </Link>

                      <button 
                        onClick={() => handleCompleteEvent(ev.id, ev.stats_meta)}
                        disabled={processingId === ev.id}
                        className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-black px-5 py-2.5 rounded-xl text-sm font-black shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                          {processingId === ev.id ? (
                            <i className="fa-solid fa-circle-notch fa-spin"></i>
                          ) : (
                            <i className="fa-solid fa-flag-checkered"></i>
                          )}
                          Mark Completed
                      </button>
                  </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
