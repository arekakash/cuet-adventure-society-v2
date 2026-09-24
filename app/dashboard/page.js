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
  
  // States
  const [bookings, setBookings] = useState([])
  const [storeOrders, setStoreOrders] = useState([])
  const [rank, setRank] = useState('-')
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)

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
      await fetchUnreadMessages(session.user.id) 
    }

    initializeDashboard()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        fetchUserData(session.user.id)
        fetchUnreadMessages(session.user.id)
      }
    })

    return () => {
      isMounted = false
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
  }, [router])

  const fetchUnreadMessages = async (userId) => {
    try {
      const { count, error } = await supabase
        .from('cas_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false)
      
      if (!error) {
        setUnreadMessagesCount(count || 0)
      }
    } catch (err) {
      console.error("Error fetching messages count:", err)
    }
  }

  const fetchUserData = async (userId) => {
    try {
      // 1. Profile Data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, survival_iq, total_events, total_treks, total_distance, total_rides, cycling_distance, total_swims, swimming_distance, total_runs, running_distance')
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

      // Rank Calculation
      const totalActivities = (profileData.total_treks || 0) + (profileData.total_rides || 0) + (profileData.total_swims || 0) + (profileData.total_runs || 0)
      if (totalActivities > 0 || profileData.survival_iq > 0) {
        const { count, error: rankError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('survival_iq', profileData.survival_iq || 0) 
        
        if (!rankError) setRank(count + 1)
      }

      // 2. Event Bookings
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id, status, trx_id, payment_method, created_at,
          events!inner (id, title, start_date, cover_photo, destination, category, deleted_at)
        `)
        .eq('user_id', userId)
        .is('events.deleted_at', null)
        .order('created_at', { ascending: false })

      if (!bookingError && bookingData) setBookings(bookingData)

      // 3. Store Orders 
      const { data: storeData, error: storeError } = await supabase
        .from('store_orders')
        .select(`
          id, total_amount, trx_id, payment_method, status, order_type, created_at,
          store_order_items (
            quantity, size_selected, color_selected, rent_start_date, rent_end_date, price_at_time,
            store_products (name, image_url, gallery, category)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!storeError && storeData) setStoreOrders(storeData)

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

  // 🔴 Updated handleProfileComplete with CUET ID Validation & Server Check
  const handleProfileComplete = async (e) => {
    e.preventDefault()
    
    // ১. চুয়েট আইডি ফরম্যাট এবং ডিপার্টমেন্ট কোড ভ্যালিডেশন
    const studentIdStr = formData.student_id.toString().trim()
    const validDeptCodes = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
    
    if (studentIdStr.length !== 7 || isNaN(studentIdStr)) {
      alert('⚠️ ইনভ্যালিড চুয়েট আইডি! স্টুডেন্ট আইডি অবশ্যই ৭ ডিজিটের নাম্বার হতে হবে (যেমন: 2101001)।')
      return
    }

    const deptCode = studentIdStr.substring(2, 4) // মাঝের ২ ডিজিট
    if (!validDeptCodes.includes(deptCode)) {
      alert(`⚠️ ইনভ্যালিড আইডি! '${deptCode}' নামে চুয়েটে কোনো ডিপার্টমেন্ট কোড নেই। দয়া করে সঠিক স্টুডেন্ট আইডি দিন।`)
      return
    }

    setUpdating(true)
    try {
      // ২. সার্ভারে চেক করা আইডিটি আগে ব্যবহৃত হয়েছে কিনা (নিজের আইডি বাদে)
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id, student_id')
        .eq('student_id', studentIdStr)
        .single()

      if (existingUser && existingUser.id !== user.id) {
        alert('❌ এই স্টুডেন্ট আইডি দিয়ে ইতোমধ্যে অন্য একটি অ্যাকাউন্ট তৈরি করা হয়েছে! দয়া করে আপনার নিজের আইডি দিন।')
        setUpdating(false)
        return
      }

      // ৩. প্রোফাইল আপডেট
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: user.full_name,
        photo_url: user.photo_url,
        role: user.role || 'explorer',
        student_id: studentIdStr,
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

      setUser({ ...user, ...formData, student_id: studentIdStr })
      setShowCompletionForm(false)
      alert('✅ অ্যাডভেঞ্চার প্রোফাইল সফলভাবে আপডেট হয়েছে!')
    } catch (err) {
      alert('প্রোফাইল আপডেট ফেইল করেছে: ' + err.message)
    } finally {
      setUpdating(false)
    }
  }


  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved': return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest"><i className="fa-solid fa-check-circle mr-1"></i> কনফার্মড</span>
      case 'pending': return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest animate-pulse"><i className="fa-solid fa-clock mr-1"></i> পেন্ডিং</span>
      case 'rejected': return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest"><i className="fa-solid fa-xmark mr-1"></i> বাতিল</span>
      case 'returned': return <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest"><i className="fa-solid fa-rotate-left mr-1"></i> রিটার্নড</span>
      case 'free_booking': return <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest"><i className="fa-solid fa-ticket mr-1"></i> ফ্রি বুকিং</span>
      case 'interested': return <span className="bg-pink-500/20 text-pink-400 border border-pink-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest"><i className="fa-solid fa-heart mr-1"></i> ইন্টারেস্টেড</span>
      default: return <span className="bg-gray-500/20 text-gray-400 border border-gray-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest">Unknown</span>
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white bg-[#050b08]"><i className="fa-solid fa-compass fa-spin text-4xl text-[#e76f51]"></i></div>
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

  const avatarUrl = user.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=0a1c13&color=fff&size=128`

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 pt-24">
      
      {/* LEFT COLUMN: Profile Info & Inbox */}
      <div className="space-y-6">
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

        {/* 🔴 CAS Messenger (Inbox) Card - Smart Routed */}
        <Link 
  href="/dashboard/inbox" 
  className="block group" 
  data-aos="fade-right" 
  data-aos-delay="200"
>

          <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 backdrop-blur-md border border-blue-500/30 rounded-2xl p-6 shadow-xl hover:shadow-[0_0_25px_rgba(37,99,235,0.3)] transition-all flex items-center justify-between relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <i className="fa-brands fa-facebook-messenger text-8xl text-blue-400"></i>
            </div>
            
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/40 shrink-0 group-hover:bg-blue-500 transition-colors">
                <i className="fa-solid fa-paper-plane text-blue-400 group-hover:text-white text-xl"></i>
              </div>
              <div>
                <h3 className="font-black text-white text-lg leading-tight">CAS Messenger</h3>
                <p className="text-xs text-blue-200 mt-1 font-medium">অ্যাডমিনের মেসেজ ও রিসিট</p>
              </div>
            </div>

            <div className="relative z-10">
              {unreadMessagesCount > 0 ? (
                <span className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-bounce">
                  {unreadMessagesCount}
                </span>
              ) : (
                <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                  <i className="fa-solid fa-chevron-right"></i>
                </span>
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* RIGHT COLUMN: Stats, Tactical Data, & Bookings */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* 🔴 Grid Stats Cards (Total Events Restored + Running Added) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4" data-aos="fade-up">
          <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-yellow-500/30 p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center text-base mb-1.5"><i className="fa-solid fa-crown"></i></div>
            <p className="text-xl font-black text-white">#{rank}</p>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Rank</p>
          </div>
          <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-[#34d399]/30 p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full bg-[#34d399]/20 text-[#34d399] flex items-center justify-center text-base mb-1.5"><i className="fa-solid fa-brain"></i></div>
            <p className="text-xl font-black text-white">{user.survival_iq || 0}</p>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Survival IQ</p>
          </div>
          
          {/* 🔴 Restored Total Events Card */}
          <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-[#e76f51]/30 p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center sm:col-span-2">
            <div className="w-8 h-8 rounded-full bg-[#e76f51]/20 text-[#e76f51] flex items-center justify-center text-base mb-1.5"><i className="fa-solid fa-tent"></i></div>
            <p className="text-xl font-black text-white">{user.total_events || 0}</p>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Total Events</p>
          </div>

          <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-emerald-500/30 p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-base mb-1.5"><i className="fa-solid fa-mountain"></i></div>
            <p className="text-xl font-black text-white">{user.total_treks || 0} <span className="text-sm font-normal text-gray-400 ml-1">{user.total_distance || 0} km</span></p>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Trekking</p>
          </div>
          <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-blue-500/30 p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-base mb-1.5"><i className="fa-solid fa-bicycle"></i></div>
            <p className="text-lg font-black text-white">{user.total_rides || 0} <span className="text-[10px] font-normal text-gray-400 ml-0.5">{user.cycling_distance || 0} km</span></p>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Cycling</p>
          </div>
          <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-cyan-500/30 p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-500 flex items-center justify-center text-base mb-1.5"><i className="fa-solid fa-person-swimming"></i></div>
            <p className="text-lg font-black text-white">{user.total_swims || 0} <span className="text-[10px] font-normal text-gray-400 ml-0.5">{user.swimming_distance || 0} m</span></p>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Swimming</p>
          </div>
          
          <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-orange-500/30 p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-base mb-1.5"><i className="fa-solid fa-person-running"></i></div>
            <p className="text-xl font-black text-white">{user.total_runs || 0} <span className="text-sm font-normal text-gray-400 ml-1">{user.running_distance || 0} km</span></p>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Running</p>
          </div>
        </div>

        {/* Tactical Data Section */}
        <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-6" data-aos="fade-up" data-aos-delay="100">
          <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold tracking-widest text-gray-500 uppercase flex items-center gap-2">
              <i className="fa-solid fa-microchip text-[#e76f51]"></i> <span>ট্যাকটিক্যাল ডেটা</span>
            </h3>
            <Link href="/edit-profile" className="text-xs font-bold text-[#2d6a4f] hover:text-white transition-colors">এডিট করুন</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
              <p className="text-[9px] uppercase font-bold text-gray-500 mb-1">Blood Group</p>
              <p className="font-black text-red-500 text-sm flex items-center gap-2"><i className="fa-solid fa-droplet"></i> <span>{user.blood_group || 'N/A'}</span></p>
            </div>
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
              <p className="text-[9px] uppercase font-bold text-gray-500 mb-1">Combat Gear</p>
              <p className="font-black text-[#2d6a4f] text-sm flex items-center gap-2"><i className="fa-solid fa-shirt"></i> <span>{user.tshirt_size || 'N/A'}</span></p>
            </div>
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
              <p className="text-[9px] uppercase font-bold text-gray-500 mb-1">Swimming Skill</p>
              <p className="font-black text-cyan-400 text-sm flex items-center gap-2"><i className="fa-solid fa-water"></i> <span>{user.swimming_skill || 'N/A'}</span></p>
            </div>
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
              <p className="text-[9px] uppercase font-bold text-gray-500 mb-1">Has Bicycle</p>
              <p className="font-black text-blue-400 text-sm flex items-center gap-2"><i className="fa-solid fa-bicycle"></i> <span>{user.has_bicycle || 'N/A'}</span></p>
            </div>
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl sm:col-span-2">
              <p className="text-[9px] uppercase font-bold text-gray-500 mb-1">Experience Level</p>
              <p className="font-black text-yellow-500 text-sm flex items-center gap-2"><i className="fa-solid fa-star"></i> <span>{user.experience_level || 'N/A'}</span></p>
            </div>
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl sm:col-span-2">
              <p className="text-[9px] uppercase font-bold text-red-400 mb-1">SOS Emergency Contact</p>
              <p className="font-bold text-red-300 text-xs flex items-center gap-2"><i className="fa-solid fa-phone-volume"></i> <span>{user.emergency_contact || 'N/A'} ({user.emergency_relation || 'N/A'})</span></p>
            </div>
          </div>
        </div>

        {/* 1. Event Bookings Section */}
        <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden" data-aos="fade-up" data-aos-delay="200">
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
            <h3 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2">
              <i className="fa-solid fa-ticket text-[#e76f51]"></i> <span>আমার ইভেন্ট বুকিংস</span>
            </h3>
          </div>
          
          {bookings.length > 0 ? (
            <div className="p-6 space-y-4">
              {bookings.map((booking) => (
                <div key={booking.id} className="bg-[#050b08] border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                  <div className="relative w-full sm:w-24 h-16 shrink-0">
                    <img src={booking.events?.cover_photo || 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80'} className="w-full h-full object-cover rounded-xl" alt="Cover" />
                  </div>
                  <div className="flex-grow">
                      <h4 className="font-bold text-white text-sm mb-1">{booking.events?.title || 'Unknown Event'}</h4>
                      <p className="text-[10px] text-gray-400"><i className="fa-solid fa-calendar text-blue-400 mr-1"></i> {booking.events?.start_date ? new Date(booking.events.start_date).toLocaleDateString('en-GB') : ''}</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0 items-start sm:items-end">
                      {getStatusBadge(booking.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-gray-500">আপনার কোনো ইভেন্ট বুকিং নেই।</p>
            </div>
          )}
        </div>

        {/* 2. Store Orders Section (My Orders) */}
        <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden" data-aos="fade-up" data-aos-delay="300">
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
            <h3 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2">
              <i className="fa-solid fa-bag-shopping text-emerald-400"></i> <span>স্টোর অর্ডারস ও গিয়ার রেন্টাল</span>
            </h3>
            <Link href="/store" className="text-[10px] bg-white/5 border border-white/10 hover:border-emerald-500/50 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors font-bold uppercase tracking-widest">
              স্টোরে যান
            </Link>
          </div>
          
          {storeOrders.length > 0 ? (
            <div className="p-6 space-y-6">
              {storeOrders.map((order) => (
                <div key={order.id} className="bg-[#050b08] border border-white/10 p-5 rounded-2xl hover:border-emerald-500/30 transition-all shadow-md">
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 mb-4 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        Order ID: <span className="text-gray-300">{order.id.slice(0, 8)}</span>
                      </p>
                      <p className="text-[10px] text-gray-400">
                        <i className="fa-solid fa-calendar-days mr-1 text-blue-400"></i> 
                        {new Date(order.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>

                    <div className="text-left sm:text-right w-full sm:w-auto bg-black/40 sm:bg-transparent p-4 sm:p-0 rounded-xl sm:rounded-none border border-white/5 sm:border-none flex flex-col gap-3">
                      <div className="flex justify-between sm:justify-end items-center gap-6">
                        <div className="text-left sm:text-right">
                          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">TrxID</p>
                          <p className="text-xs font-mono font-bold text-gray-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">{order.trx_id || 'N/A'}</p>
                        </div>
                        <div className="text-right border-l border-white/10 pl-6">
                          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Payment via</p>
                          <p className="text-[11px] font-black text-orange-400 tracking-wider truncate max-w-[120px] sm:max-w-none">{order.payment_method || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex justify-between sm:justify-end items-center gap-4 pt-3 border-t border-white/5 sm:border-none sm:pt-0">
                        <div className="mb-0">{getStatusBadge(order.status)}</div>
                        <p className="text-sm font-black text-emerald-400">Total: ৳{order.total_amount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {order.store_order_items?.map((item, idx) => {
                      const productName = item.store_products?.name || 'Product Unavailable / Deleted';
                      const productImage = item.store_products?.gallery?.[0]?.url || item.store_products?.image_url || null;

                      return (
                        <div key={idx} className="flex items-start sm:items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                          
                          {productImage ? (
                            <img src={productImage} alt="Product" className="w-12 h-12 rounded-lg object-contain bg-black/40 p-1 shrink-0 border border-white/5" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 shrink-0">
                              <i className="fa-solid fa-box-open text-gray-600 text-xl"></i>
                            </div>
                          )}
                          
                          <div className="flex-grow min-w-0">
                            <h4 className={`text-sm font-bold truncate pr-2 ${item.store_products ? 'text-white' : 'text-gray-500 line-through'}`}>{productName}</h4>
                            
                            <div className="text-[10px] mt-1.5 flex flex-wrap gap-2">
                              <span className="font-bold text-gray-300 bg-black/40 px-2 py-0.5 rounded border border-white/10">Qty: {item.quantity}</span>
                              
                              {item.size_selected && <span className="text-purple-400 border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 rounded font-bold">Size: {item.size_selected}</span>}
                              {item.color_selected && <span className="text-blue-400 border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 rounded font-bold">Color: {item.color_selected}</span>}
                              
                              {item.rent_start_date && (
                                <span className="text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                  <i className="fa-solid fa-calendar-check"></i> {new Date(item.rent_start_date).toLocaleDateString('en-GB')} to {new Date(item.rent_end_date).toLocaleDateString('en-GB')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 text-right self-center">
                            <p className="text-xs font-black text-gray-400 bg-black/30 px-2 py-1 rounded-lg">৳{item.price_at_time}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center flex flex-col items-center justify-center">
              <i className="fa-solid fa-box-open text-5xl text-gray-600 mb-4 transform -translate-y-2 animate-bounce"></i>
              <p className="text-sm font-bold text-gray-400">আপনি স্টোর থেকে এখনো কোনো কেনাকাটা বা রেন্ট করেননি।</p>
            </div>
          )}
        </div>

      </div>

            {/* Profile Completion Form Modal */}
      {showCompletionForm && (
        <div className="fixed inset-0 bg-[#050b08]/95 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-[#0a1c13] border border-white/10 p-6 sm:p-8 rounded-3xl max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="text-center mb-6">
                <i className="fa-solid fa-user-shield text-4xl text-[#e76f51] mb-3"></i>
                <h2 className="text-2xl font-black text-white">প্রোফাইল সম্পূর্ণ করুন</h2>
                <p className="text-sm text-gray-400 mt-2">অ্যাডভেঞ্চারে অংশ নিতে আপনার কিছু গুরুত্বপূর্ণ তথ্য প্রয়োজন</p>
            </div>

            <form onSubmit={handleProfileComplete} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">স্টুডেন্ট আইডি *</label>
                  <input type="number" id="student_id" required value={formData.student_id} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-[#e76f51] transition-colors" placeholder="e.g. 1904001" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">ফোন নম্বর *</label>
                  <input type="tel" id="phone" required value={formData.phone} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-[#e76f51] transition-colors" placeholder="01XXXXXXXXX" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">ডিপার্টমেন্ট *</label>
                  <input type="text" id="department" required value={formData.department} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-[#e76f51] uppercase transition-colors" placeholder="CSE" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">ব্যাচ *</label>
                  <select id="batch" required value={formData.batch} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-[#e76f51] transition-colors">
                    <option value="">নির্বাচন করুন</option>
                    {years.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">জেন্ডার *</label>
                  <select id="gender" required value={formData.gender} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-[#e76f51] transition-colors">
                    <option value="">নির্বাচন করুন</option>
                    <option value="Male">Male (ছাত্র)</option>
                    <option value="Female">Female (ছাত্রী)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">রক্তের গ্রুপ *</label>
                  <select id="blood_group" required value={formData.blood_group} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-[#e76f51] transition-colors">
                    <option value="">নির্বাচন করুন</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
                
                {formData.gender && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">হল (Hall) *</label>
                    <select id="hall" required value={formData.hall} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-[#e76f51] transition-colors">
                      <option value="">হল নির্বাচন করুন</option>
                      {(formData.gender === 'Male' ? maleHalls : femaleHalls).map(hall => <option key={hall} value={hall}>{hall}</option>)}
                      <option value="Non-Residential / Outside">Non-Residential / Outside</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 pt-5 mt-5">
                <h3 className="text-[#e76f51] font-bold text-sm mb-4 uppercase tracking-widest"><i className="fa-solid fa-kit-medical mr-2"></i> ইমার্জেন্সি কন্টাক্ট</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5">ফোন নম্বর (পিতা/মাতা/অভিভাবক) *</label>
                    <input type="tel" id="emergency_contact" required value={formData.emergency_contact} onChange={handleFormChange} className="w-full bg-black/40 border border-red-500/20 p-3 rounded-xl text-white outline-none focus:border-red-500 transition-colors" placeholder="01XXXXXXXXX" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5">সম্পর্ক *</label>
                    <select id="emergency_relation" required value={formData.emergency_relation} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-red-500 transition-colors">
                      <option value="">নির্বাচন করুন</option>
                      <option value="Father">পিতা (Father)</option>
                      <option value="Mother">মাতা (Mother)</option>
                      <option value="Brother">ভাই (Brother)</option>
                      <option value="Sister">বোন (Sister)</option>
                      <option value="Spouse">স্বামী/স্ত্রী (Spouse)</option>
                      <option value="Local Guardian">স্থানীয় অভিভাবক</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-5 mt-5">
                <h3 className="text-[#34d399] font-bold text-sm mb-4 uppercase tracking-widest"><i className="fa-solid fa-person-hiking mr-2"></i> ট্যাকটিক্যাল ইনফো</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">টি-শার্ট সাইজ *</label>
                    <select id="tshirt_size" required value={formData.tshirt_size} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-[#34d399] transition-colors">
                      <option value="">নির্বাচন করুন</option>
                      {['S', 'M', 'L', 'XL', 'XXL'].map(size => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">সাঁতার জানেন? *</label>
                    <select id="swimming_skill" required value={formData.swimming_skill} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-[#34d399] transition-colors">
                      <option value="">নির্বাচন করুন</option>
                      <option value="Yes - Expert">হ্যাঁ (খুব ভালো পারি)</option>
                      <option value="Yes - Basic">মোটামুটি (ভয় পাই ভয় নাই)</option>
                      <option value="No">না (পারি না)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">নিজের সাইকেল আছে? *</label>
                    <select id="has_bicycle" required value={formData.has_bicycle} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-[#34d399] transition-colors">
                      <option value="">নির্বাচন করুন</option>
                      <option value="Yes">হ্যাঁ, আছে</option>
                      <option value="No">না, নেই</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">ট্রেকিং এক্সপেরিয়েন্স *</label>
                    <select id="experience_level" required value={formData.experience_level} onChange={handleFormChange} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-[#34d399] transition-colors">
                      <option value="">নির্বাচন করুন</option>
                      <option value="Beginner">Beginner (কখনো পাহাড়ে যাইনি)</option>
                      <option value="Intermediate">Intermediate (মাঝারি মানের ট্রেকিং করেছি)</option>
                      <option value="Pro">Pro (হার্ডকোর ট্রেইল করেছি)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={updating} className="w-full bg-[#e76f51] hover:bg-orange-600 text-white font-black text-lg py-4 rounded-xl mt-6 transition-all shadow-[0_0_20px_rgba(231,111,81,0.3)] flex justify-center items-center gap-2">
                {updating ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
                প্রোফাইল সেভ করুন
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
