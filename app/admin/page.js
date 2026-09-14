'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [adminName, setAdminName] = useState('')
  const [activeTab, setActiveTab] = useState('eventTab')
  const [saving, setSaving] = useState(false)

  // ImgBB API (তোমার আগের প্রজেক্টের কি)
  const IMGBB_API_KEY = 'C8e142b508f46f59807dbb6a3a2ccb23'
  const [coverPreview, setCoverPreview] = useState('')
  const [coverFile, setCoverFile] = useState(null)

  // Event Form State
  const [eventData, setEventData] = useState({
    title: '', subtitle: '', category: 'Trekking', destination: '', 
    start_date: '', end_date: '', reporting_place: '', deadline: '', 
    total_seats: '', tour_fee: '', booking_fee: '', refund_policy: 'Non-Refundable', 
    payment_methods: '', stay_type: 'Resort/Hotel Shared', washroom: 'Attached & Shared', 
    food_plan: '', difficulty: 'Moderate', tour_vibe: 'Adventure Survival', 
    fitness_level: '', team_leader: '', leader_phone: '', leader_whatsapp: '', 
    description: '', treks: 1, distance: 0, nights: 0
  })

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', session.user.id)
        .single()

      if (error || data.role !== 'admin') {
        alert('Access Denied! শুধুমাত্র অ্যাডমিনরা এখানে প্রবেশ করতে পারবেন।')
        router.push('/dashboard')
      } else {
        setAdminName(data.full_name.split(' ')[0])
        setLoading(false)
      }
    } catch (err) {
      router.push('/dashboard')
    }
  }

  const handleInputChange = (e) => {
    setEventData({ ...eventData, [e.target.id]: e.target.value })
  }

  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setCoverFile(file)
      setCoverPreview(URL.createObjectURL(file))
    }
  }

  const handleEventSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!coverFile) throw new Error("কভার ছবি সিলেক্ট করুন!")

      // ১. ImgBB-তে ছবি আপলোড
      const formData = new FormData()
      formData.append('image', coverFile)
      
      const imgRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST', body: formData
      })
      const imgData = await imgRes.json()
      if (!imgData.success) throw new Error("ছবি আপলোড ফেইল করেছে!")
      
      const coverUrl = imgData.data.url

      // ২. Supabase-এ ইভেন্ট সেভ করা (JSONB ফিল্ডসহ)
      const { error } = await supabase.from('events').insert([{
        title: eventData.title,
        subtitle: eventData.subtitle,
        category: eventData.category,
        destination: eventData.destination,
        cover_photo: coverUrl,
        start_date: eventData.start_date,
        end_date: eventData.end_date,
        reporting_place: eventData.reporting_place,
        deadline: eventData.deadline,
        total_seats: parseInt(eventData.total_seats),
        tour_fee: parseInt(eventData.tour_fee),
        booking_fee: parseInt(eventData.booking_fee),
        refund_policy: eventData.refund_policy,
        payment_methods: eventData.payment_methods,
        stay_type: eventData.stay_type,
        washroom: eventData.washroom,
        food_plan: eventData.food_plan,
        difficulty: eventData.difficulty,
        tour_vibe: eventData.tour_vibe,
        fitness_level: parseInt(eventData.fitness_level) || 0,
        team_leader: eventData.team_leader,
        leader_phone: eventData.leader_phone,
        leader_whatsapp: eventData.leader_whatsapp,
        description: eventData.description,
        status: 'upcoming',
        stats_meta: {
          treks: parseInt(eventData.treks),
          distance: parseInt(eventData.distance),
          nights: parseInt(eventData.nights)
        }
      }])

      if (error) throw error

      alert('মাস্টারপিস ইভেন্ট সফলভাবে ডেটাবেসে যুক্ত হয়েছে!')
      window.location.reload()

    } catch (err) {
      alert("Error: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050b08]">
        <i className="fa-solid fa-shield text-5xl text-blue-500 animate-pulse mb-4"></i>
        <p className="text-gray-400 font-bold tracking-widest uppercase">Verifying Admin Access...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050b08] text-gray-300 pt-28 pb-20 px-4 sm:px-6">
      
      {/* Header */}
      <div className="fixed top-0 left-0 w-full z-40 bg-black/60 backdrop-blur-xl border-b border-white/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3 text-red-500">
                <i class="fa-solid fa-shield-halved text-2xl"></i>
                <span className="font-black text-xl tracking-widest uppercase hidden sm:block">Admin Panel</span>
            </div>
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors font-bold text-sm bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                <i className="fa-solid fa-arrow-left"></i> ড্যাশবোর্ড
            </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Welcome Card */}
        <div className="bg-[#0a1c13]/70 backdrop-blur-lg border border-white/5 rounded-3xl p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-black text-white">স্বাগতম, <span className="text-[#e76f51]">{adminName}</span>!</h1>
            <p className="text-sm text-gray-400 mt-1 font-medium">CUET AS সিস্টেম কন্ট্রোল সেন্টারে আপনাকে স্বাগতম।</p>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <button onClick={() => setActiveTab('eventTab')} className={`p-5 rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${activeTab === 'eventTab' ? 'border-[#e76f51] bg-[#e76f51]/10' : 'border-white/5 bg-black/40 hover:border-[#e76f51]/50'}`}>
                <i className="fa-solid fa-calendar-plus text-2xl mb-2 text-[#e76f51]"></i>
                <span className="font-black text-sm text-white">নতুন ইভেন্ট</span>
            </button>
            <button onClick={() => setActiveTab('bookingTab')} className={`p-5 rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${activeTab === 'bookingTab' ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-black/40 hover:border-blue-500/50'}`}>
                <i className="fa-solid fa-ticket text-2xl mb-2 text-blue-400"></i>
                <span className="font-black text-sm text-white">বুকিং রিকোয়েস্ট</span>
            </button>
            {/* আরও ট্যাব এখানে যুক্ত করা যাবে */}
        </div>

        {/* Event Form Content */}
        {activeTab === 'eventTab' && (
          <div className="bg-[#0a1c13]/70 backdrop-blur-lg border border-white/5 rounded-3xl p-6 sm:p-8">
            <div className="text-center mb-8 border-b border-white/10 pb-6">
                <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">স্মার্ট ইভেন্ট লঞ্চিং ইঞ্জিন</h1>
                <p className="text-sm text-gray-400">ট্রেকিং, ক্যাম্পিং বা ক্রুজ—যেকোনো ইভেন্ট কাস্টমাইজ করুন।</p>
            </div>

            <form onSubmit={handleEventSubmit} className="space-y-8">
              
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">ইভেন্টের শিরোনাম *</label>
                      <input type="text" id="title" required value={eventData.title} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 text-white p-4 rounded-xl outline-none focus:border-[#e76f51]" />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">সাবটাইটেল</label>
                      <input type="text" id="subtitle" value={eventData.subtitle} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 text-white p-4 rounded-xl outline-none focus:border-[#e76f51]" />
                  </div>
                  
                  <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">কভার ছবি (16:9) *</label>
                      <div className="relative w-full h-48 sm:h-64 rounded-2xl border-2 border-dashed border-gray-600 bg-black/20 flex items-center justify-center overflow-hidden">
                          {coverPreview ? (
                              <img src={coverPreview} className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                              <div className="text-center p-6">
                                  <i className="fa-solid fa-image text-4xl text-gray-500 mb-3"></i>
                                  <p className="text-sm font-bold text-gray-400">ক্লিক করে ছবি নির্বাচন করুন</p>
                              </div>
                          )}
                          <input type="file" onChange={handleCoverChange} accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      </div>
                  </div>
              </div>

              {/* Timing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">যাত্রা শুরু (Start Time) *</label>
                      <input type="datetime-local" id="start_date" required value={eventData.start_date} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 text-white p-3.5 rounded-xl outline-none focus:border-blue-400" />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-red-400 mb-2 uppercase">রেজিস্ট্রেশন ডেডলাইন *</label>
                      <input type="datetime-local" id="deadline" required value={eventData.deadline} onChange={handleInputChange} className="w-full bg-black/40 border border-red-500/50 text-white p-3.5 rounded-xl outline-none" />
                  </div>
              </div>

              {/* Financial */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                      <label className="block text-xs font-bold text-emerald-400 mb-2 uppercase">বুকিং ফি (Advance) *</label>
                      <input type="number" id="booking_fee" required value={eventData.booking_fee} onChange={handleInputChange} className="w-full bg-black/40 border border-emerald-500/30 text-white p-3.5 rounded-xl outline-none" />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">টোটাল ফি *</label>
                      <input type="number" id="tour_fee" required value={eventData.tour_fee} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 text-white p-3.5 rounded-xl outline-none focus:border-[#e76f51]" />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">টোটাল সিট *</label>
                      <input type="number" id="total_seats" required value={eventData.total_seats} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 text-white p-3.5 rounded-xl outline-none focus:border-[#e76f51]" />
                  </div>
              </div>

              {/* Description */}
              <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">সংক্ষিপ্ত বিবরণ *</label>
                  <textarea id="description" required rows="4" value={eventData.description} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 text-white p-4 rounded-xl outline-none focus:border-[#e76f51]"></textarea>
              </div>

              <button type="submit" disabled={saving} className="w-full bg-red-500 hover:bg-red-600 text-white font-black text-lg py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] flex justify-center items-center gap-2">
                  {saving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-rocket"></i>}
                  <span>{saving ? 'আপলোড হচ্ছে...' : 'ইভেন্ট লঞ্চ করুন'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
