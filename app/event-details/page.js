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
  
  const [bookingStatus, setBookingStatus] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [trxId, setTrxId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')

  const [approvedExplorers, setApprovedExplorers] = useState([])
  const [interestedExplorers, setInterestedExplorers] = useState([])

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single()

        if (eventError) throw eventError
        if (isMounted) setEvent(eventData)

        if (eventData.status === 'completed') {
          const { data: bookingData } = await supabase
            .from('bookings')
            .select(`
              status,
              user_id,
              profiles:user_id (id, full_name, photo_url, role)
            `)
            .eq('event_id', eventId)

          if (bookingData && isMounted) {
            const approved = bookingData
              .filter(b => b.status === 'approved')
              .map(b => b.profiles)
              .filter(Boolean)
            
            const interested = bookingData
              .filter(b => b.status === 'interested' || b.status === 'pending' || b.status === 'free_booking')
              .map(b => b.profiles)
              .filter(Boolean)

            setApprovedExplorers(approved)
            setInterestedExplorers(interested)
          }
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          if (isMounted) setUser(session.user)
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (isMounted) setUserProfile(profile)

          if (eventData.status !== 'completed') {
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

  const checkProfileCompletion = () => {
    if (!user) {
      router.push('/login')
      return false
    }
    if (!userProfile?.student_id || !userProfile?.phone || !userProfile?.emergency_contact) {
      alert("আপনার প্রোফাইল অসম্পূর্ণ! বুকিং করার আগে ড্যাশবোর্ড থেকে প্রোফাইলের জরুরি তথ্যগুলো পূরণ করুন।")
      router.push('/dashboard')
      return false
    }
    return true
  }

  const handleInterested = async () => {
    if (!checkProfileCompletion()) return
    setProcessing(true)
    try {
      const { error } = await supabase.from('bookings').upsert({
        user_id: user.id, event_id: eventId, status: 'interested', payment_method: 'none', trx_id: 'NONE'
      }, { onConflict: 'user_id, event_id' })
      if (error) throw error
      setBookingStatus('interested')
      alert("আপনাকে এই ইভেন্টের 'আগ্রহী' তালিকায় যুক্ত করা হয়েছে।")
    } catch (err) { alert(err.message) } finally { setProcessing(false) }
  }

  const handleFreeBooking = async () => {
    if (!checkProfileCompletion()) return
    if (!window.confirm("আপনি বিনামূল্যে একটি সিট বুক করছেন। পেমেন্ট করা ইউজাররা অগ্রাধিকার পাবে। আপনি কি রাজি?")) return
    setProcessing(true)
    try {
      const { error } = await supabase.from('bookings').upsert({
        user_id: user.id, event_id: eventId, status: 'free_booking', payment_method: 'none', trx_id: 'FREE_BOOKING'
      }, { onConflict: 'user_id, event_id' })
      if (error) throw error
      setBookingStatus('free_booking')
      alert("ফ্রি বুকিং সফল হয়েছে! সিট কনফার্ম করতে দ্রুত পেমেন্ট সম্পন্ন করুন।")
    } catch (err) { alert(err.message) } finally { setProcessing(false) }
  }

  const submitPaidBooking = async (e) => {
    e.preventDefault()
    setProcessing(true)
    try {
      const { error } = await supabase.from('bookings').upsert({
        user_id: user.id, event_id: eventId, status: 'pending', payment_method: paymentMethod, trx_id: trxId
      }, { onConflict: 'user_id, event_id' })
      if (error) throw error
      setBookingStatus('pending')
      setShowPaymentModal(false)
      alert("বুকিং রিকোয়েস্ট পাঠানো হয়েছে!")
    } catch (err) { alert(err.message) } finally { setProcessing(false) }
  }

  if (loading) return <div className="min-h-screen bg-[#050b08] flex items-center justify-center"><i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#e76f51]"></i></div>
  if (!event) return <div className="min-h-screen bg-[#050b08] flex items-center justify-center text-white"><p>ইভেন্টটি খুঁজে পাওয়া যায়নি!</p></div>

  const isFull = (event.booked_seats || 0) >= event.total_seats
  const isPastEvent = event.status === 'completed'
  const isCycling = event.category === 'Cycling'
  const isSwimming = event.category === 'Swimming' || event.category === 'Houseboat/Cruise'
  const isDayEvent = event.category === 'Day Tour' || event.category === 'Workshop'

  // 🔴 ডায়নামিক আইকন ও লেবেল লজিক
  const getDistanceIcon = () => {
    if (isCycling) return 'fa-solid fa-bicycle'
    if (isSwimming) return 'fa-solid fa-person-swimming'
    return 'fa-solid fa-shoe-prints'
  }

  const getDistanceLabel = () => {
    if (isCycling) return 'রাইডিং দূরত্ব'
    if (isSwimming) return 'সাঁতারের দূরত্ব'
    return 'দূরত্ব অতিক্রম'
  }

  const getRewardLabel = () => {
    if (isCycling) return 'Rides'
    if (isSwimming) return 'Swims'
    return 'Treks'
  }

  return (
    <div className="min-h-screen bg-[#050b08] pt-20 pb-20 relative text-gray-300">
      
      {/* ইভেন্ট কভার */}
      <div className="w-full h-[40vh] md:h-[60vh] relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#050b08] via-[#050b08]/50 to-transparent z-10"></div>
        <img src={event.cover_photo || 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80'} className="w-full h-full object-cover" alt="Event Cover" />
        
        {isPastEvent && (
          <div className="absolute top-6 left-4 sm:left-6 z-20 bg-emerald-500/90 backdrop-blur-md text-white text-[10px] sm:text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-emerald-400/50 flex items-center gap-2">
            <i className="fa-solid fa-check-double"></i> Mission Accomplished
          </div>
        )}

        <div className="absolute bottom-0 left-0 w-full z-20 px-4 sm:px-6 pb-8">
            <div className="max-w-5xl mx-auto">
                <span className="bg-[#e76f51] text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3 inline-block flex items-center gap-2 w-max">
                  <i className={isCycling ? "fa-solid fa-bicycle" : isSwimming ? "fa-solid fa-person-swimming" : "fa-solid fa-mountain"}></i>
                  {event.category}
                </span>
                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-2">{event.title}</h1>
            </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* লেফট কলাম */}
        <div className="lg:col-span-2 space-y-8">
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#0a1c13] p-5 rounded-2xl border border-white/10">
                <div className="text-center p-2 border-r border-white/5">
                    <i className="fa-solid fa-map-location-dot text-[#e76f51] text-xl mb-1"></i>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">গন্তব্য</p>
                    <p className="font-bold text-white text-sm">{event.destination}</p>
                </div>
                <div className="text-center p-2 border-r border-white/5">
                    <i className="fa-solid fa-calendar text-blue-400 text-xl mb-1"></i>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">{isPastEvent ? 'অনুষ্ঠিত হয়েছিল' : 'যাত্রা শুরু'}</p>
                    <p className="font-bold text-white text-sm">{new Date(event.start_date).toLocaleDateString('en-GB')}</p>
                </div>
                
                {isPastEvent ? (
                  <>
                    <div className="text-center p-2 border-r border-white/5">
                        <i className={`${getDistanceIcon()} text-emerald-400 text-xl mb-1`}></i>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                          {getDistanceLabel()}
                        </p>
                        <p className="font-bold text-white text-sm">
                          {event.stats_meta?.distance || 0} {isSwimming ? 'm' : 'km'}
                        </p>
                    </div>
                    <div className="text-center p-2">
                        <i className="fa-solid fa-users-viewfinder text-purple-400 text-xl mb-1"></i>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">অভিযাত্রী</p>
                        <p className="font-bold text-white text-sm">{approvedExplorers.length || 0} জন</p>
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
            </div>

            <div>
                <h3 className="text-xl font-bold text-white mb-4 border-l-4 border-[#e76f51] pl-3">{isPastEvent ? 'অভিযানের সারাংশ' : 'অ্যাডভেঞ্চার বিবরণ'}</h3>
                <p className="text-gray-400 leading-relaxed whitespace-pre-line">{event.description}</p>
            </div>

            {isPastEvent && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                    <h3 className="text-xl font-bold text-white border-l-4 border-emerald-400 pl-3">সাফল্যের সাথে সম্পন্নকারী (The Explorers)</h3>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">{approvedExplorers.length} জন</span>
                  </div>
                  
                  {approvedExplorers.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {approvedExplorers.map((p) => (
                        <Link href={`/profile/${p.id}`} key={p.id} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 hover:border-[#e76f51]/50 transition-all group">
                          <div className="w-16 h-16 mx-auto rounded-full overflow-hidden mb-3 border-2 border-[#0a1c13] shadow-[0_0_10px_rgba(0,0,0,0.5)] group-hover:border-[#e76f51] transition-colors">
                            <img src={p.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=0a1c13&color=fff`} alt={p.full_name} className="w-full h-full object-cover" />
                          </div>
                          <p className="text-sm font-bold text-white line-clamp-1 group-hover:text-[#e76f51] transition-colors">{p.full_name}</p>
                          {p.role === 'admin' ? (
                            <p className="text-[9px] text-yellow-500 uppercase tracking-widest mt-1 font-bold">Admin</p>
                          ) : (
                            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Explorer</p>
                          )}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
                      <p className="text-gray-400 text-sm">দুঃখিত, এই ইভেন্টের অংশগ্রহণকারীদের কোনো ডেটা পাওয়া যায়নি।</p>
                    </div>
                  )}
                </div>

                {interestedExplorers.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                      <h3 className="text-lg font-bold text-gray-300 border-l-4 border-purple-400 pl-3">আগ্রহী ছিলেন যারা (Interested Souls)</h3>
                      <span className="text-[10px] font-bold text-purple-400 bg-purple-400/10 px-2.5 py-1 rounded-full border border-purple-400/20">{interestedExplorers.length} জন</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {interestedExplorers.map((p) => (
                        <Link href={`/profile/${p.id}`} key={p.id} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 rounded-full pr-4 p-1 transition-all">
                          <img src={p.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=0a1c13&color=fff`} className="w-8 h-8 rounded-full object-cover" alt={p.full_name} />
                          <span className="text-xs font-bold text-gray-300">{p.full_name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isPastEvent && (
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
            )}

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

        {/* রাইট কলাম */}
        <div className="lg:col-span-1">
            <div className="bg-[#0a1c13] border border-white/10 p-6 rounded-2xl sticky top-24 shadow-2xl">
                
                <div className="mb-6 bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#e76f51]/20 text-[#e76f51] flex items-center justify-center text-xl shrink-0">
                    <i className="fa-solid fa-user-astronaut"></i>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">টিম লিডার</p>
                    <p className="font-bold text-white">{event.team_leader}</p>
                  </div>
                </div>

                {!isPastEvent ? (
                  <>
                    <div className="mb-6">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">টোটাল ইভেন্ট ফি</p>
                        <p className="text-4xl font-black text-white">৳ {event.tour_fee} <span className="text-sm font-medium text-gray-500">/জন</span></p>
                        <p className="text-xs text-[#e76f51] font-bold mt-2">বুকিং মানি (অ্যাডভান্স): ৳ {event.booking_fee}</p>
                    </div>

                    <div className="space-y-3 mb-6 text-sm text-gray-300">
                        <p className="flex justify-between"><span className="text-gray-500">ডেডলাইন:</span> <span className="font-bold text-red-400">{new Date(event.deadline).toLocaleDateString('en-GB')}</span></p>
                        
                        {/* 🔴 Day Event হলে Stay Type হাইড হয়ে যাবে */}
                        {!isDayEvent && event.stay_type && event.stay_type !== 'None' && (
                          <p className="flex justify-between"><span className="text-gray-500">থাকার ব্যবস্থা:</span> <span>{event.stay_type}</span></p>
                        )}
                    </div>

                    <div className="border-t border-white/10 pt-6 space-y-3">
                        {bookingStatus === 'approved' ? (
                            <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 p-4 rounded-xl text-center flex flex-col items-center">
                                <i className="fa-solid fa-circle-check text-2xl mb-2"></i>
                                <p className="font-bold">আপনার সিট কনফার্মড!</p>
                            </div>
                        ) : bookingStatus === 'pending' ? (
                            <div className="bg-blue-500/20 text-blue-400 border border-blue-500/30 p-4 rounded-xl text-center flex flex-col items-center">
                                <i className="fa-solid fa-clock text-2xl mb-2 animate-pulse"></i>
                                <p className="font-bold">পেমেন্ট ভেরিফিকেশনের অপেক্ষায়</p>
                            </div>
                        ) : isFull && bookingStatus !== 'free_booking' && bookingStatus !== 'interested' ? (
                             <div className="bg-red-500/20 text-red-400 p-4 rounded-xl text-center font-bold">সিট ফুল হয়ে গেছে!</div>
                        ) : (
                            <>
                                {bookingStatus === 'free_booking' && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl text-center mb-3">
                                        <p className="text-xs text-yellow-500 font-bold"><i className="fa-solid fa-ticket"></i> ফ্রি বুকিং অ্যাক্টিভ</p>
                                    </div>
                                )}

                                {!user ? (
                                    <Link href="/login" className="w-full block bg-[#e76f51] hover:bg-orange-600 text-white text-center py-3 rounded-xl font-bold transition-all shadow-glow">
                                        বুকিং করতে লগইন করুন
                                    </Link>
                                ) : (
                                    <>
                                        <button onClick={() => setShowPaymentModal(true)} disabled={processing} className="w-full bg-[#e76f51] hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-all shadow-glow flex items-center justify-center gap-2">
                                            <i className="fa-solid fa-credit-card"></i> পেমেন্ট করে বুকিং কনফার্ম করুন
                                        </button>

                                        {bookingStatus !== 'free_booking' && (
                                            <button onClick={handleFreeBooking} disabled={processing} className="w-full bg-black/40 border border-white/10 hover:border-yellow-500 hover:text-yellow-500 text-gray-300 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                                                <i className="fa-solid fa-ticket"></i> বিনামূল্যে সিট বুক করুন
                                            </button>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                      <i className="fa-solid fa-medal text-4xl text-emerald-400 mb-3 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]"></i>
                      <h4 className="text-lg font-black text-white">সাফল্যের সাথে সম্পন্ন</h4>
                      <p className="text-xs text-emerald-500 mt-2 font-bold tracking-widest">CUET ADVENTURE SOCIETY</p>
                    </div>

                    <div className="space-y-3 text-sm text-gray-300">
                      
                      {/* 🔴 ডায়নামিক রিওয়ার্ড প্যানেল */}
                      <p className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-500">রিওয়ার্ড পয়েন্ট:</span> 
                        <span className="font-bold text-yellow-500">+{event.stats_meta?.treks || 0} {getRewardLabel()}</span>
                      </p>
                      
                      {!isDayEvent && event.stay_type && event.stay_type !== 'None' && (
                        <p className="flex justify-between border-b border-white/5 pb-2"><span className="text-gray-500">থাকার ব্যবস্থা:</span> <span>{event.stay_type}</span></p>
                      )}
                      
                      <p className="flex justify-between"><span className="text-gray-500">টোটাল প্যাকেজ ফি:</span> <span>৳ {event.tour_fee}</span></p>
                    </div>

                    {event.album_link && (
                      <div className="pt-4 border-t border-white/10">
                        <a href={event.album_link} target="_blank" rel="noopener noreferrer" className="w-full bg-[#3b82f6] hover:bg-blue-600 text-white py-3.5 rounded-xl font-black transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] flex items-center justify-center gap-3 group">
                          <i className="fa-brands fa-google-drive text-xl group-hover:scale-110 transition-transform"></i> 
                          ইভেন্ট অ্যালবাম দেখুন
                        </a>
                        <p className="text-[10px] text-gray-500 text-center mt-2">অংশগ্রহণকারীদের তোলা ছবি ও স্মৃতি</p>
                      </div>
                    )}
                  </div>
                )}

            </div>
        </div>
      </div>

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
