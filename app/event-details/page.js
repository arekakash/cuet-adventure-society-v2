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
  const [isAdmin, setIsAdmin] = useState(false)
  
  const [bookingStatus, setBookingStatus] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [trxId, setTrxId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')

  const [approvedExplorers, setApprovedExplorers] = useState([])
  const [interestedExplorers, setInterestedExplorers] = useState([])

  // 🔴 অ্যাডমিন মডাল এবং ফর্ম স্টেট
  const [showAdminAddModal, setShowAdminAddModal] = useState(false)
  const [adminAddTab, setAdminAddTab] = useState('search') // 'search' or 'create'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [newMemberForm, setNewMemberForm] = useState({ full_name: '', department: '', batch: '' })

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

        // Fetch Participants
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
              .filter(b => b.status === 'interested' || b.status === 'pending' || b.status === 'free_booking' || b.status === 'claim_pending')
              .map(b => b.profiles)
              .filter(Boolean)

            setApprovedExplorers(approved)
            setInterestedExplorers(interested)
          }
        }

        // Fetch User Auth & Profile
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          if (isMounted) setUser(session.user)
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            
          if (isMounted) {
            setUserProfile(profile)
            if (profile?.role === 'admin') setIsAdmin(true)
          }

          // Check if user already has a booking/claim
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

  const checkProfileCompletion = () => {
    if (!user) {
      if (window.confirm("বুকিং বা ক্লেইম করার আগে আপনাকে লগইন করতে হবে। লগইন পেজে যেতে চান?")) {
        router.push('/login')
      }
      return false
    }
    if (!userProfile?.student_id || !userProfile?.phone || !userProfile?.emergency_contact) {
      alert("আপনার প্রোফাইল অসম্পূর্ণ! ড্যাশবোর্ড থেকে প্রোফাইলের জরুরি তথ্যগুলো পূরণ করুন।")
      router.push('/dashboard')
      return false
    }
    return true
  }

  // Attendance Claim লজিক
  const handleAttendanceClaim = async () => {
    if (!checkProfileCompletion()) return
    if (!window.confirm("আপনি কি এই ইভেন্টে অংশগ্রহণ করেছিলেন? আপনার ক্লেইম অ্যাডমিন প্যানেলে ভেরিফিকেশনের জন্য পাঠানো হবে।")) return
    
    setProcessing(true)
    try {
      const { error } = await supabase.from('bookings').upsert({
        user_id: user.id, event_id: eventId, status: 'claim_pending', payment_method: 'none', trx_id: 'CLAIM'
      }, { onConflict: 'user_id, event_id' })
      
      if (error) throw error
      setBookingStatus('claim_pending')
      alert("আপনার ক্লেইম সফলভাবে পাঠানো হয়েছে। অ্যাডমিন অ্যাপ্রুভ করলে এটি প্রোফাইলে যুক্ত হবে।")
    } catch (err) { 
      alert(err.message) 
    } finally { 
      setProcessing(false) 
    }
  }

  // Admin Search Members
  const handleSearchMembers = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setProcessing(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, department, batch, photo_url')
        .ilike('full_name', `%${searchQuery}%`)
        .limit(5)
      if (error) throw error
      setSearchResults(data || [])
    } catch (err) {
      alert("খুঁজতে সমস্যা হয়েছে: " + err.message)
    } finally {
      setProcessing(false)
    }
  }

  // Admin Add Existing Member to Event
  const adminAddExistingMember = async (memberId) => {
    if (!window.confirm("এই মেম্বারকে ইভেন্টে যুক্ত করতে চান?")) return
    setProcessing(true)
    try {
      const { error } = await supabase.from('bookings').upsert({
        user_id: memberId, event_id: eventId, status: 'approved', payment_method: 'admin_added', trx_id: 'ADMIN'
      }, { onConflict: 'user_id, event_id' })
      if (error) throw error
      alert("মেম্বার সফলভাবে যুক্ত হয়েছে! পেজটি রিলোড করুন।")
      window.location.reload()
    } catch (err) {
      alert(err.message)
    } finally {
      setProcessing(false)
    }
  }

  // 🔴 Admin Create Offline Member & Add (Updated Logic for Optional Fields)
  const handleCreateOfflineMember = async (e) => {
    e.preventDefault()
    setProcessing(true)
    try {
      // Create a fake/offline profile id
      const fakeId = `offline-${Date.now()}`
      
      // 1. Insert into Profiles (Safely handle empty optional fields)
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: fakeId,
        full_name: newMemberForm.full_name,
        department: newMemberForm.department ? newMemberForm.department.toUpperCase() : '',
        batch: newMemberForm.batch ? newMemberForm.batch : null,
        role: 'explorer',
        is_offline: true 
      }])
      if (profileError) throw profileError

      // 2. Insert into Bookings
      const { error: bookingError } = await supabase.from('bookings').insert([{
        user_id: fakeId, event_id: eventId, status: 'approved', payment_method: 'admin_created', trx_id: 'ADMIN_OFFLINE'
      }])
      if (bookingError) throw bookingError

      alert("নতুন অ্যাকাউন্ট খোলা হয়েছে এবং ইভেন্টে যুক্ত করা হয়েছে! পেজটি রিলোড করুন।")
      window.location.reload()
    } catch (err) {
      alert("অ্যাকাউন্ট খুলতে সমস্যা হয়েছে: " + err.message)
    } finally {
      setProcessing(false)
    }
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

  if (loading) return <div className="min-h-screen bg-[#050b08] flex items-center justify-center"><i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#e76f51]"></i></div>
  if (!event) return <div className="min-h-screen bg-[#050b08] flex items-center justify-center text-white"><p>ইভেন্টটি খুঁজে পাওয়া যায়নি!</p></div>

  const isFull = (event.booked_seats || 0) >= event.total_seats
  const isPastEvent = event.status === 'completed'
  const isCycling = event.category === 'Cycling'
  const isSwimming = event.category === 'Swimming' || event.category === 'Houseboat/Cruise'
  const isDayEvent = event.category === 'Day Tour' || event.category === 'Workshop'

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

  const isUserApproved = user && approvedExplorers.some(exp => exp.id === user.id)

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

            {/* Horizontal Scroll Participant List */}
            {isPastEvent && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                    <h3 className="text-lg font-bold text-white border-l-4 border-emerald-400 pl-3">সাফল্যের সাথে সম্পন্নকারী (The Explorers)</h3>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">{approvedExplorers.length} জন</span>
                  </div>
                  
                  {approvedExplorers.length > 0 ? (
                    <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar snap-x">
                      {approvedExplorers.map((p) => (
                        <Link href={`/public-profile?id=${p.id}`} key={p.id} className="snap-start shrink-0 w-24 sm:w-28 text-center group flex flex-col items-center">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden mb-2 border-2 border-transparent group-hover:border-[#e76f51] transition-all shadow-lg relative">
                            <img src={p.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=0a1c13&color=fff`} alt={p.full_name} className="w-full h-full object-cover" />
                            {p.role === 'admin' && (
                              <div className="absolute bottom-0 bg-[#e76f51] w-full text-[8px] font-black text-white uppercase tracking-widest text-center">Admin</div>
                            )}
                          </div>
                          <p className="text-xs font-bold text-gray-300 line-clamp-2 leading-tight group-hover:text-white transition-colors">{p.full_name}</p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                      <p className="text-gray-400 text-sm">দুঃখিত, এই ইভেন্টের অংশগ্রহণকারীদের কোনো ডেটা পাওয়া যায়নি।</p>
                    </div>
                  )}

                  {/* Attendance Claim & Admin Add Panel */}
                  <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-center p-4 bg-white/5 rounded-2xl border border-white/10">
                    {!isUserApproved && bookingStatus !== 'claim_pending' && (
                      <button 
                        onClick={handleAttendanceClaim}
                        disabled={processing}
                        className="text-xs font-bold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500 border border-blue-500/30 px-5 py-2.5 rounded-full transition-all flex items-center gap-2"
                      >
                        <i className="fa-solid fa-hand-sparkles"></i> আমিও এই ইভেন্টে ছিলাম
                      </button>
                    )}
                    {bookingStatus === 'claim_pending' && (
                      <span className="text-xs font-bold text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 px-5 py-2.5 rounded-full flex items-center gap-2">
                        <i className="fa-solid fa-clock animate-pulse"></i> আপনার ক্লেইম পেন্ডিং আছে
                      </span>
                    )}

                    {isAdmin && (
                      <button 
                        onClick={() => setShowAdminAddModal(true)}
                        className="text-xs font-bold text-[#e76f51] hover:text-white bg-[#e76f51]/10 hover:bg-[#e76f51] border border-[#e76f51]/30 px-5 py-2.5 rounded-full transition-all flex items-center gap-2"
                      >
                        <i className="fa-solid fa-user-plus"></i> পার্টিসিপেন্ট অ্যাড করুন (Admin)
                      </button>
                    )}
                  </div>
                </div>

                {/* Interested Souls (Horizontal Scroll) */}
                {interestedExplorers.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                      <h3 className="text-sm font-bold text-gray-400 border-l-2 border-purple-400 pl-2">আগ্রহী ছিলেন যারা (Interested Souls)</h3>
                    </div>
                    <div className="flex overflow-x-auto gap-3 pb-2 custom-scrollbar-hidden">
                      {interestedExplorers.map((p) => (
                        <Link href={`/public-profile?id=${p.id}`} key={p.id} className="flex items-center gap-2 shrink-0 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/30 rounded-full pr-4 p-1 transition-all">
                          <img src={p.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=0a1c13&color=fff`} className="w-6 h-6 rounded-full object-cover" alt={p.full_name} />
                          <span className="text-[10px] font-bold text-gray-400">{p.full_name}</span>
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
                                    <div className="space-y-3">
                                      <button onClick={checkProfileCompletion} className="w-full block bg-[#e76f51] hover:bg-orange-600 text-white text-center py-3 rounded-xl font-bold transition-all shadow-glow">
                                          বুকিং করতে লগইন করুন
                                      </button>
                                      <button onClick={checkProfileCompletion} className="w-full bg-black/40 border border-white/10 hover:border-yellow-500 hover:text-yellow-500 text-gray-300 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                                          <i className="fa-solid fa-ticket"></i> বিনামূল্যে সিট বুক করুন
                                      </button>
                                    </div>
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
                                        
                                        {!bookingStatus && (
                                          <button onClick={handleInterested} disabled={processing} className="w-full bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500 hover:text-white text-purple-400 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 mt-2">
                                              <i className="fa-solid fa-heart"></i> আগ্রহী
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

      {/* 🔴 Admin Add Member Modal */}
      {showAdminAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAdminAddModal(false)}></div>
            <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-6 w-full max-w-lg relative z-10 shadow-2xl">
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h3 className="text-lg font-black text-white flex items-center gap-2"><i className="fa-solid fa-user-plus text-[#e76f51]"></i> পার্টিসিপেন্ট যোগ করুন</h3>
                    <button onClick={() => setShowAdminAddModal(false)} className="text-gray-400 hover:text-white"><i className="fa-solid fa-xmark text-xl"></i></button>
                </div>

                <div className="flex gap-2 mb-6">
                  <button onClick={() => setAdminAddTab('search')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors border ${adminAddTab === 'search' ? 'bg-[#e76f51]/20 text-[#e76f51] border-[#e76f51]/50' : 'bg-transparent text-gray-400 border-transparent hover:bg-white/5'}`}>রেজিস্টার্ড মেম্বার খুঁজুন</button>
                  <button onClick={() => setAdminAddTab('create')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors border ${adminAddTab === 'create' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'bg-transparent text-gray-400 border-transparent hover:bg-white/5'}`}>নতুন অ্যাকাউন্ট খুলুন</button>
                </div>

                {adminAddTab === 'search' ? (
                  <form onSubmit={handleSearchMembers}>
                    <div className="flex gap-2 mb-4">
                      <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="মেম্বারের নাম লিখুন..." className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-[#e76f51] text-sm" />
                      <button type="submit" disabled={processing} className="bg-[#e76f51] text-white px-4 rounded-xl font-bold hover:bg-orange-600 transition-colors"><i className="fa-solid fa-magnifying-glass"></i></button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                      {searchResults.length === 0 ? (
                        <p className="text-center text-xs text-gray-500 py-4">সার্চ করে মেম্বার খুঁজুন</p>
                      ) : (
                        searchResults.map(member => (
                          <div key={member.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/20 transition-colors">
                            <div className="flex items-center gap-3">
                              <img src={member.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=0a1c13&color=fff`} className="w-8 h-8 rounded-full" alt="avatar" />
                              <div>
                                <p className="text-sm font-bold text-white leading-none">{member.full_name}</p>
                                <p className="text-[10px] text-gray-400 mt-1">{member.department} '{String(member.batch).slice(-2)}</p>
                              </div>
                            </div>
                            <button type="button" onClick={() => adminAddExistingMember(member.id)} disabled={processing} className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-500 hover:text-white transition-colors">Add</button>
                          </div>
                        ))
                      )}
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleCreateOfflineMember} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1.5">সম্পূর্ণ নাম *</label>
                      <input type="text" required value={newMemberForm.full_name} onChange={(e) => setNewMemberForm({...newMemberForm, full_name: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-blue-400 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1.5">ডিপার্টমেন্ট (ঐচ্ছিক)</label>
                        <input type="text" placeholder="e.g. CSE" value={newMemberForm.department} onChange={(e) => setNewMemberForm({...newMemberForm, department: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-blue-400 text-sm uppercase" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1.5">ব্যাচ (ঐচ্ছিক)</label>
                        <input type="number" placeholder="e.g. 2021" value={newMemberForm.batch} onChange={(e) => setNewMemberForm({...newMemberForm, batch: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-blue-400 text-sm" />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight">অ্যাকাউন্ট তৈরি করার সাথে সাথেই মেম্বারটি ইভেন্ট লিস্টে যুক্ত হবে এবং তার একটি অফলাইন প্রোফাইল ডেটাবেসে সেভ হবে।</p>
                    <button type="submit" disabled={processing} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold mt-2 transition-all flex justify-center items-center gap-2">
                        {processing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-plus"></i>}
                        অ্যাকাউন্ট তৈরি করুন ও অ্যাড করুন
                    </button>
                  </form>
                )}
            </div>
        </div>
      )}

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

আমার পাবলিক প্রোফাইল টাতে কিছু কাস্টমাইজেশন করা দরকার । 

বর্তমানে যে ডিজাইনটি রয়েছে সেটিতে একজন ইউজার যখন লগইন করা থাকেন না এবং কোন ব্যক্তির নাম লিডার বোর্ডে দেখে সেটার ওপর ক্লিক করেন, তখন তাকে লগইন করার জন্য বলা হয় । কিন্তু একজন সাধারণ পাবলিক ইউজার কেন এই সাইটে লগইন করতে যাবেন? তার তো এখানে কোন প্রোফাইল খোলার প্রয়োজন নাই বা সে একজন ইউজার নাও হতে পারে । তো তাকে কেন আমি জোরপূর্বক অ্যাকাউন্ট তৈরি করতে বাধ্য করব । এটি তো একটি পাবলিক প্রোফাইল এবং এটি সবার জন্য উন্মুক্ত থাকা উচিত । আমার মনে হয় আমি কোথায় একটা ভুল করে ফেলেছিলাম ।  আমি তোমাকে বর্তমান পাবলিক প্রোফাইলের যে ফাইলটি দেব সেই ফাইলে তুমি এই ভুলটি সংশোধন করে দাও । 

সর্বশেষ আমি এই পেজটিতে যা যা যুক্ত করে তোমাকে দিয়েছিলাম সেগুলো ঠিক রাখবে । শুধু একটা ছোট অপটিমাইজেশন করবে সেটি হচ্ছে মোবাইল ভার্সনে ছবি এবং ইউজারের ইনফরমেশন গুলো একটি কার্ডে দেয়া আছে । তুমি এই কার্ডে ছবিটার সাইজ সামান্য আরেকটু ছোট করে দিও । আর কম্পিউটার ভার্সনে তো পাশাপাশি রয়েছে সেটা নিয়ে কোন সমস্যা নেই । 

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AOS from 'aos'
import 'aos/dist/aos.css'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [bookings, setBookings] = useState([])
  const [rank, setRank] = useState('-')

  const [showCompletionForm, setShowCompletionForm] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [formData, setFormData] = useState({
    student_id: '', phone: '', department: '', batch: '', gender: '', blood_group: '',
    hall: '', tshirt_size: '', emergency_contact: '', emergency_relation: '',
    swimming_skill: '', has_bicycle: '', experience_level: ''
  })

  const years = Array.from({ length: 2050 - 1968 + 1 }, (_, i) => 2050 - i)

  const maleHalls = [
    "Dr. Qudrat-E-Khuda Hall", "Kabi Kazi Nazrul Islam Hall", "Muktijoddha Hall",
    "Shaheed Abu Sayeed Hall", "Shaheed Mohammad Shah Hall", "Shaheed Tareq Huda Hall"
  ]

  const femaleHalls = [
    "Sufia Kamal Hall", "Shamsennahar Khan Hall", "Taposhi Rabeya Hall"
  ]

  useEffect(() => {
    AOS.init({ once: true, offset: 50 })
    let isMounted = true

    const initializeDashboard = async () => {
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        await new Promise(resolve => setTimeout(resolve, 800))
      }

      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        if (isMounted) router.push('/login')
        return
      }

      await fetchUserData(session.user.id)
    }

    initializeDashboard()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        fetchUserData(session.user.id)
      }
    })

    return () => {
      isMounted = false
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
  }, [router])

  const fetchUserData = async (userId) => {
    try {
      // 🔴 আপডেট: survival_iq এবং total_events ফেচ করা হচ্ছে
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, survival_iq, total_events, total_rides, cycling_distance, total_swims, swimming_distance')
        .eq('id', userId)
        .single()

      if (profileError) {
        if (profileError.code === 'PGRST116') { 
          const { data: { session } } = await supabase.auth.getSession()
          setUser({ 
            id: userId, 
            full_name: session?.user?.user_metadata?.full_name || 'Explorer', 
            photo_url: session?.user?.user_metadata?.avatar_url || '' 
          })
          setShowCompletionForm(true)
          setLoading(false)
          return
        }
        throw profileError
      }
      
      setUser(profileData)

      if (!profileData.student_id || !profileData.phone || !profileData.blood_group) {
        setShowCompletionForm(true)
      }

      const totalActivities = (profileData.total_treks || 0) + (profileData.total_rides || 0) + (profileData.total_swims || 0)
      if (totalActivities > 0 || profileData.survival_iq > 0) {
        const { count, error: rankError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('survival_iq', profileData.survival_iq || 0) // আপাতত Survival IQ এর ভিত্তিতে র‍্যাংক
        
        if (!rankError) setRank(count + 1)
      }

      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id, status, trx_id, payment_method, created_at,
          events (id, title, start_date, cover_photo, destination, category)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!bookingError && bookingData) {
        setBookings(bookingData)
      }

    } catch (error) {
      console.error('ড্যাশবোর্ড ডেটা লোড করতে সমস্যা:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFormChange = (e) => {
    const { id, value } = e.target;
    if (id === 'gender') {
      setFormData((prev) => ({ ...prev, gender: value, hall: '' }));
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  }

  const handleProfileComplete = async (e) => {
    e.preventDefault()
    setUpdating(true)
    
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: user.full_name,
        photo_url: user.photo_url,
        role: user.role || 'explorer',
        student_id: formData.student_id,
        phone: formData.phone,
        department: formData.department.toUpperCase(),
        batch: formData.batch,
        gender: formData.gender,
        blood_group: formData.blood_group,
        hall: formData.hall,
        tshirt_size: formData.tshirt_size,
        emergency_contact: formData.emergency_contact,
        emergency_relation: formData.emergency_relation,
        swimming_skill: formData.swimming_skill,
        has_bicycle: formData.has_bicycle,
        experience_level: formData.experience_level
      })

      if (error) throw error

      setUser({ ...user, ...formData })
      setShowCompletionForm(false)
      alert('অ্যাডভেঞ্চার প্রোফাইল সফলভাবে আপডেট হয়েছে!')
      
    } catch (err) {
      alert('প্রোফাইল আপডেট ফেইল করেছে: ' + err.message)
    } finally {
      setUpdating(false)
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest"><i className="fa-solid fa-check-circle mr-1"></i> কনফার্মড</span>
      case 'pending':
        return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest animate-pulse"><i className="fa-solid fa-clock mr-1"></i> পেন্ডিং</span>
      case 'free_booking':
        return <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest"><i className="fa-solid fa-ticket mr-1"></i> ফ্রি বুকিং</span>
      case 'interested':
        return <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest"><i className="fa-solid fa-heart mr-1"></i> ইন্টারেস্টেড</span>
      default:
        return <span className="bg-gray-500/20 text-gray-400 border border-gray-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest">Unknown</span>
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Trekking': return 'fa-solid fa-mountain'
      case 'Cycling': return 'fa-solid fa-bicycle'
      case 'Swimming': return 'fa-solid fa-person-swimming'
      default: return 'fa-solid fa-compass'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-[#050b08]">
        <i className="fa-solid fa-compass fa-spin text-4xl text-[#e76f51]"></i>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-[#050b08]">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-[#e76f51] mb-4"></i>
        <h2 className="text-2xl font-bold text-white mb-2">ডেটা সিঙ্কিং ফেইলর</h2>
        <p className="text-gray-400 max-w-md mb-6">আপনার অ্যাকাউন্টের তথ্য সার্ভার থেকে লোড করা সম্ভব হয়নি। অনুগ্রহ করে পেজটি রিলোড করুন অথবা পুনরায় লগইন করুন.</p>
        <button onClick={() => window.location.reload()} className="bg-[#2d6a4f] text-white px-6 py-2 rounded-lg font-bold">রিলোড করুন</button>
      </div>
    )
  }

  if (showCompletionForm) {
    return (
      <div className="min-h-screen bg-[#050b08] flex items-center justify-center p-4 relative z-50">
        <div className="max-w-4xl w-full bg-[#0a1c13] border border-[#e76f51]/30 rounded-3xl p-8 shadow-[0_0_30px_rgba(231,111,81,0.15)] max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div className="text-center mb-8 border-b border-white/10 pb-6">
            <i className="fa-solid fa-triangle-exclamation text-4xl text-yellow-500 mb-3 animate-bounce"></i>
            <h2 className="text-2xl font-black text-white">প্রোফাইল অসম্পূর্ণ!</h2>
            <p className="text-gray-400 text-sm mt-2">গুগল দিয়ে লগইন করার কারণে আপনার কিছু গুরুত্বপূর্ণ তথ্য মিসিং আছে। ড্যাশবোর্ডে প্রবেশ করতে ফর্মটি পূরণ করুন।</p>
          </div>
          
          <form onSubmit={handleProfileComplete} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-gray-300">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase">স্টুডেন্ট আইডি *</label>
                <input type="text" id="student_id" required value={formData.student_id} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl outline-none focus:border-[#e76f51]" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase">ফোন নম্বর *</label>
                <input type="tel" id="phone" required value={formData.phone} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl outline-none focus:border-[#e76f51]" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase">ডিপার্টমেন্ট *</label>
                <input type="text" id="department" required placeholder="e.g. CSE" value={formData.department} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl outline-none focus:border-[#e76f51] uppercase" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase">ব্যাচ *</label>
                <select id="batch" required value={formData.batch} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl outline-none focus:border-[#e76f51]">
                  <option value="" disabled>নির্বাচন করুন</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase">জেন্ডার *</label>
                <select id="gender" required value={formData.gender} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl outline-none focus:border-[#e76f51]">
                  <option value="" disabled>নির্বাচন করুন</option>
                  <option value="Male">Male</option><option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase">আবাসিক হল *</label>
                <select 
                  id="hall" 
                  required 
                  value={formData.hall} 
                  onChange={handleFormChange} 
                  disabled={!formData.gender}
                  className={`w-full bg-black/40 border border-white/10 p-3 rounded-xl outline-none focus:border-[#e76f51] ${!formData.gender ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="" disabled>{formData.gender ? "নির্বাচন করুন" : "প্রথমে জেন্ডার নির্বাচন করুন"}</option>
                  {formData.gender === 'Male' && maleHalls.map(h => <option key={h} value={h}>{h}</option>)}
                  {formData.gender === 'Female' && femaleHalls.map(h => <option key={h} value={h}>{h}</option>)}
                  <option value="Attached/Non-residential">অ্যাটাচড/অনাবাসিক</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase">রক্তের গ্রুপ *</label>
                <select id="blood_group" required value={formData.blood_group} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl outline-none focus:border-[#e76f51]">
                  <option value="" disabled>নির্বাচন করুন</option>
                  <option value="A+">A+</option><option value="B+">B+</option><option value="O+">O+</option><option value="AB+">AB+</option>
                  <option value="A-">A-</option><option value="B-">B-</option><option value="O-">O-</option><option value="AB-">AB-</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase">টি-শার্ট সাইজ *</label>
                <select id="tshirt_size" required value={formData.tshirt_size} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl outline-none focus:border-[#e76f51]">
                  <option value="" disabled>নির্বাচন করুন</option>
                  <option value="S">S</option><option value="M">M</option><option value="L">L</option><option value="XL">XL</option><option value="XXL">XXL</option>
                </select>
              </div>
              
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 p-4 border border-red-500/30 bg-red-500/5 rounded-xl">
                <div>
                  <label className="block text-[11px] font-bold text-red-400 mb-1.5 uppercase">জরুরি কন্টাক্ট নম্বর *</label>
                  <input type="tel" id="emergency_contact" required value={formData.emergency_contact} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-red-400 mb-1.5 uppercase">সম্পর্ক (যেমন: বাবা/ভাই) *</label>
                  <input type="text" id="emergency_relation" required value={formData.emergency_relation} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl outline-none focus:border-red-500" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase">সাঁতার জানেন? *</label>
                <select id="swimming_skill" required value={formData.swimming_skill} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl outline-none focus:border-[#e76f51]">
                  <option value="" disabled>নির্বাচন করুন</option><option value="Yes">হ্যাঁ</option><option value="No">না</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase">নিজের সাইকেল আছে? *</label>
                <select id="has_bicycle" required value={formData.has_bicycle} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl outline-none focus:border-[#e76f51]">
                  <option value="" disabled>নির্বাচন করুন</option><option value="Yes">হ্যাঁ</option><option value="No">না</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase">অ্যাডভেঞ্চার অভিজ্ঞতা *</label>
                <select id="experience_level" required value={formData.experience_level} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl outline-none focus:border-[#e76f51]">
                  <option value="" disabled>নির্বাচন করুন</option>
                  <option value="Beginner">Beginner</option><option value="Intermediate">Intermediate</option><option value="Pro">Pro</option>
                </select>
              </div>
            </div>
            
            <button type="submit" disabled={updating} className="w-full bg-[#e76f51] hover:bg-orange-600 text-white font-black text-lg py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(231,111,81,0.4)] flex justify-center items-center gap-2 mt-6">
              {updating ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-check-circle"></i>}
              <span>{updating ? 'আপডেট হচ্ছে...' : 'প্রোফাইল কমপ্লিট করুন'}</span>
            </button>
          </form>
        </div>
      </div>
    )
  }

  const avatarUrl = user.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=0a1c13&color=fff&size=128`

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 pt-24">
      
      {/* LEFT COLUMN: Profile Info */}
      <div className="space-y-6">
        
        {/* Profile Card */}
        <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden relative" data-aos="fade-right" data-aos-delay="100">
          <div className="h-24 bg-gradient-to-r from-[#0a1c13] via-[#2d6a4f]/40 to-[#0a1c13] border-b border-white/5"></div>
          <div className="px-6 pb-6 relative pt-12"> 
            <div className="w-20 h-20 rounded-2xl border-2 border-[#050b08] overflow-hidden bg-[#0a1c13] absolute -top-10 left-6 shadow-lg transform hover:-translate-y-1 transition-transform">
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-black text-white drop-shadow-md leading-tight">{user.full_name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs font-bold text-[#2d6a4f] bg-[#2d6a4f]/10 px-2.5 py-1 rounded-lg border border-[#2d6a4f]/20">
                  {user.department} '{String(user.batch).slice(-2)}
                </span>
                <div className="flex items-center gap-2">
                  {user.fb_link && (
                    <a href={user.fb_link.startsWith('http') ? user.fb_link : `https://${user.fb_link}`} target="_blank" rel="noreferrer" className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white flex items-center justify-center text-xs transition-all hover:scale-110">
                      <i className="fa-brands fa-facebook-f"></i>
                    </a>
                  )}
                  {user.insta_link && (
                    <a href={user.insta_link.startsWith('http') ? user.insta_link : `https://${user.insta_link}`} target="_blank" rel="noreferrer" className="w-7 h-7 rounded-full bg-pink-600/20 text-pink-400 hover:bg-pink-600 hover:text-white flex items-center justify-center text-xs transition-all hover:scale-110">
                      <i className="fa-brands fa-instagram"></i>
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-400 font-medium">
                <i className="fa-solid fa-building-user text-[#2d6a4f]"></i> <span>{user.hall}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-400 font-medium">
                <i className="fa-solid fa-fingerprint text-[#2d6a4f]"></i> ID: <span className="text-gray-300 font-bold tracking-widest">{user.student_id}</span>
              </div>
              <div className="mt-5 pt-4 border-t border-white/10 flex gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                  <i className="fa-solid fa-shield-check"></i> <span>Identity Verified</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Data */}
        <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-6" data-aos="fade-right" data-aos-delay="200">
          <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-3">
            <h3 className="text-xs font-bold tracking-widest text-gray-500 uppercase flex items-center gap-2">
              <i className="fa-solid fa-microchip text-[#e76f51]"></i> <span>ট্যাকটিক্যাল ডেটা</span>
            </h3>
            <Link href="/edit-profile" className="text-xs font-bold text-[#2d6a4f] hover:text-white transition-colors">এডিট করুন</Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl hover:-translate-y-1 transition-transform">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Blood Group</p>
              <p className="font-black text-red-500 text-lg flex items-center gap-2"><i className="fa-solid fa-droplet"></i> <span>{user.blood_group}</span></p>
            </div>
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl hover:-translate-y-1 transition-transform">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Combat Gear</p>
              <p className="font-black text-[#2d6a4f] text-lg flex items-center gap-2"><i className="fa-solid fa-shirt"></i> <span>{user.tshirt_size}</span></p>
            </div>
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl hover:-translate-y-1 transition-transform">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Swimming</p>
              <p className="font-black text-blue-400 text-base flex items-center gap-2"><i className="fa-solid fa-person-swimming"></i> <span>{user.swimming_skill}</span></p>
            </div>
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl hover:-translate-y-1 transition-transform">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Bicycle</p>
              <p className="font-black text-yellow-500 text-base flex items-center gap-2"><i className="fa-solid fa-bicycle"></i> <span>{user.has_bicycle}</span></p>
            </div>
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl col-span-2 hover:-translate-y-1 transition-transform">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Experience</p>
              <p className="font-black text-purple-400 text-base flex items-center gap-2"><i className="fa-solid fa-award"></i> <span>{user.experience_level}</span></p>
            </div>
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl col-span-2 hover:-translate-y-1 transition-transform">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">SOS Contact</p>
              <p className="font-black text-gray-300 tracking-wider flex items-center gap-2">
                <i className="fa-solid fa-satellite-dish text-blue-400 animate-pulse"></i> 
                <span>{user.emergency_contact} ({user.emergency_relation})</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Stats & Bookings */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* 🔴 General Stats (Rank, IQ, Total Events) */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Link href="/leaderboard" className="bg-[#0a1c13]/70 backdrop-blur-md border border-yellow-500/30 p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center group hover:-translate-y-1 transition-transform" data-aos="zoom-in" data-aos-delay="50">
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center text-base mb-1.5 group-hover:scale-110 transition-transform"><i className="fa-solid fa-crown"></i></div>
            <p className="text-2xl font-black text-white drop-shadow-md">#{rank}</p>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Current Rank</p>
          </Link>

          <Link href="/beginners-guide" className="bg-[#0a1c13]/70 backdrop-blur-md border border-[#34d399]/30 p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center group hover:-translate-y-1 transition-transform" data-aos="zoom-in" data-aos-delay="100">
            <div className="w-8 h-8 rounded-full bg-[#34d399]/20 text-[#34d399] flex items-center justify-center text-base mb-1.5 group-hover:scale-110 transition-transform"><i className="fa-solid fa-brain"></i></div>
            <p className="text-2xl font-black text-white drop-shadow-md">{user.survival_iq || 0}</p>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Survival IQ</p>
          </Link>
          
          <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-[#e76f51]/30 p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center group hover:-translate-y-1 transition-transform" data-aos="zoom-in" data-aos-delay="150">
            <div className="w-8 h-8 rounded-full bg-[#e76f51]/20 text-[#e76f51] flex items-center justify-center text-base mb-1.5 group-hover:scale-110 transition-transform"><i className="fa-solid fa-tent"></i></div>
            <p className="text-2xl font-black text-white drop-shadow-md">{user.total_events || user.total_treks || 0}</p>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Total Events</p>
          </div>
        </div>

        {/* 🔴 Physical Stats (Trekking, Cycling, Swimming) */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-emerald-500/30 p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center group hover:-translate-y-1 transition-transform" data-aos="zoom-in" data-aos-delay="200">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-base mb-1.5 group-hover:scale-110 transition-transform"><i className="fa-solid fa-shoe-prints"></i></div>
            <p className="text-2xl font-black text-white drop-shadow-md">{user.total_distance || 0}<span className="text-[10px] text-gray-500 ml-1 font-normal">km</span></p>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">{user.total_treks || 0} Treks</p>
          </div>
          
          <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-blue-500/30 p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center group hover:-translate-y-1 transition-transform" data-aos="zoom-in" data-aos-delay="250">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-base mb-1.5 group-hover:scale-110 transition-transform"><i className="fa-solid fa-bicycle"></i></div>
            <p className="text-2xl font-black text-white drop-shadow-md">{user.cycling_distance || 0}<span className="text-[10px] text-gray-500 ml-1 font-normal">km</span></p>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">{user.total_rides || 0} Rides</p>
          </div>

          <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-cyan-500/30 p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center group hover:-translate-y-1 transition-transform" data-aos="zoom-in" data-aos-delay="300">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-base mb-1.5 group-hover:scale-110 transition-transform"><i className="fa-solid fa-person-swimming"></i></div>
            <p className="text-2xl font-black text-white drop-shadow-md">{user.swimming_distance || 0}<span className="text-[10px] text-gray-500 ml-1 font-normal">m</span></p>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">{user.total_swims || 0} Swims</p>
          </div>
        </div>

        {/* বুকিং সেকশন */}
        <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden" data-aos="fade-up" data-aos-delay="400">
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
            <h3 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2">
              <i className="fa-solid fa-ticket text-[#e76f51]"></i> <span>আমার বুকিংস ও অ্যাক্টিভিটি</span>
            </h3>
          </div>
          
          {bookings.length > 0 ? (
            <div className="p-6 space-y-4">
              {bookings.map((booking) => (
                <div key={booking.id} className="bg-[#050b08] border border-white/10 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row gap-5 items-start sm:items-center transition-all hover:border-[#e76f51]/50 shadow-md">
                  
                  {/* ইভেন্ট কভার */}
                  <div className="relative w-full sm:w-28 h-20 shrink-0">
                    <img src={booking.events?.cover_photo || 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80'} className="w-full h-full object-cover rounded-xl" alt="Cover" />
                    <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm text-white text-[8px] font-bold uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                      <i className={getCategoryIcon(booking.events?.category)}></i> {booking.events?.category}
                    </div>
                  </div>
                  
                  {/* বিস্তারিত */}
                  <div className="flex-grow">
                      <h4 className="font-bold text-white text-base mb-1.5 line-clamp-1">{booking.events?.title || 'Unknown Event'}</h4>
                      <p className="text-[11px] text-gray-400 mb-2 flex flex-wrap gap-x-4 gap-y-1">
                          <span><i className="fa-solid fa-map-location-dot text-[#e76f51]"></i> {booking.events?.destination}</span>
                          <span><i className="fa-solid fa-calendar text-blue-400"></i> {booking.events?.start_date ? new Date(booking.events.start_date).toLocaleDateString('en-GB') : ''}</span>
                      </p>
                      
                      {booking.trx_id && booking.trx_id !== 'NONE' && booking.trx_id !== 'FREE_BOOKING' && (
                          <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-1">
                              TrxID: <span className="text-gray-300">{booking.trx_id}</span> ({booking.payment_method})
                          </p>
                      )}
                  </div>
                  
                  {/* স্ট্যাটাস ও বাটন */}
                  <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0 items-start sm:items-end mt-2 sm:mt-0">
                      {getStatusBadge(booking.status)}
                      <Link href={`/event-details?id=${booking.events?.id}`} className="text-xs text-blue-400 hover:text-blue-300 font-bold mt-1.5 underline decoration-blue-400/30 underline-offset-4">
                          বিস্তারিত দেখুন <i className="fa-solid fa-arrow-right ml-1"></i>
                      </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center flex flex-col items-center justify-center">
              <i className="fa-solid fa-ticket text-4xl text-gray-600 mb-4 transform -translate-y-2 animate-bounce"></i>
              <p className="text-sm font-medium text-gray-400">আপনার কোনো রানিং বুকিং নেই।</p>
              <Link href="/events" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#e76f51] hover:text-orange-600 transition-colors">
                নতুন ট্রেইল খুঁজুন <i className="fa-solid fa-arrow-right"></i>
              </Link>
            </div>
          )}
        </div>

        {/* Blog Action Banner */}
        <div className="bg-[#0a1c13]/70 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden" data-aos="fade-up" data-aos-delay="500">
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-center bg-[#e76f51]/5 border-l-4 border-[#e76f51]">
            <div className="text-center sm:text-left mb-4 sm:mb-0">
              <h3 className="font-black text-white text-xl mb-1">আপনার অ্যাডভেঞ্চার শেয়ার করুন!</h3>
              <p className="text-sm text-gray-400">ক্যাম্পাস বা ট্যুরের কোনো দারুণ অভিজ্ঞতা আছে? লিখে ফেলুন আমাদের কমিউনিটি ব্লগে।</p>
            </div>
            <Link href="/write-blog" className="w-full sm:w-auto text-center bg-[#e76f51] hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:-translate-y-1 hover:shadow-2xl transition-all whitespace-nowrap shadow-[0_0_15px_rgba(231,111,81,0.4)]">
              <i className="fa-solid fa-pen-nib mr-2"></i> <span>গল্প লিখুন</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
