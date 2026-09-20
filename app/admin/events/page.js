'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminEventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .is('deleted_at', null)
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

  // 1. "Mark as Completed" লজিক (🔴 Updated Logic for accurate point addition)
  const handleCompleteEvent = async (eventId, ev) => {
    if (!window.confirm("সতর্কতা! এটি মার্ক করলে ট্যুরে অংশ নেওয়া সবার ড্যাশবোর্ডে স্ট্যাটস যোগ হয়ে যাবে। আপনি কি নিশ্চিত?")) return
    
    setProcessingId(eventId)

    try {
      const { error: eventError } = await supabase
        .from('events')
        .update({ status: 'completed' })
        .eq('id', eventId)

      if (eventError) throw eventError

      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('user_id')
        .eq('event_id', eventId)
        .in('status', ['approved', 'free_booking']) // 🔴 free_booking যুক্ত করা হলো

      if (bookingError) throw bookingError

      if (bookings && bookings.length > 0) {
        const statsMeta = ev.stats_meta || {}
        const category = (ev.category || "").toLowerCase().trim() // 🔴 Category text clean up
        const distanceToAdd = Number(statsMeta.distance) || 0
        const iqToAdd = Number(statsMeta.survival_iq) || 0
        const treksCount = Number(statsMeta.treks) || 1

        const updatePromises = bookings.map(async (b) => {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('survival_iq, total_events, total_treks, total_distance, total_rides, cycling_distance, total_swims, swimming_distance, total_runs, running_distance')
            .eq('id', b.user_id)
            .single()
          
          if (userProfile) {
            const updates = {
              survival_iq: (Number(userProfile.survival_iq) || 0) + iqToAdd,
              total_events: (Number(userProfile.total_events) || 0) + 1
            }

            // 🔴 .includes() ব্যবহার করা হলো যাতে নামের আগেপিছে কিছু থাকলেও ম্যাচ করে
            if (category.includes('trekking') || category.includes('camping') || category.includes('day tour')) {
              updates.total_treks = (Number(userProfile.total_treks) || 0) + treksCount
              updates.total_distance = (Number(userProfile.total_distance) || 0) + distanceToAdd
            } else if (category.includes('cycling')) {
              updates.total_rides = (Number(userProfile.total_rides) || 0) + treksCount
              updates.cycling_distance = (Number(userProfile.cycling_distance) || 0) + distanceToAdd
            } else if (category.includes('swimming') || category.includes('houseboat') || category.includes('cruise')) {
              updates.total_swims = (Number(userProfile.total_swims) || 0) + treksCount
              updates.swimming_distance = (Number(userProfile.swimming_distance) || 0) + distanceToAdd
            } else if (category.includes('running')) {
              updates.total_runs = (Number(userProfile.total_runs) || 0) + treksCount
              updates.running_distance = (Number(userProfile.running_distance) || 0) + distanceToAdd
            } else {
              updates.total_treks = (Number(userProfile.total_treks) || 0) + treksCount
            }

            await supabase.from('profiles').update(updates).eq('id', b.user_id)
          }
        })
        
        await Promise.all(updatePromises)
      }

      alert("✅ ম্যাজিক সফল! ইভেন্ট সম্পন্ন হয়েছে এবং সবার স্ট্যাটাস অটোমেটিক আপডেট হয়ে গেছে!")
      fetchEvents()
    } catch (error) {
      alert("সমস্যা হয়েছে: " + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  // 2. "Delete & Rollback" লজিক (🔴 Updated Logic for accurate point rollback)
  const handleDeleteEvent = async (eventId, ev) => {
    if (!window.confirm("ভয়ংকর সতর্কতা! এই ইভেন্টটি ডিলিট করলে সকল অংশগ্রহণকারীর ড্যাশবোর্ড থেকে এই ইভেন্টের পয়েন্ট মাইনাস হয়ে যাবে এবং ইভেন্টটি ট্র্যাশে চলে যাবে। নিশ্চিত?")) return
    
    setDeletingId(eventId)

    try {
      if (ev.status === 'completed') {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('user_id')
          .eq('event_id', eventId)
          .in('status', ['approved', 'free_booking']) // 🔴 free_booking যুক্ত করা হলো

        if (bookings && bookings.length > 0) {
          const statsMeta = ev.stats_meta || {}
          const category = (ev.category || "").toLowerCase().trim()
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
      }

      const { error: deleteError } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', eventId)

      if (deleteError) throw deleteError

      alert("🗑️ ইভেন্টটি ডিলিট করা হয়েছে এবং ইউজারদের পয়েন্ট রিভার্স করা হয়েছে!")
      fetchEvents()
    } catch (error) {
      alert("ডিলিট করতে সমস্যা হয়েছে: " + error.message)
    } finally {
      setDeletingId(null)
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
        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-400 hover:text-white bg-white/5 p-3 rounded-xl transition-colors">
                <i className="fa-solid fa-arrow-left"></i>
            </Link>
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                    <i className="fa-solid fa-bolt text-yellow-500"></i> ইভেন্ট ম্যানেজমেন্ট
                </h1>
            </div>
          </div>
          <Link 
            href="/admin/events/create" 
            className="bg-[#e76f51] hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i> নতুন ইভেন্ট
          </Link>
        </div>

        <p className="text-xs text-gray-400 mb-6 border-l-2 border-yellow-500 pl-3">
          সতর্কতা: কোনো ইভেন্ট 'Mark Completed' করলে অংশগ্রহণকারীদের স্ট্যাটস যোগ হবে। আবার ডিলিট করলে তা মাইনাস হয়ে যাবে।
        </p>

        {events.length === 0 ? (
          <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-10 text-center">
            <i className="fa-solid fa-campground text-5xl text-gray-600 mb-4 opacity-50"></i>
            <p className="text-gray-400 font-bold text-lg">বর্তমানে কোনো অ্যাক্টিভ ইভেন্ট নেই!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((ev) => (
              <div key={ev.id} className="bg-[#0a1c13] border border-yellow-500/20 p-5 sm:p-6 rounded-2xl relative transition-all hover:bg-black/40">
                  
                  {/* 🔴 Top Right Corner Edit Button */}
                  <div className="absolute top-5 right-5">
                    <Link 
                      href={`/admin/events/edit?id=${ev.id}`} 
                      className="bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm"
                      title="ইভেন্ট এডিট করুন"
                    >
                      <i className="fa-solid fa-pen-to-square text-xs"></i>
                    </Link>
                  </div>

                  <div className="pr-12">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-bold text-white">{ev.title}</h3>
                        {ev.status === 'completed' && (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest"><i className="fa-solid fa-check-circle"></i> Completed</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-2">
                        <span className="bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                          <i className="fa-solid fa-chair text-[#e76f51]"></i> Booked: <span className="font-bold text-emerald-400">{ev.booked_seats || 0} / {ev.total_seats}</span>
                        </span>
                        <span className="bg-white/5 px-3 py-1 rounded-lg border border-white/10 uppercase">
                          <i className="fa-solid fa-layer-group text-blue-400"></i> {ev.category || 'General'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-2 font-mono">
                        Reward: {ev.stats_meta?.distance || 0}km, {ev.stats_meta?.survival_iq || 0} IQ
                      </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-5 pt-4 border-t border-white/5">
                      
                      <Link 
                        href={`/admin/events/details?id=${ev.id}`} 
                        className="bg-[#e76f51]/20 text-[#e76f51] border border-[#e76f51]/30 hover:bg-[#e76f51] hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                      >
                          <i className="fa-solid fa-chart-pie"></i> ড্যাশবোর্ড
                      </Link>

                      {ev.status !== 'completed' && (
                        <button 
                          onClick={() => handleCompleteEvent(ev.id, ev)}
                          disabled={processingId === ev.id}
                          className="bg-yellow-500 hover:bg-yellow-600 text-black px-5 py-2.5 rounded-xl text-sm font-black shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {processingId === ev.id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-flag-checkered"></i>}
                            Mark Completed
                        </button>
                      )}

                      {/* Delete Button with Rollback Logic */}
                      <button 
                        onClick={() => handleDeleteEvent(ev.id, ev)}
                        disabled={deletingId === ev.id}
                        className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                          {deletingId === ev.id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-trash-can"></i>}
                          Delete
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
