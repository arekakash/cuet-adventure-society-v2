'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          events (title, id, booked_seats, total_seats, category, stats_meta),
          profiles (id, full_name, phone, blood_group, emergency_contact, total_treks, total_distance, total_rides, cycling_distance, total_swims, swimming_distance)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true }) 
        
      if (error) throw error
      setBookings(data || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  // 🔴 স্মার্ট অ্যাপ্রুভাল লজিক (গ্যামিফিকেশন রিওয়ার্ডস সহ)
  const handleApprove = async (booking) => {
    const event = booking.events
    const profile = booking.profiles
    
    if (event.booked_seats >= event.total_seats) {
        alert("⚠️ এই ইভেন্টের সব সিট ইতোমধ্যে বুক হয়ে গেছে! আপনি আর অ্যাপ্রুভ করতে পারবেন না।")
        return
    }

    if (!window.confirm("পেমেন্ট সঠিক হলে অ্যাপ্রুভ করুন। ইউজারের প্রোফাইলে রিওয়ার্ড যোগ হবে। নিশ্চিত?")) return
    setProcessingId(booking.id)

    try {
      // ১. বুকিং স্ট্যাটাস আপডেট
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'approved' })
        .eq('id', booking.id)

      if (bookingError) throw bookingError

      // ২. ইভেন্টের সিট সংখ্যা আপডেট
      const { error: eventError } = await supabase
        .from('events')
        .update({ booked_seats: event.booked_seats + 1 })
        .eq('id', event.id)
        
      if (eventError) throw eventError

      // 🔴 ৩. ইউজারের প্রোফাইলে ডায়নামিক রিওয়ার্ড যোগ করা
      let profileUpdateData = {}
      const rewardCount = event.stats_meta?.treks || 0
      const rewardDistance = event.stats_meta?.distance || 0

      if (event.category === 'Cycling') {
        profileUpdateData = {
          total_rides: (profile.total_rides || 0) + rewardCount,
          cycling_distance: (profile.cycling_distance || 0) + rewardDistance
        }
      } else if (event.category === 'Swimming' || event.category === 'Houseboat/Cruise') {
        profileUpdateData = {
          total_swims: (profile.total_swims || 0) + rewardCount,
          swimming_distance: (profile.swimming_distance || 0) + rewardDistance
        }
      } else {
        // Trekking, Expedition, Day Tour etc.
        profileUpdateData = {
          total_treks: (profile.total_treks || 0) + rewardCount,
          total_distance: (profile.total_distance || 0) + rewardDistance
        }
      }

      // প্রোফাইল আপডেট করা
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', profile.id)

      if (profileError) throw profileError

      alert("বুকিং কনফার্ম করা হয়েছে এবং ইউজারের প্রোফাইলে রিওয়ার্ড যোগ হয়েছে!")
      fetchBookings()
    } catch (error) {
      alert("বুকিং অ্যাপ্রুভ করতে সমস্যা হয়েছে: " + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (bookingId) => {
    if (!window.confirm("পেমেন্ট সঠিক না হলে বুকিংটি বাতিল করুন। নিশ্চিত?")) return
    setProcessingId(bookingId)

    try {
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId)
        
      if (deleteError) throw deleteError

      alert("বুকিং বাতিল করা হয়েছে।")
      fetchBookings()
    } catch (error) {
      alert("বুকিং বাতিল করতে সমস্যা হয়েছে: " + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleCopy = (trxId, id) => {
    navigator.clipboard.writeText(trxId)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b08] flex items-center justify-center">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-blue-400"></i>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 relative text-gray-300">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-400 hover:text-white bg-white/5 p-3 rounded-xl transition-colors">
                  <i className="fa-solid fa-arrow-left"></i>
              </Link>
              <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                      <i className="fa-solid fa-ticket text-blue-400"></i> বুকিং ম্যানেজমেন্ট
                  </h1>
                  <p className="text-xs text-gray-400 mt-1">পেন্ডিং পেমেন্টগুলো যাচাই করে অ্যাপ্রুভ করুন</p>
              </div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 px-4 py-2 rounded-xl text-blue-400 font-bold hidden sm:block">
              Total Pending: {bookings.length}
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-10 text-center shadow-lg">
            <i className="fa-solid fa-check-circle text-5xl text-emerald-500 mb-4 opacity-50"></i>
            <p className="text-gray-400 font-bold text-lg">অ্যাপ্রুভ করার মতো নতুন কোনো বুকিং রিকোয়েস্ট নেই!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {bookings.map((booking) => {
              const isFull = booking.events?.booked_seats >= booking.events?.total_seats;

              return (
                <div key={booking.id} className="bg-[#0a1c13] border border-white/5 hover:border-blue-500/30 p-5 rounded-2xl flex flex-col md:flex-row gap-5 items-start md:items-center transition-all shadow-md">
                    
                    {/* ইউজার ও ইভেন্ট ইনফো */}
                    <div className="flex-grow w-full md:w-auto">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-white line-clamp-1"><i className="fa-solid fa-map-location-dot text-[#e76f51] mr-2"></i> {booking.events?.title || 'Unknown Event'}</h3>
                            <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded-md">{new Date(booking.created_at).toLocaleDateString('en-GB')}</span>
                        </div>
                        
                        <div className="bg-black/30 p-3 rounded-xl mb-3 border border-white/5 flex flex-col sm:flex-row gap-4 sm:gap-8 text-xs text-gray-400">
                            <div>
                                <p className="mb-1"><i className="fa-solid fa-user text-blue-400 w-4"></i> <span className="font-bold text-gray-300">{booking.profiles?.full_name}</span></p>
                                <p><i className="fa-solid fa-phone text-emerald-400 w-4"></i> {booking.profiles?.phone}</p>
                            </div>
                            <div>
                                <p className="mb-1"><i className="fa-solid fa-droplet text-red-400 w-4"></i> {booking.profiles?.blood_group}</p>
                                <p><i className="fa-solid fa-satellite-dish text-yellow-500 w-4"></i> Emg: {booking.profiles?.emergency_contact}</p>
                            </div>
                        </div>

                        {/* পেমেন্ট ইনফো */}
                        <div className="flex items-center gap-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 font-bold tracking-widest uppercase text-[10px]">
                                <i className="fa-solid fa-hashtag"></i> TrxID: <span className="text-gray-200">{booking.trx_id}</span>
                                
                                {booking.trx_id && booking.trx_id !== 'NONE' && booking.trx_id !== 'FREE_BOOKING' && (
                                  <button 
                                    onClick={() => handleCopy(booking.trx_id, booking.id)}
                                    className="ml-1 text-blue-400 hover:text-white transition-colors"
                                    title="Copy TrxID"
                                  >
                                    {copiedId === booking.id ? (
                                      <i className="fa-solid fa-check text-emerald-400"></i>
                                    ) : (
                                      <i className="fa-regular fa-copy"></i>
                                    )}
                                  </button>
                                )}
                            </div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 font-bold tracking-widest uppercase text-[10px]">
                                <i className="fa-solid fa-wallet"></i> Method: {booking.payment_method}
                            </div>
                            
                            {isFull && (
                                <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-1 rounded-md font-bold uppercase"><i className="fa-solid fa-triangle-exclamation"></i> Seat Full</span>
                            )}
                        </div>
                    </div>

                    {/* অ্যাকশন বাটন */}
                    <div className="flex flex-row md:flex-col gap-2 w-full md:w-36 shrink-0 mt-2 md:mt-0 border-t border-white/5 md:border-none pt-4 md:pt-0">
                        {/* 🔴 আপডেট: পুরো বুকিং অবজেক্ট পাস করা হচ্ছে */}
                        <button 
                          onClick={() => handleApprove(booking)} 
                          disabled={processingId === booking.id || isFull}
                          className="flex-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <i className="fa-solid fa-check"></i> Approve
                        </button>
                        <button 
                          onClick={() => handleReject(booking.id)} 
                          disabled={processingId === booking.id}
                          className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <i className="fa-solid fa-trash"></i> Reject
                        </button>
                    </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
