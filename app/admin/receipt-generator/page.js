'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ReceiptGeneratorContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('bookingId')
  const router = useRouter()

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [customMessage, setCustomMessage] = useState('আপনার পেমেন্ট সফলভাবে গ্রহণ করা হয়েছে এবং ইভেন্টের সিট কনফার্ম করা হয়েছে। অ্যাডভেঞ্চারের জন্য প্রস্তুত হোন!')

  useEffect(() => {
    if (!bookingId) return

    const fetchBooking = async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            id, trx_id, payment_method, created_at, status,
            events (title, category, booking_fee, tour_fee, start_date),
            profiles (id, full_name, student_id, phone)
          `)
          .eq('id', bookingId)
          .single()

        if (error) throw error
        setBooking(data)
      } catch (error) {
        console.error("Error fetching booking:", error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchBooking()
  }, [bookingId])

  const handleSendReceipt = async () => {
    if (!booking) return
    setProcessing(true)

    try {
      // 🔴 Zero-Storage Trick: We save Data, not Image!
      const receiptData = {
        receipt_no: `CAS-${booking.id.split('-')[0].toUpperCase()}`,
        event_name: booking.events.title,
        category: booking.events.category,
        amount_paid: booking.events.booking_fee,
        total_fee: booking.events.tour_fee,
        payment_method: booking.payment_method,
        trx_id: booking.trx_id,
        payment_date: booking.created_at,
        explorer_name: booking.profiles.full_name,
        student_id: booking.profiles.student_id,
        phone: booking.profiles.phone
      }

      const { error } = await supabase.from('inbox_messages').insert([{
        user_id: booking.profiles.id,
        title: `Payment Receipt: ${booking.events.title}`,
        message_type: 'receipt',
        content: customMessage,
        receipt_data: receiptData,
        is_read: false
      }])

      if (error) throw error

      alert("✅ রিসিট সফলভাবে ইউজারের ইনবক্সে পাঠানো হয়েছে!")
      router.push('/admin/bookings')

    } catch (error) {
      alert("রিসিট পাঠাতে সমস্যা হয়েছে: " + error.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b08] flex items-center justify-center">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#e76f51]"></i>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#050b08] flex flex-col items-center justify-center text-white">
        <i className="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-4"></i>
        <p>বুকিং ডেটা পাওয়া যায়নি!</p>
        <Link href="/admin/bookings" className="mt-4 text-blue-400 underline">ফিরে যান</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 relative text-gray-300">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Side: Receipt Preview */}
        <div>
          <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
            <i className="fa-solid fa-eye text-[#e76f51]"></i> রিসিট প্রিভিউ
          </h2>
          <p className="text-xs text-gray-500 mb-6">ইউজার তার ইনবক্সে ঠিক এইরকম একটি ডিজিটাল রিসিট দেখতে পাবে যা সে ছবি হিসেবে ডাউনলোড করতে পারবে।</p>
          
          {/* 🔴 HTML/CSS Receipt Template (Rendered on UI, No Image Needed) */}
          <div className="bg-white text-black p-6 sm:p-8 rounded-xl shadow-2xl relative overflow-hidden border-t-8 border-[#0a1c13]">
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <i className="fa-solid fa-mountain-sun text-[150px]"></i>
            </div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start border-b-2 border-gray-200 pb-4 mb-4">
                <div>
                  <h3 className="text-2xl font-black text-[#0a1c13] leading-none">C.A.S.</h3>
                  <p className="text-[9px] font-bold tracking-widest text-gray-500 mt-1">CUET ADVENTURE SOCIETY</p>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded font-black text-[10px] uppercase tracking-wider">Paid / Confirmed</span>
                  <p className="text-[10px] text-gray-500 mt-2 font-mono">Receipt No: CAS-{booking.id.split('-')[0].toUpperCase()}</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Event Name</p>
                <p className="font-black text-lg text-gray-800 leading-tight">{booking.events.title}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6 space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500 font-medium">Explorer Name:</span>
                  <span className="font-bold text-gray-800">{booking.profiles.full_name}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500 font-medium">Student ID:</span>
                  <span className="font-mono font-bold text-gray-800">{booking.profiles.student_id || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500 font-medium">Payment Method:</span>
                  <span className="font-bold text-gray-800 text-right max-w-[200px] truncate">{booking.payment_method}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-gray-500 font-medium">TrxID / Ref:</span>
                  <span className="font-mono font-bold text-gray-800 text-right max-w-[200px] truncate">{booking.trx_id}</span>
                </div>
              </div>

              <div className="flex justify-between items-end bg-[#0a1c13] text-white p-4 rounded-xl">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Amount Received</p>
                  <p className="text-3xl font-black">৳ {booking.events.booking_fee}</p>
                </div>
                <div className="text-right">
                  <i className="fa-solid fa-barcode text-4xl opacity-50"></i>
                  <p className="text-[8px] text-gray-400 mt-1">{new Date(booking.created_at).toLocaleDateString('en-GB')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Action Panel */}
        <div className="flex flex-col h-full">
          <div className="bg-[#0a1c13] border border-white/10 p-6 sm:p-8 rounded-3xl shadow-xl flex-grow">
            <h2 className="text-xl font-black text-white mb-2"><i className="fa-solid fa-paper-plane text-blue-400 mr-2"></i> ইনবক্স মেসেজ</h2>
            <p className="text-xs text-gray-500 mb-6">রিসিটের সাথে একটি কনফার্মেশন মেসেজ ইউজারের ইনবক্সে যাবে।</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Custom Note / Message</label>
                <textarea 
                  rows="5" 
                  value={customMessage} 
                  onChange={(e) => setCustomMessage(e.target.value)} 
                  className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-blue-400 resize-none text-sm leading-relaxed"
                ></textarea>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3 mt-4">
                <i className="fa-solid fa-circle-info text-blue-400 mt-0.5"></i>
                <p className="text-[10px] text-blue-300 leading-relaxed">
                  "সেন্ড রিসিট" এ ক্লিক করলে কোনো ছবি আপলোড হবে না। সিস্টেম শুধুমাত্র ডাটাবেসে রিসিটের ডেটা (JSON) পাঠাবে। ইউজার তার ড্যাশবোর্ড থেকে এই ডেটা দিয়ে লাইভ ছবি জেনারেট করে ডাউনলোড করতে পারবে। এতে আমাদের <b>১০০% সার্ভার স্টোরেজ সেভ হবে</b>।
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <Link href="/admin/bookings" className="flex-1 bg-white/5 hover:bg-white/10 text-white text-center py-4 rounded-xl font-bold transition-all border border-white/10">
              বাতিল করুন
            </Link>
            <button 
              onClick={handleSendReceipt} 
              disabled={processing}
              className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] flex justify-center items-center gap-2"
            >
              {processing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-envelope-open-text"></i>}
              সেন্ড রিসিট & মেসেজ
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default function ReceiptGeneratorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050b08] flex items-center justify-center"><i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#e76f51]"></i></div>}>
      <ReceiptGeneratorContent />
    </Suspense>
  )
}
