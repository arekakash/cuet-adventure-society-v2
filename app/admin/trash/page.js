'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function TrashBin() {
  const [trashedEvents, setTrashedEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null) // 🔴 বাটন লোডিং স্টেটের জন্য

  useEffect(() => {
    fetchTrashedEvents()
  }, [])

  const fetchTrashedEvents = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

      if (error) throw error
      setTrashedEvents(data || [])
    } catch (error) {
      console.error(error)
      alert("ট্র্যাশ ডেটা লোড করতে সমস্যা হয়েছে: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 🔴 সংশোধিত রিস্টোর লজিক (পয়েন্ট রি-অ্যাড করা সহ)
  const handleRestore = async (ev) => {
    const confirmRestore = window.confirm("আপনি কি নিশ্চিতভাবে এই ইভেন্টটি রিস্টোর করতে চান? যদি এটি কমপ্লিটেড ইভেন্ট হয়, তবে ইউজারদের পয়েন্ট ফেরত দেওয়া হবে।")
    if (!confirmRestore) return

    setProcessingId(ev.id)

    try {
      // ১. যদি ইভেন্টটি 'completed' অবস্থায় ডিলিট হয়ে থাকে, তবে ইউজারদের পয়েন্ট ফিরিয়ে দিতে হবে
      if (ev.status === 'completed') {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('user_id')
          .eq('event_id', ev.id)
          .in('status', ['approved', 'free_booking'])

        if (bookings && bookings.length > 0) {
          const statsMeta = ev.stats_meta || {}
          const category = (ev.category || "").toLowerCase().trim()
          const distanceToAdd = Number(statsMeta.distance) || 0
          const iqToAdd = Number(statsMeta.survival_iq) || 0
          const treksCount = Number(statsMeta.treks) || 1

          const restorePromises = bookings.map(async (b) => {
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
          
          await Promise.all(restorePromises)
        }
      }

      // ২. ইভেন্টটিকে ট্র্যাশ থেকে রিস্টোর করা (deleted_at ফাঁকা করে দেওয়া)
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: null })
        .eq('id', ev.id)

      if (error) throw error
      alert("✅ ইভেন্টটি সফলভাবে রিস্টোর করা হয়েছে এবং ডেটা সিঙ্ক হয়েছে!")
      fetchTrashedEvents()
    } catch (error) {
      alert("রিস্টোর করতে সমস্যা হয়েছে: " + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  // চিরতরে ডিলিট করার ফাংশন 
  const handlePermanentDelete = async (id) => {
    const confirmDelete = window.confirm("চরম সতর্কতা! এটি ডেটাবেস থেকে চিরতরে মুছে যাবে এবং আর কখনোই উদ্ধার করা সম্ভব হবে না। আপনি কি নিশ্চিত?")
    if (!confirmDelete) return

    setProcessingId(id)

    try {
      const { error: bookingError } = await supabase
        .from('bookings')
        .delete()
        .eq('event_id', id)

      if (bookingError) throw bookingError

      const { error: eventError } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (eventError) throw eventError

      alert("ইভেন্টটি চিরতরে মুছে ফেলা হয়েছে!")
      fetchTrashedEvents()
    } catch (error) {
      alert("ডিলিট করতে সমস্যা হয়েছে: " + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  const calculateDaysLeft = (deletedAtStr) => {
    const deletedDate = new Date(deletedAtStr)
    const expiryDate = new Date(deletedDate.setDate(deletedDate.getDate() + 30))
    const today = new Date()
    const diffTime = Math.abs(expiryDate - today)
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="min-h-screen bg-[#050b08] pb-12 px-4 sm:px-6 relative text-gray-300 pt-24">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-400 hover:text-white bg-white/5 p-3 rounded-xl transition-colors">
              <i className="fa-solid fa-arrow-left"></i>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <i className="fa-solid fa-trash-can text-red-500"></i> ট্র্যাশ বিন (Trash Bin)
              </h1>
              <p className="text-sm text-gray-400 mt-1">ডিলিট হওয়া ইভেন্টগুলো ৩০ দিন পর স্বয়ংক্রিয়ভাবে মুছে যাবে</p>
            </div>
          </div>
          <Link href="/admin/events" className="bg-white/5 hover:bg-white/10 text-white font-bold py-2 px-4 rounded-lg transition-colors border border-white/10 text-sm">
            অ্যাক্টিভ ইভেন্ট ম্যানেজমেন্ট
          </Link>
        </div>

        <div className="bg-[#0a1c13] border border-red-500/20 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(239,68,68,0.05)]">
          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <i className="fa-solid fa-circle-notch fa-spin text-4xl text-red-500"></i>
            </div>
          ) : trashedEvents.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center">
              <i className="fa-solid fa-box-open text-6xl text-gray-600 mb-4"></i>
              <h3 className="text-xl font-bold text-gray-400">ট্র্যাশ বিন সম্পূর্ণ ফাঁকা</h3>
              <p className="text-sm text-gray-500 mt-2">বর্তমানে কোনো ডিলিট হওয়া ইভেন্ট নেই।</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {trashedEvents.map(event => (
                <div key={event.id} className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:border-red-500/30 transition-colors">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-white leading-tight">{event.title}</h3>
                      <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border border-red-500/20 whitespace-nowrap">
                        {calculateDaysLeft(event.deleted_at)} days left
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4"><i className="fa-solid fa-location-dot text-gray-400 mr-1"></i> {event.destination}</p>
                    
                    <div className="bg-white/5 p-3 rounded-xl mb-6">
                      <p className="text-xs text-gray-400"><span className="font-bold text-gray-300">ডিলিট করা হয়েছে:</span> {new Date(event.deleted_at).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleRestore(event)} // 🔴 পুরো ইভেন্ট অবজেক্ট পাঠানো হচ্ছে
                      disabled={processingId === event.id}
                      className="w-1/2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/30 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processingId === event.id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-rotate-left"></i>} 
                      রিস্টোর
                    </button>
                    <button 
                      onClick={() => handlePermanentDelete(event.id)}
                      disabled={processingId === event.id}
                      className="w-1/2 bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processingId === event.id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-fire"></i>} 
                      ধ্বংস করুন
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
