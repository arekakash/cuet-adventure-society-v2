'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Cropper from 'react-easy-crop'

// Bank List for Payment Options
const BD_BANKS = [
  "DBBL (Dutch-Bangla Bank)", "BRAC Bank", "City Bank", "Islami Bank", 
  "EBL (Eastern Bank)", "Prime Bank", "Pubali Bank", "Mutual Trust Bank (MTB)", 
  "Southeast Bank", "Trust Bank", "NCC Bank", "UCBL", "Bank Asia", 
  "AB Bank", "National Bank", "Mercantile Bank", "IFIC Bank", "Jamuna Bank", 
  "Shahjalal Islami Bank", "Exim Bank", "Al-Arafah Islami Bank", "Premier Bank", 
  "Dhaka Bank", "Standard Chartered", "HSBC", "Sonali Bank", "Janata Bank", 
  "Agrani Bank", "Rupali Bank"
]

export default function EditEvent() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [eventId, setEventId] = useState(null)
  
  // Image & Cropper States
  const [imageFile, setImageFile] = useState(null)
  const [imageSrc, setImageSrc] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [existingImage, setExistingImage] = useState('')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [showCropper, setShowCropper] = useState(false)

  // 🔴 Dynamic States
  const [paymentMethods, setPaymentMethods] = useState([])
  const [memoryLinks, setMemoryLinks] = useState([{ id: Date.now(), title: '', url: '' }]) // Memory Lane State

  // ফর্মের সাধারণ ডেটা
  const [formData, setFormData] = useState({
    title: '', category: 'Trekking', destination: '',
    startDate: '', endDate: '', reportingPlace: '', deadline: '',
    bookingFee: '', totalFee: '', totalSeats: '', refundPolicy: 'Non-Refundable',
    stayType: 'Resort/Hotel Shared', washroom: 'Attached & Shared', foodPlan: '',
    difficulty: 'Moderate', tourVibe: 'Hardcore Trekking', fitnessLevel: '', teamLeader: '', leaderPhone: '', leaderWhatsapp: '',
    description: '', totalDays: 1,
    metaTreks: 1, metaDistance: '', metaNights: 0
  })

  // প্রি-ডিফাইনড চেকলিস্ট 
  const presetIncluded = [
    "চুয়েট-গন্তব্য আপ-ডাউন ভাড়া", "প্রতিদিন ৩ বেলা মূল খাবার (ভারী খাবার)",
    "রিসোর্ট/হোটেল/কটেজ শেয়ারিং রুম", "ক্যাম্পিং টেন্ট ও স্লিপিং গিয়ার সাপোর্ট",
    "লোকাল জিপ/চাঁদের গাড়ি/মহিন্দ্রা রিজার্ভ", "ট্রলার বা বোট ভাড়া (লাইফ জ্যাকেটসহ)",
    "অভিজ্ঞ লোকাল ও ক্লাবের ট্রেইল গাইড", "বন বিভাগ ও স্থানীয় প্রশাসনের অনুমতি ফি",
    "পার্ক, ট্রেইল ও দর্শনীয় স্থানের এন্ট্রি ফি", "স্পেশাল বারবিকিউ ডিনার",
    "বিকেলের হালকা স্ন্যাঙ্কস ও পাহাড়ি চা", "ক্লাবের প্রাথমিক চিকিৎসা ও ফার্স্ট এইড কিট",
    "গ্রুপ মেম্বারদের জন্য অফিসিয়াল রিস্টব্যান্ড/ব্যাজ", "নিরাপত্তা ও রুট কো-অর্ডিনেশন",
    "জরুরি স্যাটেলাইট/টুল ব্যাকআপ সাপোর্ট"
  ]

  const presetExcluded = [
    "বাসযাত্রার বিরতির ব্যক্তিগত খাবার ও নাস্তা", "কোনো প্রকার ব্যক্তিগত কেনাকাটা ও স্যুভেনিয়ার",
    "ব্যক্তিগত ওষুধপত্র ও বিশেষ চিকিৎসা খরচ", "পোর্টার বা ব্যক্তিগত ব্যাগ টানার কুলি খরচ",
    "ক্যামেরা, ডিএসএলআর বা ড্রোন ওড়ানোর স্পেশাল ফি", "প্যারাসেইলিং, স্কুটার বা ওয়াটার স্পোর্টস ফি",
    "আলাদা বা কাপল রুম নিলে অতিরিক্ত রুম চার্জ", "মোবাইল চার্জিং বা পাহাড়ি এলাকায় হট ওয়াটার ফি",
    "হঠাৎ প্রাকৃতিক দুর্যোগে আটকে গেলে অতিরিক্ত খরচ", "বাসের নির্দিষ্ট স্টপ ছাড়া অন্য কোথাও নামা বা ওঠার খরচ"
  ]

  const [tags, setTags] = useState({ included: [], gear: [], excluded: [], warnings: [] })
  const [tagInputs, setTagInputs] = useState({ included: '', gear: '', excluded: '', warnings: '' })
  const [itinerary, setItinerary] = useState([{ day: 1, title: '', desc: '' }])

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteStep, setDeleteStep] = useState(1)
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const IMGBB_API_KEY = 'c8e142b508f46f59807dbb6a3a2ccb23' 

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const id = searchParams.get("id")
    
    if (id) {
      setEventId(id)
      fetchEventData(id)
    } else {
      alert("কোনো ইভেন্ট আইডি পাওয়া যায়নি!")
      router.push('/admin/events')
    }
  }, [])

  const fetchEventData = async (id) => {
    try {
      const { data, error } = await supabase.from('events').select('*').eq('id', id).single()
      if (error) throw error
      if (data) {
        setFormData({
          title: data.title || '', category: data.category || 'Trekking', destination: data.destination || '',
          startDate: data.start_date ? new Date(data.start_date).toISOString().slice(0, 16) : '', 
          endDate: data.end_date ? new Date(data.end_date).toISOString().slice(0, 16) : '', 
          reportingPlace: data.reporting_place || '', 
          deadline: data.deadline ? new Date(data.deadline).toISOString().slice(0, 16) : '',
          bookingFee: data.booking_fee || '', totalFee: data.tour_fee || '', totalSeats: data.total_seats || '', 
          refundPolicy: data.refund_policy || 'Non-Refundable',
          stayType: data.stay_type || 'Resort/Hotel Shared', washroom: data.washroom || 'Attached & Shared', foodPlan: data.food_plan || '',
          difficulty: data.difficulty || 'Moderate', tourVibe: data.tour_vibe || 'Hardcore Trekking', 
          fitnessLevel: data.fitness_level || '', teamLeader: data.team_leader || '', 
          leaderPhone: data.leader_phone || '', leaderWhatsapp: data.leader_whatsapp || '',
          description: data.description || '',
          totalDays: data.itinerary ? data.itinerary.length : 1,
          metaTreks: data.stats_meta?.treks || 0, metaDistance: data.stats_meta?.distance || 0, metaNights: data.stats_meta?.nights || 0
        })

        // 🔴 Payment Methods Parsing (Text to JSON Array Fallback)
        let parsedPayments = []
        if (typeof data.payment_methods === 'string') {
          try { parsedPayments = JSON.parse(data.payment_methods) } catch(e) {}
        } else if (Array.isArray(data.payment_methods)) {
          parsedPayments = data.payment_methods
        }
        setPaymentMethods(parsedPayments)

        // 🔴 Memory Lane Parsing (Legacy string to Array Fallback)
        let parsedMemory = []
        if (typeof data.album_link === 'string') {
          if (data.album_link.trim().startsWith('[')) {
            try { parsedMemory = JSON.parse(data.album_link) } catch(e) {}
          } else if (data.album_link.trim() !== '') {
            parsedMemory = [{ id: Date.now(), title: 'Main Album', url: data.album_link }]
          }
        } else if (Array.isArray(data.album_link)) {
          parsedMemory = data.album_link
        }
        setMemoryLinks(parsedMemory.length > 0 ? parsedMemory : [{ id: Date.now(), title: '', url: '' }])

        setTags({
          included: data.included || [], gear: data.required_gear || [], 
          excluded: data.excluded || [], warnings: data.warnings || []
        })

        setItinerary(data.itinerary || [{ day: 1, title: '', desc: '' }])
        setExistingImage(data.cover_photo || '')
        setImagePreview(data.cover_photo || '')
      }
    } catch (error) {
      console.error(error)
      alert("ইভেন্ট ফেচ করতে সমস্যা হয়েছে!")
    } finally {
      setFetching(false)
    }
  }

  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))

    if (id === 'totalDays') {
      const days = parseInt(value) || 1
      if (days > 0 && days <= 20) {
        const newItinerary = Array.from({ length: days }, (_, i) => ({
          day: i + 1,
          title: itinerary[i]?.title || '',
          desc: itinerary[i]?.desc || ''
        }))
        setItinerary(newItinerary)
      }
    }
  }

  // 🔴 Payment Method Handlers
  const addPaymentMethod = () => setPaymentMethods([...paymentMethods, { id: Date.now(), provider: 'bkash', bankName: '', accName: '', accNo: '', branch: '', routing: '', type: 'send_money', contactPerson: '', location: '' }])
  const updatePaymentMethod = (id, field, value) => setPaymentMethods(paymentMethods.map(p => p.id === id ? { ...p, [field]: value } : p))
  const removePaymentMethod = (id) => setPaymentMethods(paymentMethods.filter(p => p.id !== id))

  // 🔴 Memory Lane Handlers
  const addMemoryLink = () => setMemoryLinks([...memoryLinks, { id: Date.now(), title: '', url: '' }])
  const updateMemoryLink = (id, field, value) => setMemoryLinks(memoryLinks.map(m => m.id === id ? { ...m, [field]: value } : m))
  const removeMemoryLink = (id) => setMemoryLinks(memoryLinks.filter(m => m.id !== id))

  // Image Cropper Logic
  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setImageSrc(reader.result)
        setShowCropper(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const getCroppedImg = async () => {
    try {
      const image = new Image()
      image.src = imageSrc
      await new Promise(resolve => image.onload = resolve)

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      canvas.width = croppedAreaPixels.width
      canvas.height = croppedAreaPixels.height

      ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, croppedAreaPixels.width, croppedAreaPixels.height)

      let quality = 0.8
      let base64Image = canvas.toDataURL('image/jpeg', quality)
      
      while (base64Image.length > 150000 && quality > 0.2) {
        quality -= 0.1
        base64Image = canvas.toDataURL('image/jpeg', quality)
      }

      setImagePreview(base64Image)
      
      fetch(base64Image)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "custom-cropped-cover.jpg", { type: "image/jpeg" })
          setImageFile(file)
          setShowCropper(false)
        })
    } catch (e) {
      console.error(e)
    }
  }

  const handleTagAdd = (category, presetValue = null) => {
    const value = presetValue || tagInputs[category].trim()
    if (value && !tags[category].includes(value)) {
      setTags(prev => ({ ...prev, [category]: [...prev[category], value] }))
      if (!presetValue) setTagInputs(prev => ({ ...prev, [category]: '' }))
    }
  }

  const handleTagRemove = (category, index) => {
    setTags(prev => ({ ...prev, [category]: prev[category].filter((_, i) => i !== index) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (paymentMethods.length === 0) {
      alert("অনুগ্রহ করে অন্তত একটি পেমেন্ট মেথড যুক্ত করুন!")
      return
    }

    setLoading(true)

    try {
      let finalCoverPhotoUrl = existingImage

      if (imageFile) {
        const imgFormData = new FormData()
        imgFormData.append('image', imageFile)

        const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: imgFormData
        })
        const imgbbData = await imgbbResponse.json()
        
        if (!imgbbData.success) throw new Error("নতুন ছবি আপলোড ফেইল করেছে!")
        finalCoverPhotoUrl = imgbbData.data.url
      }

      // 🔴 Clean up Memory Links (remove empty ones)
      const validMemoryLinks = memoryLinks.filter(m => m.url.trim() !== '')

      const updateData = {
        title: formData.title,
        category: formData.category,
        destination: formData.destination,
        cover_photo: finalCoverPhotoUrl,
        start_date: formData.startDate,
        end_date: formData.endDate,
        reporting_place: formData.reportingPlace,
        deadline: formData.deadline,
        total_seats: parseInt(formData.totalSeats),
        tour_fee: parseInt(formData.totalFee),
        booking_fee: parseInt(formData.bookingFee),
        refund_policy: formData.refundPolicy,
        payment_methods: paymentMethods, // 🔴 Saving as JSON Array
        stay_type: isDayEvent ? 'None' : formData.stayType,
        washroom: formData.washroom,
        food_plan: formData.foodPlan,
        difficulty: formData.difficulty,
        tour_vibe: formData.tourVibe,
        fitness_level: parseInt(formData.fitnessLevel) || 0,
        team_leader: formData.teamLeader,
        leader_phone: formData.leaderPhone,
        leader_whatsapp: formData.leaderWhatsapp,
        description: formData.description,
        album_link: validMemoryLinks, // 🔴 Memory Lane saved as JSON Array
        included: tags.included,
        required_gear: tags.gear,
        excluded: tags.excluded,
        warnings: tags.warnings,
        itinerary: itinerary,
        stats_meta: {
            treks: parseInt(formData.metaTreks) || 0,
            distance: parseInt(formData.metaDistance) || 0,
            nights: isDayEvent ? 0 : (parseInt(formData.metaNights) || 0)
        }
      }

      const { error } = await supabase.from('events').update(updateData).eq('id', eventId)
      if (error) throw error

      alert("ইভেন্ট সফলভাবে আপডেট করা হয়েছে!")
      router.push('/admin/events')

    } catch (error) {
      console.error(error)
      alert("ইভেন্ট আপডেট করতে সমস্যা হয়েছে: " + error.message)
    } finally {
      setLoading(false)
    }
  }

    const handleMoveToTrash = async () => {
    try {
      setLoading(true)

      // 🔴 ১. প্রথমে চেক করতে হবে ইভেন্টটি 'completed' কিনা এবং survival_iq যোগ হয়েছিল কিনা
      const { data: currentEvent, error: fetchError } = await supabase
        .from('events')
        .select('status')
        .eq('id', eventId)
        .single()

      if (fetchError) throw fetchError

      // 🔴 ২. যদি ইভেন্টটি 'completed' হয়ে থাকে, তবেই রোলব্যাক লজিক কাজ করবে
      if (currentEvent.status === 'completed') {
        const { data: bookings, error: bookingError } = await supabase
          .from('bookings')
          .select('user_id')
          .eq('event_id', eventId)
          .eq('status', 'approved') // 🔴 শুধুমাত্র approved ইউজারদের পয়েন্ট মাইনাস হবে

        if (bookingError) throw bookingError

        if (bookings && bookings.length > 0) {
          for (const booking of bookings) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('total_events, total_treks, total_distance, total_rides, cycling_distance, total_swims, swimming_distance, total_runs, running_distance')
              .eq('id', booking.user_id)
              .single()

            if (profile) {
              let updates = { 
                total_events: Math.max(0, (profile.total_events || 0) - 1) 
              }

              const category = formData.category.toLowerCase()
              const distance = parseInt(formData.metaDistance) || 0

              if (category === 'trekking') {
                updates.total_treks = Math.max(0, (profile.total_treks || 0) - 1)
                updates.total_distance = Math.max(0, (profile.total_distance || 0) - distance)
              } else if (category === 'cycling') {
                updates.total_rides = Math.max(0, (profile.total_rides || 0) - 1)
                updates.cycling_distance = Math.max(0, (profile.cycling_distance || 0) - distance)
              } else if (category === 'swimming') {
                updates.total_swims = Math.max(0, (profile.total_swims || 0) - 1)
                updates.swimming_distance = Math.max(0, (profile.swimming_distance || 0) - distance)
              } else if (category === 'running') {
                updates.total_runs = Math.max(0, (profile.total_runs || 0) - 1)
                updates.running_distance = Math.max(0, (profile.running_distance || 0) - distance)
              }

              await supabase.from('profiles').update(updates).eq('id', booking.user_id)
            }
          }
        }
      }

      // 🔴 ৩. এরপর ইভেন্টটিকে ট্র্যাশ বিনে পাঠানো হবে (সকল ইভেন্টের ক্ষেত্রে প্রযোজ্য)
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', eventId)

      if (error) throw error
      
      alert('ইভেন্টটি সফলভাবে ট্র্যাশ বিনে পাঠানো হয়েছে!')
      router.push('/admin/trash') 

    } catch (error) {
      console.error(error)
      alert('সমস্যা হয়েছে: ' + error.message)
    } finally {
      setLoading(false)
    }
  }


  if (fetching) {
    return (
      <div className="min-h-screen bg-[#050b08] flex items-center justify-center">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#e76f51]"></i>
      </div>
    )
  }

  // Smart Category Variables
  const isDayEvent = formData.category === 'Day Tour' || formData.category === 'Workshop'
  const isCycling = formData.category === 'Cycling'
  const isSwimming = formData.category === 'Swimming' || formData.category === 'Houseboat/Cruise'
  const isRunning = formData.category === 'Running'

  return (
    <div className="min-h-screen bg-[#050b08] pb-12 px-4 sm:px-6 relative text-gray-300 pt-24">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex items-center gap-4 mb-8">
            <Link href="/admin/events" className="text-gray-400 hover:text-white bg-white/5 p-3 rounded-xl transition-colors">
                <i className="fa-solid fa-arrow-left"></i>
            </Link>
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">এডিট ইভেন্ট ইঞ্জিন</h1>
                <p className="text-sm text-gray-400">বিদ্যমান ইভেন্টের তথ্য আপডেট করুন</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#0a1c13] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-12">
            
            {/* সেকশন ১: বেসিক ইনফো */}
            <div>
                <h3 className="font-bold text-[#e76f51] mb-6 text-lg flex items-center gap-2 border-b border-[#e76f51]/20 pb-2">
                    <i className="fa-solid fa-compass"></i> ১. বেসিক ইনফরমেশন
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">ইভেন্টের শিরোনাম *</label>
                        <input type="text" id="title" required value={formData.title} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-[#e76f51] text-white font-bold" />
                    </div>
                    
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">কভার ছবি (স্বেচ্ছাধীন সাইজ ক্রপ)</label>
                        <div className="relative w-full h-48 sm:h-64 rounded-2xl border-2 border-dashed border-gray-600 overflow-hidden bg-black/20 flex items-center justify-center hover:border-[#e76f51] transition-colors">
                            {imagePreview ? (
                                <>
                                  <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <span className="text-white font-bold bg-black/60 px-4 py-2 rounded"><i className="fa-solid fa-crop"></i> পরিবর্তন বা ক্রপ করুন</span>
                                  </div>
                                </>
                            ) : (
                                <div className="text-center p-6 pointer-events-none">
                                    <i className="fa-solid fa-image text-4xl text-gray-500 mb-3"></i>
                                    <p className="text-sm font-bold text-gray-400">ক্লিক করে ছবি নির্বাচন করুন</p>
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={handleImageSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">ক্যাটাগরি *</label>
                        <select id="category" value={formData.category} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-[#e76f51] text-white font-bold">
                            <option value="Trekking">Trekking (ট্রেকিং)</option>
                            <option value="Camping">Camping (ক্যাম্পিং)</option>
                            <option value="Cycling">Cycling (সাইক্লিং)</option>
                            <option value="Running">Running (রানিং)</option> {/* 🔴 Added Running */}
                            <option value="Swimming">Swimming (সাঁতার)</option>
                            <option value="Houseboat/Cruise">Houseboat/Cruise</option>
                            <option value="Expedition">Expedition (অভিযান)</option>
                            <option value="Day Tour">Day Tour (ডে ট্যুর)</option>
                            <option value="Workshop">Workshop (ওয়ার্কশপ)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">মূল গন্তব্য *</label>
                        <input type="text" id="destination" required value={formData.destination} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-[#e76f51] text-white" />
                    </div>
                </div>
            </div>

            {/* সেকশন ২: সময়সূচী */}
            <div>
                <h3 className="font-bold text-blue-400 mb-6 text-lg flex items-center gap-2 border-b border-blue-400/20 pb-2">
                    <i className="fa-solid fa-clock"></i> ২. সময়সূচী ও ডেডলাইন
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">যাত্রা শুরু *</label>
                        <input type="datetime-local" id="startDate" required value={formData.startDate} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-blue-400 text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">{isDayEvent ? 'ইভেন্ট সমাপ্তি' : 'ফিরে আসা'} *</label>
                        <input type="datetime-local" id="endDate" required value={formData.endDate} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-blue-400 text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">রিপোর্টিং প্লেস *</label>
                        <input type="text" id="reportingPlace" required value={formData.reportingPlace} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-blue-400 text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-red-400 mb-2 uppercase">রেজিস্ট্রেশন ডেডলাইন *</label>
                        <input type="datetime-local" id="deadline" required value={formData.deadline} onChange={handleInputChange} className="w-full bg-black/40 border border-red-500/50 p-4 rounded-xl outline-none focus:border-red-500 text-white" />
                    </div>
                </div>
            </div>

            {/* 🔴 সেকশন ৩: ফিন্যান্সিয়াল ইঞ্জিন (Restored Dynamic Payment Builder) */}
            <div>
                <h3 className="font-bold text-emerald-400 mb-6 text-lg flex items-center gap-2 border-b border-emerald-400/20 pb-2">
                    <i className="fa-solid fa-wallet"></i> ৩. ফিন্যান্সিয়াল ইঞ্জিন ও পেমেন্ট
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-emerald-400 mb-2 uppercase">বুকিং ফি (Advance) *</label>
                        <input type="number" id="bookingFee" required value={formData.bookingFee} onChange={handleInputChange} className="w-full bg-black/40 border border-emerald-500/30 p-4 rounded-xl outline-none focus:border-emerald-500 text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">টোটাল প্যাকেজ ফি *</label>
                          <input type="number" id="totalFee" required value={formData.totalFee} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-emerald-500 text-white" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">মোট সিট সংখ্যা *</label>
                          <input type="number" id="totalSeats" required value={formData.totalSeats} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-emerald-500 text-white" />
                      </div>
                    </div>
                </div>

                {/* Dynamic Payment Methods Builder */}
                <div className="border border-white/10 rounded-2xl p-5 bg-gradient-to-br from-white/5 to-transparent">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">গ্রহণযোগ্য পেমেন্ট মাধ্যমসমূহ</h4>
                      <p className="text-[10px] text-gray-400 mt-1">ইউজাররা কোন কোন নাম্বারে বা ব্যাংকে পেমেন্ট করতে পারবে তা যুক্ত করুন</p>
                    </div>
                    <button type="button" onClick={addPaymentMethod} className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-emerald-500/30">
                      <i className="fa-solid fa-plus mr-1"></i> মেথড যোগ করুন
                    </button>
                  </div>

                  {paymentMethods.length > 0 ? (
                    <div className="space-y-4">
                      {paymentMethods.map((pm) => (
                        <div key={pm.id} className="bg-black/40 border border-white/10 rounded-xl p-4 relative flex flex-col gap-3">
                          <button type="button" onClick={() => removePaymentMethod(pm.id)} className="absolute top-3 right-3 text-red-400 hover:text-red-300 transition-colors">
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-6">
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">প্লাটফর্ম</label>
                              <select value={pm.provider} onChange={(e) => updatePaymentMethod(pm.id, 'provider', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-xs outline-none focus:border-emerald-500">
                                <option value="bkash">বিকাশ (bKash)</option>
                                <option value="nagad">নগদ (Nagad)</option>
                                <option value="rocket">রকেট (Rocket)</option>
                                <option value="bank">ব্যাংক ট্রান্সফার (Bank)</option>
                                <option value="cash">হ্যান্ড ক্যাশ (Cash)</option>
                              </select>
                            </div>
                            
                            {pm.provider === 'bank' && (
                              <>
                                <div>
                                  <label className="block text-[10px] text-gray-400 mb-1">ব্যাংক সিলেক্ট করুন</label>
                                  <select value={pm.bankName} onChange={(e) => updatePaymentMethod(pm.id, 'bankName', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-xs outline-none">
                                    <option value="">ব্যাংক নির্বাচন করুন...</option>
                                    {BD_BANKS.map((b, i) => <option key={i} value={b}>{b}</option>)}
                                  </select>
                                </div>
                                <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] text-gray-400 mb-1">অ্যাকাউন্ট নেম</label>
                                    <input type="text" value={pm.accName} onChange={(e) => updatePaymentMethod(pm.id, 'accName', e.target.value)} placeholder="Account Name" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-xs outline-none" />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-gray-400 mb-1">অ্যাকাউন্ট নম্বর</label>
                                    <input type="text" value={pm.accNo} onChange={(e) => updatePaymentMethod(pm.id, 'accNo', e.target.value)} placeholder="Account Number" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-xs outline-none" />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-gray-400 mb-1">ব্রাঞ্চ (Branch)</label>
                                    <input type="text" value={pm.branch} onChange={(e) => updatePaymentMethod(pm.id, 'branch', e.target.value)} placeholder="Branch Name" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-xs outline-none" />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-gray-400 mb-1">রাউটিং নম্বর (ঐচ্ছিক)</label>
                                    <input type="text" value={pm.routing} onChange={(e) => updatePaymentMethod(pm.id, 'routing', e.target.value)} placeholder="Routing Number" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-xs outline-none" />
                                  </div>
                                </div>
                              </>
                            )}

                            {pm.provider === 'cash' && (
                              <>
                                <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-[10px] text-gray-400 mb-1">কন্টাক্ট পার্সন (নাম ও নাম্বার)</label>
                                    <input type="text" value={pm.contactPerson} onChange={(e) => updatePaymentMethod(pm.id, 'contactPerson', e.target.value)} placeholder="Name - 017XXXXXXX" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-xs outline-none" />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-gray-400 mb-1">লোকেশন / স্থান</label>
                                    <input type="text" value={pm.location} onChange={(e) => updatePaymentMethod(pm.id, 'location', e.target.value)} placeholder="e.g. CUET Campus" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-xs outline-none" />
                                  </div>
                                </div>
                              </>
                            )}

                            {(pm.provider === 'bkash' || pm.provider === 'nagad' || pm.provider === 'rocket') && (
                              <>
                                <div>
                                  <label className="block text-[10px] text-gray-400 mb-1">অ্যাকাউন্ট নম্বর</label>
                                  <input type="text" value={pm.accNo} onChange={(e) => updatePaymentMethod(pm.id, 'accNo', e.target.value)} placeholder="017XXXXXXX" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-xs outline-none" />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] text-gray-400 mb-1">ট্রানজেকশন টাইপ</label>
                                  <div className="flex gap-4">
                                    <label className="text-xs text-gray-300 flex items-center gap-1.5 cursor-pointer">
                                      <input type="radio" checked={pm.type === 'send_money'} onChange={() => updatePaymentMethod(pm.id, 'type', 'send_money')} className="accent-emerald-500" /> Send Money
                                    </label>
                                    <label className="text-xs text-gray-300 flex items-center gap-1.5 cursor-pointer">
                                      <input type="radio" checked={pm.type === 'payment'} onChange={() => updatePaymentMethod(pm.id, 'type', 'payment')} className="accent-emerald-500" /> Payment
                                    </label>
                                    <label className="text-xs text-gray-300 flex items-center gap-1.5 cursor-pointer">
                                      <input type="radio" checked={pm.type === 'cash_in'} onChange={() => updatePaymentMethod(pm.id, 'type', 'cash_in')} className="accent-emerald-500" /> Cash In
                                    </label>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-red-400 italic py-2">বুকিং কনফার্ম করার জন্য অন্তত একটি পেমেন্ট মেথড যুক্ত করা বাধ্যতামূলক।</p>
                  )}
                </div>
            </div>

            {/* সেকশন ৪: স্মার্ট লজিস্টিকস & 🔴 Memory Lane */}
            <div>
                <h3 className="font-bold text-purple-400 mb-6 text-lg flex items-center gap-2 border-b border-purple-400/20 pb-2">
                    <i className="fa-solid fa-campground"></i> ৪. লজিস্টিকস ও মেমোরি লেন
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {formData.category !== 'Workshop' && (
                      <div>
                          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">ডিফিকাল্টি লেভেল *</label>
                          <select id="difficulty" value={formData.difficulty} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white">
                              <option value="Beginner">Beginner (সহজ)</option>
                              <option value="Moderate">Moderate (মাঝারি)</option>
                              <option value="Hard">Hard (কঠিন)</option>
                              <option value="Extreme">Extreme (চরম চ্যালেঞ্জিং)</option>
                          </select>
                      </div>
                    )}

                    {!isDayEvent && (
                      <div>
                          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">থাকার ব্যবস্থা *</label>
                          <select id="stayType" value={formData.stayType} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white">
                              <option value="Resort/Hotel Shared">রিসোর্ট/হোটেল শেয়ারিং</option>
                              <option value="Tent Camping">টেন্ট ক্যাম্পিং</option>
                              <option value="Houseboat">হাউজবোট</option>
                              <option value="Tribal Cottage">আদিবাসী মাচাং ঘর</option>
                              <option value="No Stay (Overnight Travel)">নো-স্টে (বাস জার্নি)</option>
                          </select>
                      </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">টিম লিডার *</label>
                        <input type="text" id="teamLeader" required value={formData.teamLeader} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white" />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">লিডার ফোন নম্বর *</label>
                        <input type="tel" id="leaderPhone" required value={formData.leaderPhone} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white" />
                    </div>

                    <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">সংক্ষিপ্ত বিবরণ *</label>
                        <textarea id="description" required rows="3" value={formData.description} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white resize-none"></textarea>
                    </div>

                    {/* 🔴 Dynamic Memory Lane Builder */}
                    <div className="md:col-span-3 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-5 rounded-2xl border border-indigo-500/20">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                        <div>
                          <label className="block text-sm font-bold text-indigo-400 flex items-center gap-2 uppercase tracking-widest"><i className="fa-solid fa-film"></i> মেমোরি লেন (ফটো/ভিডিও ফোল্ডার)</label>
                          <p className="text-[10px] text-gray-400 mt-1">ইভেন্ট সম্পন্ন হওয়ার পর ইউজারদের ছবি ও ভিডিও দেখার জন্য একাধিক লিংক যোগ করতে পারবেন।</p>
                        </div>
                        <button type="button" onClick={addMemoryLink} className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-indigo-500/30 whitespace-nowrap">
                          <i className="fa-solid fa-plus mr-1"></i> নতুন লিংক যোগ করুন
                        </button>
                      </div>

                      <div className="space-y-3">
                        {memoryLinks.map((link) => (
                          <div key={link.id} className="flex flex-col sm:flex-row gap-3 bg-black/40 p-3 rounded-xl border border-white/5">
                            <input 
                              type="text" 
                              placeholder="লিংকের টাইটেল (e.g. Day 1 Photos, Aftermovie)" 
                              value={link.title} 
                              onChange={(e) => updateMemoryLink(link.id, 'title', e.target.value)} 
                              className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-xs outline-none focus:border-indigo-400" 
                            />
                            <input 
                              type="url" 
                              placeholder="URL Link (https://...)" 
                              value={link.url} 
                              onChange={(e) => updateMemoryLink(link.id, 'url', e.target.value)} 
                              className="flex-[2] bg-white/5 border border-white/10 rounded-lg p-2.5 text-white text-xs outline-none focus:border-indigo-400" 
                            />
                            {memoryLinks.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeMemoryLink(link.id)} 
                                className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white w-full sm:w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0"
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                </div>
            </div>

            {/* সেকশন ৫: স্মার্ট ডায়নামিক চেকলিস্ট */}
            <div>
                <h3 className="font-bold text-yellow-500 mb-6 text-lg flex items-center gap-2 border-b border-yellow-500/20 pb-2">
                    <i className="fa-solid fa-list-check"></i> ৫. রুলস ও চেকলিস্ট
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    <div className="bg-black/20 p-5 rounded-2xl border border-emerald-500/20">
                        <label className="block text-xs font-bold text-emerald-400 mb-3 uppercase">যা যা ইনক্লুডেড (Included)</label>
                        <select onChange={(e) => { if(e.target.value) { handleTagAdd('included', e.target.value); e.target.value = "" } }} className="w-full bg-black/40 border border-emerald-500/30 p-3 rounded-lg text-sm text-gray-300 mb-3 outline-none cursor-pointer">
                          <option value="">-- সাজেশন থেকে নির্বাচন করুন --</option>
                          {presetIncluded.map(item => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <div className="flex gap-2 mb-3">
                            <input type="text" placeholder="অথবা নিজে টাইপ করে যোগ করুন..." value={tagInputs.included} onChange={(e) => setTagInputs({...tagInputs, included: e.target.value})} className="bg-black/40 border border-white/10 flex-grow p-2.5 rounded-lg text-sm text-white" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleTagAdd('included'))} />
                            <button type="button" onClick={() => handleTagAdd('included')} className="bg-emerald-500 text-white px-4 rounded-lg font-bold">Add</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {tags.included.map((tag, idx) => (
                                <span key={idx} className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-xs flex items-center gap-2 text-emerald-400">
                                  {tag} <i className="fa-solid fa-xmark text-red-400 cursor-pointer hover:text-red-500" onClick={() => handleTagRemove('included', idx)}></i>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="bg-black/20 p-5 rounded-2xl border border-gray-500/30">
                        <label className="block text-xs font-bold text-gray-400 mb-3 uppercase">যা ইনক্লুডেড নয় (Excluded)</label>
                        <select onChange={(e) => { if(e.target.value) { handleTagAdd('excluded', e.target.value); e.target.value = "" } }} className="w-full bg-black/40 border border-gray-500/30 p-3 rounded-lg text-sm text-gray-300 mb-3 outline-none cursor-pointer">
                          <option value="">-- সাজেশন থেকে নির্বাচন করুন --</option>
                          {presetExcluded.map(item => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <div className="flex gap-2 mb-3">
                            <input type="text" placeholder="অথবা নিজে টাইপ করে যোগ করুন..." value={tagInputs.excluded} onChange={(e) => setTagInputs({...tagInputs, excluded: e.target.value})} className="bg-black/40 border border-white/10 flex-grow p-2.5 rounded-lg text-sm text-white" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleTagAdd('excluded'))} />
                            <button type="button" onClick={() => handleTagAdd('excluded')} className="bg-gray-600 text-white px-4 rounded-lg font-bold">Add</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {tags.excluded.map((tag, idx) => (
                                <span key={idx} className="bg-white/10 px-3 py-1 rounded-full text-xs flex items-center gap-2 text-gray-300">
                                  {tag} <i className="fa-solid fa-xmark text-red-400 cursor-pointer hover:text-red-500" onClick={() => handleTagRemove('excluded', idx)}></i>
                                </span>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* সেকশন ৬: ডে-টু-ডে প্ল্যানার */}
            <div>
                <div className="flex justify-between items-center mb-6 border-b border-[#2d6a4f]/30 pb-2">
                    <h3 className="font-bold text-[#2d6a4f] text-lg flex items-center gap-2">
                        <i className="fa-solid fa-map-location-dot"></i> ৬. ডে-টু-ডে প্ল্যানার
                    </h3>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-400">মোট দিন:</label>
                        <input type="number" id="totalDays" min="1" max="10" value={formData.totalDays} onChange={handleInputChange} className="bg-black/40 border border-white/10 w-16 p-2 text-center rounded-lg font-bold text-[#e76f51] outline-none" />
                    </div>
                </div>
                <div className="space-y-4">
                    {itinerary.map((day, idx) => (
                        <div key={idx} className="p-4 bg-black/30 rounded-xl border border-white/5">
                            <h4 className="font-bold text-[#e76f51] mb-3 uppercase text-sm"><i className="fa-regular fa-calendar"></i> Day {day.day}</h4>
                            <div className="space-y-3">
                                <input type="text" required placeholder="দিনের মূল আকর্ষণ (Title)" value={day.title} onChange={(e) => {
                                    const newItin = [...itinerary]; newItin[idx].title = e.target.value; setItinerary(newItin);
                                }} className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-sm font-bold text-white outline-none" />
                                <textarea required rows="2" placeholder="সারাদিনের কার্যক্রম ও পরিকল্পনা..." value={day.desc} onChange={(e) => {
                                    const newItin = [...itinerary]; newItin[idx].desc = e.target.value; setItinerary(newItin);
                                }} className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-sm resize-none text-white outline-none"></textarea>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 🔴 সেকশন ৭: ডায়নামিক ইউজার রিওয়ার্ড পয়েন্ট (Running Support) */}
            <div>
                <h3 className="font-bold text-amber-500 mb-2 text-lg flex items-center gap-2 border-b border-amber-500/20 pb-2">
                    <i className="fa-solid fa-medal"></i> ৭. ইউজার প্রোফাইল পয়েন্ট ও রিওয়ার্ড
                </h3>
                <p className="text-xs text-gray-400 mb-6">ইভেন্টটি সাফল্যের সাথে সম্পন্ন হলে অংশগ্রহণকারী এক্সপ্লোরারের প্রোফাইলে এই রেকর্ডগুলো স্বয়ংক্রিয়ভাবে যোগ হবে।</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">
                          {isCycling ? 'মোট রাইডের সংখ্যা' : isSwimming ? 'সাঁতার সেশন সংখ্যা' : isRunning ? 'মোট দৌড়ের সংখ্যা' : 'ট্রেকের সংখ্যা (কাউন্ট)'}
                        </label>
                        <input type="number" id="metaTreks" required value={formData.metaTreks} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">
                          {isCycling ? 'মোট রাইডিং দূরত্ব (কি.মি.)' : isSwimming ? 'মোট সাঁতারের দূরত্ব (মিটার)' : isRunning ? 'মোট দৌড়ের দূরত্ব (কি.মি.)' : 'মোট হাঁটার দূরত্ব (কি.মি.)'}
                        </label>
                        <input type="number" id="metaDistance" required value={formData.metaDistance} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white" />
                    </div>
                    
                    {!isDayEvent && !isRunning && (
                      <div>
                          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">ক্যাম্পিং রাত সংখ্যা</label>
                          <input type="number" id="metaNights" required value={formData.metaNights} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white" />
                      </div>
                    )}
                </div>
            </div>

            {/* আপডেট ও ডিলিট বাটন */}
            <div className="pt-6 mt-4 border-t border-white/10 flex flex-col sm:flex-row gap-4">
                <button type="submit" disabled={loading} className="w-full sm:w-2/3 bg-blue-500 hover:bg-blue-600 text-white font-black text-lg py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center justify-center gap-3">
                    {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-pen-to-square"></i>}
                    <span>{loading ? 'আপডেট হচ্ছে...' : 'ইভেন্ট আপডেট করুন'}</span>
                </button>
                <button 
                    type="button" 
                    onClick={() => { setIsDeleteModalOpen(true); setDeleteStep(1); setIsCheckboxChecked(false); setDeleteConfirmText(''); }}
                    className="w-full sm:w-1/3 bg-red-500/20 border border-red-500/50 hover:bg-red-500 hover:text-white text-red-500 font-black text-lg py-4 rounded-xl transition-all flex items-center justify-center gap-3"
                >
                    <i className="fa-solid fa-trash"></i>
                    <span>ডিলিট করুন</span>
                </button>
            </div>

        </form>

        {/* ফ্রি-ফর্ম ক্রপার মডাল */}
        {showCropper && (
          <div className="fixed inset-0 z-[70] flex flex-col bg-black/90 backdrop-blur-md">
            <div className="relative flex-grow">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="h-24 bg-[#0a1c13] flex items-center justify-between px-6 border-t border-white/10">
              <button onClick={() => setShowCropper(false)} className="text-red-400 font-bold hover:bg-red-500/20 px-5 py-2.5 rounded-xl transition-colors">বাতিল</button>
              <button onClick={getCroppedImg} className="bg-[#e76f51] hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-glow">ক্রপ সম্পূর্ণ করুন</button>
            </div>
          </div>
        )}

        {/* 3-STEP DELETE MODAL */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0a1c13] border border-red-500/30 rounded-3xl p-8 max-w-md w-full mx-4 relative shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              {/* Step 1: Extreme Warning */}
              {deleteStep === 1 && (
                <div className="text-center">
                  <i className="fa-solid fa-triangle-exclamation text-5xl text-red-500 mb-4 animate-pulse"></i>
                  <h3 className="text-2xl font-black text-white mb-2">চরম সতর্কতা!</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    আপনি একটি ইভেন্ট ডিলিট করতে যাচ্ছেন। এটি ট্র্যাশ বিনে জমা হবে এবং <span className="text-red-400 font-bold">৩০ দিন পর চিরতরে মুছে যাবে</span>। আপনি কি নিশ্চিত?
                  </p>
                  <div className="flex gap-4">
                    <button onClick={() => setIsDeleteModalOpen(false)} className="w-1/2 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-all">বাতিল করুন</button>
                    <button onClick={() => setDeleteStep(2)} className="w-1/2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/50 py-3 rounded-xl font-bold transition-all">পরবর্তী ধাপ</button>
                  </div>
                </div>
              )}
              {/* Step 2: Checkbox Confirmation */}
              {deleteStep === 2 && (
                <div className="text-center">
                  <i className="fa-solid fa-clipboard-check text-5xl text-orange-500 mb-4"></i>
                  <h3 className="text-xl font-black text-white mb-4">দায়িত্ব স্বীকার</h3>
                  <label className="flex items-start gap-3 text-left bg-black/40 p-4 rounded-xl border border-white/5 mb-6 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="mt-1 w-5 h-5 accent-red-500" 
                      checked={isCheckboxChecked}
                      onChange={(e) => setIsCheckboxChecked(e.target.checked)}
                    />
                    <span className="text-sm text-gray-300">আমি বুঝতে পারছি যে এই ইভেন্ট ডিলিট করলে এর সাথে যুক্ত সকল ইউজারের বুকিং স্ট্যাটাস প্রভাবিত হতে পারে এবং লিডারবোর্ড থেকে তাদের পয়েন্ট মুছে যাবে। আমি নিজ দায়িত্বে এটি করছি।</span>
                  </label>
                  <div className="flex gap-4">
                    <button onClick={() => setDeleteStep(1)} className="w-1/2 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-all">পেছনে যান</button>
                    <button 
                      disabled={!isCheckboxChecked}
                      onClick={() => setDeleteStep(3)} 
                      className={`w-1/2 py-3 rounded-xl font-bold transition-all ${isCheckboxChecked ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-red-500/20 text-red-500/50 cursor-not-allowed'}`}
                    >পরবর্তী ধাপ</button>
                  </div>
                </div>
              )}
              {/* Step 3: Manual Type & Final Delete */}
              {deleteStep === 3 && (
                <div className="text-center">
                  <i className="fa-solid fa-skull-crossbones text-5xl text-red-600 mb-4"></i>
                  <h3 className="text-xl font-black text-white mb-2">চূড়ান্ত পদক্ষেপ</h3>
                  <p className="text-gray-400 text-xs mb-4">ট্র্যাশ বিনে পাঠাতে নিচের বক্সে ইংরেজিতে বড় হাতের অক্ষরে <span className="font-bold text-white select-none">DELETE</span> টাইপ করুন।</p>
                  <input 
                    type="text" 
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE" 
                    className="w-full bg-black/40 border border-red-500/30 text-white text-center font-black tracking-widest rounded-xl p-4 focus:border-red-500 outline-none mb-6 uppercase"
                  />
                  <div className="flex gap-4">
                    <button onClick={() => setDeleteStep(2)} className="w-1/2 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-all">পেছনে যান</button>
                    <button 
                      disabled={deleteConfirmText !== 'DELETE' || loading}
                      onClick={handleMoveToTrash} 
                      className={`w-1/2 py-3 rounded-xl font-black transition-all flex items-center justify-center gap-2 ${deleteConfirmText === 'DELETE' ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.6)]' : 'bg-red-500/20 text-red-500/50 cursor-not-allowed'}`}
                    >
                      {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-trash-can"></i>}
                      {loading ? 'প্রক্রিয়াজাত হচ্ছে...' : 'ট্র্যাশে পাঠান'}
                    </button>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button onClick={() => setIsDeleteModalOpen(false)} className="absolute -top-4 -right-4 w-10 h-10 bg-black border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
