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
