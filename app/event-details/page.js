'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function EventDetailsContent() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get('id')
  const router = useRouter()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  
  // ইউজারের বর্তমান বুকিং স্ট্যাটাস (null, 'interested', 'free_booking', 'pending', 'approved')
  const [bookingStatus, setBookingStatus] = useState(null)
  const [processing, setProcessing] = useState(false)
  
  // পেমেন্ট মডেলের স্টেট
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [trxId, setTrxId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        // ১. ইভেন্টের ডেটা টানা
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single()

        if (eventError) throw eventError
        if (isMounted) setEvent(eventData)

        // ২. ইউজার লগইন আছে কিনা চেক করা
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          if (isMounted) setUser(session.user)
          
          // ইউজারের প্রোফাইল ডেটা (অসম্পূর্ণ প্রোফাইল আটকাতে)
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (isMounted) setUserProfile(profile)

          // ৩. এই ইউজার আগে থেকেই বুকিং করেছে কিনা চেক করা
          const { data: existingBooking } = await supabase
            .from('bookings')
            .select('status, trx_id')
            .eq('event_id', eventId)
            .eq('user_id', session.user.id)
            .single()

          if (existingBooking && isMounted) {
            setBookingStatus(existingBooking.status)
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (eventId) fetchData()
    
    return () => { isMounted = false }
  }, [eventId])

  // যেকোনো বুকিং অ্যাকশনের আগে প্রোফাইল চেক
  const checkProfileCompletion = () => {
    if (!user) {
      router.push('/login')
      return false
    }
    if (!userProfile?.student_id || !userProfile?.phone || !userProfile?.emergency_contact) {
      alert("আপনার প্রোফাইল অসম্পূর্ণ! বুকিং করার আগে ড্যাশবোর্ড থেকে প্রোফাইলের জরুরি তথ্যগুলো (যেমন: আইডি, কন্টাক্ট নম্বর) পূরণ করুন।")
      router.push('/dashboard')
      return false
    }
    return true
  }

  // লজিক ১: ইন্টারেস্টেড (Interested)
  const handleInterested = async () => {
    if (!checkProfileCompletion()) return
    setProcessing(true)
    try {
      const { error } = await supabase.from('bookings').upsert({
        user_id: user.id,
        event_id: eventId,
        status: 'interested',
        payment_method: 'none',
        trx_id: 'NONE'
      }, { onConflict: 'user_id, event_id' }) // যদি আগে অন্য কিছু থাকে, আপডেট হবে

      if (error) throw error
      setBookingStatus('interested')
      alert("ধন্যবাদ! আপনাকে এই ইভেন্টের 'আগ্রহী' তালিকায় যুক্ত করা হয়েছে।")
    } catch (err) {
      alert("সমস্যা হয়েছে: " + err.message)
    } finally {
      setProcessing(false)
    }
  }

  // লজিক ২: ফ্রি বুকিং (Free Booking)
  const handleFreeBooking = async () => {
    if (!checkProfileCompletion()) return
    
    const confirmMsg = "আপনি বিনামূল্যে একটি সিট বুক করছেন। তবে সতর্কতা: যারা আগে পেমেন্ট করবে, তাদের সিট আগে কনফার্ম করা হবে। ইভেন্টের সিট শেষ হয়ে গেলে আপনার ফ্রি বুকিংটি বাতিল হয়ে যেতে পারে। আপনি কি রাজি?"
    if (!window.confirm(confirmMsg)) return
    
    setProcessing(true)
    try {
      const { error } = await supabase.from('bookings').upsert({
        user_id: user.id,
        event_id: eventId,
        status: 'free_booking',
        payment_method: 'none',
        trx_id: 'FREE_BOOKING'
      }, { onConflict: 'user_id, event_id' })

      if (error) throw error
      setBookingStatus('free_booking')
      alert("আপনার ফ্রি বুকিং সফল হয়েছে! সিট কনফার্ম করতে দ্রুত পেমেন্ট সম্পন্ন করুন।")
    } catch (err) {
      alert("সমস্যা হয়েছে: " + err.message)
    } finally {
      setProcessing(false)
    }
  }

  // লজিক ৩: পেমেন্ট কনফার্মেশন সাবমিট
  const submitPaidBooking = async (e) => {
    e.preventDefault()
    setProcessing(true)
    try {
      const { error } = await supabase.from('bookings').upsert({
        user_id: user.id,
        event_id: eventId,
        status: 'pending',
        payment_method: paymentMethod,
        trx_id: trxId
      }, { onConflict: 'user_id, event_id' })

      if (error) throw error
      setBookingStatus('pending')
      setShowPaymentModal(false)
      alert("বুকিং রিকোয়েস্ট পাঠানো হয়েছে! অ্যাডমিন পেমেন্ট চেক করে কনফার্ম করলে ড্যাশবোর্ডে আপডেট পেয়ে যাবেন।")
    } catch (err) {
      alert("সমস্যা হয়েছে: " + err.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-[#050b08] flex items-center justify-center"><i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#e76f51]"></i></div>
  if (!event) return <div className="min-h-screen bg-[#050b08] flex items-center justify-center text-white"><p>ইভেন্টটি খুঁজে পাওয়া যায়নি!</p></div>

  const isFull = (event.booked_seats || 0) >= event.total_seats

  return (
    <div className="min-h-screen bg-[#050b08] pt-20 pb-20 relative text-gray-300">
      
      {/* ইভেন্ট কভার */}
      <div className="w-full h-[40vh] md:h-[60vh] relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#050b08] via-[#050b08]/50 to-transparent z-10"></div>
        <img src={event.cover_photo || 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80'} className="w-full h-full object-cover" alt="Event Cover" />
        
        <div className="absolute bottom-0 left-0 w-full z-20 px-4 sm:px-6 pb-8">
            <div className="max-w-5xl mx-auto">
                <span className="bg-[#e76f51] text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3 inline-block">{event.category}</span>
                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-2">{event.title}</h1>
                <p className="text-lg md:text-xl text-gray-300 font-medium">{event.subtitle}</p>
            </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* লেফট কলাম (বিস্তারিত) */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* ইনফো গ্রিড */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#0a1c13] p-5 rounded-2xl border border-white/10">
                <div className="text-center p-2 border-r border-white/5">
                    <i className="fa-solid fa-map-location-dot text-[#e76f51] text-xl mb-1"></i>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">গন্তব্য</p>
                    <p className="font-bold text-white text-sm">{event.destination}</p>
                </div>
                <div className="text-center p-2 border-r border-white/5">
                    <i className="fa-solid fa-calendar text-blue-400 text-xl mb-1"></i>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">যাত্রা শুরু</p>
                    <p className="font-bold text-white text-sm">{new Date(event.start_date).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="text-center p-2 border-r border-white/5">
                    <i className="fa-solid fa-fire text-yellow-500 text-xl mb-1"></i>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">ডিফিকাল্টি</p>
                    <p className="font-bold text-white text-sm">{event.difficulty}</p>
                </div>
                <div className="text-center p-2">
                    <i className="fa-solid fa-chair text-emerald-400 text-xl mb-1"></i>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">সিট ফাঁকা</p>
                    <p className="font-bold text-white text-sm">{Math.max(0, event.total_seats - (event.booked_seats || 0))} টি</p>
                </div>
            </div>

            {/* বিবরণ */}
            <div>
                <h3 className="text-xl font-bold text-white mb-4 border-l-4 border-[#e76f51] pl-3">অ্যাডভেঞ্চার বিবরণ</h3>
                <p className="text-gray-400 leading-relaxed whitespace-pre-line">{event.description}</p>
            </div>

            {/* চেকলিস্ট */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {event.included && event.included.length > 0 && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl">
                        <h4 className="font-bold text-emerald-400 mb-3 uppercase tracking-widest text-xs flex items-center gap-2"><i className="fa-solid fa-circle-check"></i> যা ইনক্লুডেড</h4>
                        <ul className="space-y-2 text-sm text-gray-300">
                            {event.included.map((item, i) => <li key={i}><i className="fa-solid fa-check text-emerald-500/50 mr-2"></i>{item}</li>)}
                        </ul>
                    </div>
                )}
                {event.excluded && event.excluded.length > 0 && (
                    <div className="bg-gray-500/5 border border-gray-500/20 p-5 rounded-2xl">
                        <h4 className="font-bold text-gray-400 mb-3 uppercase tracking-widest text-xs flex items-center gap-2"><i className="fa-solid fa-circle-xmark"></i> যা ইনক্লুডেড নয়</h4>
                        <ul className="space-y-2 text-sm text-gray-300">
                            {event.excluded.map((item, i) => <li key={i}><i className="fa-solid fa-xmark text-gray-500/50 mr-2"></i>{item}</li>)}
                        </ul>
                    </div>
                )}
            </div>

            {/* ইটিনেরারি (ডে-টু-ডে প্ল্যান) */}
            {event.itinerary && event.itinerary.length > 0 && (
                <div>
                    <h3 className="text-xl font-bold text-white mb-6 border-l-4 border-blue-400 pl-3">ডে-টু-ডে প্ল্যান</h3>
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                        {event.itinerary.map((day, i) => (
                            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-[#0a1c13] text-gray-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                    <span className="text-xs font-bold">{day.day}</span>
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/10 bg-[#0a1c13]/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="font-bold text-white">{day.title}</div>
                                    </div>
                                    <div className="text-sm text-gray-400">{day.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* রাইট কলাম (বুকিং প্যানেল) */}
        <div className="lg:col-span-1">
            <div className="bg-[#0a1c13] border border-white/10 p-6 rounded-2xl sticky top-24 shadow-2xl">
                <div className="mb-6">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">টোটাল ইভেন্ট ফি</p>
                    <p className="text-4xl font-black text-white">৳ {event.tour_fee} <span className="text-sm font-medium text-gray-500">/জন</span></p>
                    <p className="text-xs text-[#e76f51] font-bold mt-2">বুকিং মানি (অ্যাডভান্স): ৳ {event.booking_fee}</p>
                </div>

                <div className="space-y-3 mb-6 text-sm text-gray-300">
                    <p className="flex justify-between"><span className="text-gray-500">ডেডলাইন:</span> <span className="font-bold text-red-400">{new Date(event.deadline).toLocaleDateString('en-GB')}</span></p>
                    <p className="flex justify-between"><span className="text-gray-500">থাকার ব্যবস্থা:</span> <span>{event.stay_type}</span></p>
                    <p className="flex justify-between"><span className="text-gray-500">টিম লিডার:</span> <span>{event.team_leader}</span></p>
                </div>

                <div className="border-t border-white/10 pt-6 space-y-3">
                    {/* বুকিং স্ট্যাটাস এবং বাটন লজিক */}
                    
                    {event.status === 'completed' ? (
                        <div className="bg-gray-500/20 text-gray-400 p-4 rounded-xl text-center font-bold">ইভেন্টটি শেষ হয়ে গেছে</div>
                    ) : bookingStatus === 'approved' ? (
                        <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 p-4 rounded-xl text-center flex flex-col items-center">
                            <i className="fa-solid fa-circle-check text-2xl mb-2"></i>
                            <p className="font-bold">আপনার সিট কনফার্মড!</p>
                            <p className="text-xs mt-1">প্যাক করা শুরু করে দিন</p>
                        </div>
                    ) : bookingStatus === 'pending' ? (
                        <div className="bg-blue-500/20 text-blue-400 border border-blue-500/30 p-4 rounded-xl text-center flex flex-col items-center">
                            <i className="fa-solid fa-clock text-2xl mb-2 animate-pulse"></i>
                            <p className="font-bold">পেমেন্ট ভেরিফিকেশনের অপেক্ষায়</p>
                            <p className="text-xs mt-1">অ্যাডমিন কনফার্ম করলে আপডেট পাবেন</p>
                        </div>
                    ) : isFull && bookingStatus !== 'free_booking' && bookingStatus !== 'interested' ? (
                         <div className="bg-red-500/20 text-red-400 p-4 rounded-xl text-center font-bold">সিট ফুল হয়ে গেছে!</div>
                    ) : (
                        <>
                            {/* তিনটি জাদুকরী বাটন */}
                            
                            {bookingStatus === 'free_booking' ? (
                                <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl text-center mb-3">
                                    <p className="text-xs text-yellow-500 font-bold mb-1"><i className="fa-solid fa-ticket"></i> ফ্রি বুকিং অ্যাক্টিভ</p>
                                    <p className="text-[10px] text-gray-400">সিট নিশ্চিত করতে নিচের বাটনে ক্লিক করে পেমেন্ট সম্পন্ন করুন।</p>
                                </div>
                            ) : bookingStatus === 'interested' ? (
                                <div className="bg-purple-500/10 border border-purple-500/30 p-3 rounded-xl text-center mb-3">
                                    <p className="text-xs text-purple-400 font-bold mb-1"><i className="fa-solid fa-heart"></i> আপনি এই ইভেন্টে আগ্রহী</p>
                                </div>
                            ) : null}

                            {!user ? (
                                <Link href="/login" className="w-full block bg-[#e76f51] hover:bg-orange-600 text-white text-center py-3 rounded-xl font-bold transition-all shadow-glow">
                                    বুকিং করতে লগইন করুন
                                </Link>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => setShowPaymentModal(true)} 
                                        disabled={processing}
                                        className="w-full bg-[#e76f51] hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-all shadow-glow flex items-center justify-center gap-2"
                                    >
                                        <i className="fa-solid fa-credit-card"></i> পেমেন্ট করে বুকিং কনফার্ম করুন
                                    </button>

                                    {bookingStatus !== 'free_booking' && (
                                        <button 
                                            onClick={handleFreeBooking} 
                                            disabled={processing}
                                            className="w-full bg-black/40 border border-white/10 hover:border-yellow-500 hover:text-yellow-500 text-gray-300 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                        >
                                            <i className="fa-solid fa-ticket"></i> বিনামূল্যে সিট বুক করুন
                                        </button>
                                    )}

                                    {bookingStatus !== 'interested' && bookingStatus !== 'free_booking' && (
                                        <button 
                                            onClick={handleInterested} 
                                            disabled={processing}
                                            className="w-full bg-black/40 border border-white/10 hover:border-purple-500 hover:text-purple-400 text-gray-300 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                        >
                                            <i className="fa-solid fa-heart"></i> ইন্টারেস্টেড মার্ক করুন
                                        </button>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* পেমেন্ট ইনফো মডেল */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}></div>
            <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-md relative z-10 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-white"><i className="fa-solid fa-wallet text-[#e76f51] mr-2"></i> পেমেন্ট কনফার্মেশন</h3>
                    <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-white"><i className="fa-solid fa-xmark text-xl"></i></button>
                </div>
                
                <div className="bg-black/30 border border-white/5 p-4 rounded-xl mb-6 text-sm text-gray-300 leading-relaxed">
                    অনুগ্রহ করে নিচের নাম্বারে <b>৳ {event.booking_fee}</b> সেন্ড মানি করুন এবং তারপর TrxID টি সাবমিট করুন। <br/><br/>
                    <span className="text-[#e76f51] font-bold">নাম্বার ও মেথড:</span> <br/>{event.payment_methods}
                </div>

                <form onSubmit={submitPaidBooking} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">কোন মেথডে টাকা পাঠিয়েছেন? *</label>
                        <select required value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-[#e76f51]">
                            <option value="" disabled>নির্বাচন করুন</option>
                            <option value="bkash">bKash</option>
                            <option value="nagad">Nagad</option>
                            <option value="rocket">Rocket</option>
                            <option value="cash">হাতে ক্যাশ দিয়েছি</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">ট্রানজেকশন আইডি (TrxID) *</label>
                        <input type="text" required value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="e.g. 9J2H8KX6P" className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-[#e76f51] uppercase" />
                    </div>
                    <button type="submit" disabled={processing} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold mt-2 transition-all flex justify-center items-center gap-2">
                        {processing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                        সাবমিট বুকিং
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}

export default function EventDetailsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050b08] flex items-center justify-center"><i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#e76f51]"></i></div>}>
      <EventDetailsContent />
    </Suspense>
  )
}
