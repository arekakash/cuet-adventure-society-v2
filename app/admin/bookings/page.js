'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)

  const fetchBookings = async () => {
    try {
      // ডেটাবেস থেকে পেন্ডিং বুকিং এবং রিলেশনাল ইভেন্ট ও প্রোফাইলের ডেটা টেনে আনা
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          events (title, id),
          profiles (full_name, phone, blood_group, emergency_contact)
        `)
        .eq('status', 'pending')
        
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

  const handleApprove = async (bookingId) => {
    if (!window.confirm("পেমেন্ট সঠিক হলে অ্যাপ্রুভ করুন। নিশ্চিত?")) return
    setProcessingId(bookingId)

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'approved' })
        .eq('id', bookingId)

      if (error) throw error
      alert("বুকিং কনফার্ম করা হয়েছে!")
      fetchBookings()
    } catch (error) {
      alert("বুকিং অ্যাপ্রুভ করতে সমস্যা হয়েছে: " + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (bookingId, eventId) => {
    if (!window.confirm("বুকিং বাতিল করলে ইভেন্টে সিট ফাঁকা হয়ে যাবে। নিশ্চিত?")) return
    setProcessingId(bookingId)

    try {
      // ১. বুকিং ডিলিট করা
      const { error: deleteError } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId)
      if (deleteError) throw deleteError

      // ২. ইভেন্টের booked_seats ১ কমিয়ে দেওয়া (RPC ফাংশন বা সাধারণ আপডেটের মাধ্যমে)
      const { data: eventData } = await supabase.from('events').select('booked_seats').eq('id', eventId).single()
      if (eventData) {
        await supabase
          .from('events')
          .update({ booked_seats: Math.max(0, eventData.booked_seats - 1) })
          .eq('id', eventId)
      }

      alert("বুকিং বাতিল করা হয়েছে।")
      fetchBookings()
    } catch (error) {
      alert("বুকিং বাতিল করতে সমস্যা হয়েছে: " + error.message)
    } finally {
      setProcessingId(null)
    }
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
          <Link href="/admin" className="text-gray-400 hover:text-white bg-white/5 p-3 rounded-xl transition-colors">
              <i className="fa-solid fa-arrow-left"></i>
          </Link>
          <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                  <i className="fa-solid fa-ticket text-blue-400"></i> পেন্ডিং বুকিং রিকোয়েস্ট
              </h1>
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-10 text-center">
            <i className="fa-solid fa-check-circle text-5xl text-emerald-500 mb-4 opacity-50"></i>
            <p className="text-gray-400 font-bold text-lg">অ্যাপ্রুভ করার মতো নতুন কোনো বুকিং রিকোয়েস্ট নেই!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-[#0a1c13] border border-blue-500/20 p-5 rounded-2xl flex flex-col sm:flex-row gap-5 items-start sm:items-center transition-all hover:bg-black/40">
                  <div className="flex-grow">
                      <h3 className="text-sm font-bold text-white mb-2"><i className="fa-solid fa-map-location-dot text-[#e76f51] mr-2"></i> {booking.events?.title || 'Unknown Event'}</h3>
                      <p className="text-xs text-gray-400 mb-1">
                          <span className="font-bold text-gray-300">{booking.profiles?.full_name || 'Unknown User'}</span> | Phone: {booking.profiles?.phone || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-400 mb-2">Blood: {booking.profiles?.blood_group || 'N/A'} | Emg: {booking.profiles?.emergency_contact || 'N/A'}</p>
                      <div className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 font-bold tracking-widest uppercase text-[10px]">
                          TrxID: {booking.trx_id}
                      </div>
                  </div>
                  <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-3 sm:mt-0 shrink-0">
                      <button 
                        onClick={() => handleApprove(booking.id)} 
                        disabled={processingId === booking.id}
                        className="flex-1 sm:flex-none bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                          <i className="fa-solid fa-check"></i> Approve
                      </button>
                      <button 
                        onClick={() => handleReject(booking.id, booking.event_id)} 
                        disabled={processingId === booking.id}
                        className="flex-1 sm:flex-none bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                          <i className="fa-solid fa-xmark"></i> Reject
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
