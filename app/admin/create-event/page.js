'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Cropper from 'react-easy-crop'

export default function CreateOrEditEvent() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // Image & Cropper States
  const [imageFile, setImageFile] = useState(null)
  const [imageSrc, setImageSrc] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [showCropper, setShowCropper] = useState(false)

  // ফর্মের সাধারণ ডেটা (ট্যাগলাইন রিমুভড)
  const [formData, setFormData] = useState({
    title: '', category: 'Trekking', destination: '',
    startDate: '', endDate: '', reportingPlace: '', deadline: '',
    bookingFee: '', totalFee: '', totalSeats: '', refundPolicy: 'Non-Refundable', paymentMethods: '',
    stayType: 'Resort/Hotel Shared', washroom: 'Attached & Shared', foodPlan: '',
    difficulty: 'Moderate', tourVibe: 'Hardcore Trekking', fitnessLevel: '', teamLeader: '', leaderPhone: '', leaderWhatsapp: '',
    description: '', albumLink: '', totalDays: 1,
    metaTreks: 1, metaDistance: '', metaNights: 0
  })

  // 🔴 প্রি-ডিফাইনড চেকলিস্ট (বাংলাদেশের রিয়েল কনটেক্সট)
  const presetIncluded = [
    "ঢাকা-গন্তব্য আপ-ডাউন বাস টিকেট (নন-এসি/এসি)",
    "প্রতিদিন ৩ বেলা মূল খাবার (ভারী খাবার)",
    "রিসোর্ট/হোটেল/কটেজ শেয়ারিং রুম",
    "ক্যাম্পিং টেন্ট ও স্লিপিং গিয়ার সাপোর্ট",
    "লোকাল জিপ/চাঁদের গাড়ি/মহিন্দ্রা রিজার্ভ",
    "ট্রলার বা বোট ভাড়া (লাইফ জ্যাকেটসহ)",
    "অভিজ্ঞ লোকাল ও ক্লাবের ট্রেইল গাইড",
    "বন বিভাগ ও স্থানীয় প্রশাসনের অনুমতি ফি",
    "পার্ক, ট্রেইল ও দর্শনীয় স্থানের এন্ট্রি ফি",
    "স্পেশাল বারবিকিউ ডিনার",
    "বিকেলের হালকা স্ন্যাঙ্কস ও পাহাড়ি চা",
    "ক্লাবের প্রাথমিক চিকিৎসা ও ফার্স্ট এইড কিট",
    "গ্রুপ মেম্বারদের জন্য অফিসিয়াল রিস্টব্যান্ড/ব্যাজ",
    "নিরাপত্তা ও রুট কো-অর্ডিনেশন",
    "জরুরি স্যাটেলাইট/টুল ব্যাকআপ সাপোর্ট"
  ]

  const presetExcluded = [
    "বাসযাত্রার বিরতির ব্যক্তিগত খাবার ও নাস্তা",
    "কোনো প্রকার ব্যক্তিগত কেনাকাটা ও স্যুভেনিয়ার",
    "ব্যক্তিগত ওষুধপত্র ও বিশেষ চিকিৎসা খরচ",
    "পোর্টার বা ব্যক্তিগত ব্যাগ টানার কুলি খরচ",
    "ক্যামেরা, ডিএসএলআর বা ড্রোন ওড়ানোর স্পেশাল ফি",
    "প্যারাসেইলিং, স্কুটার বা ওয়াটার স্পোর্টস ফি",
    "আলাদা বা কাপল রুম নিলে অতিরিক্ত রুম চার্জ",
    "মোবাইল চার্জিং বা পাহাড়ি এলাকায় হট ওয়াটার ফি",
    "হঠাৎ প্রাকৃতিক দুর্যোগে আটকে গেলে অতিরিক্ত খরচ",
    "বাসের নির্দিষ্ট স্টপ ছাড়া অন্য কোথাও নামা বা ওঠার খরচ"
  ]

  // ডায়নামিক ট্যাগস (চেকলিস্ট)
  const [tags, setTags] = useState({ included: [], gear: [], excluded: [], warnings: [] })
  const [tagInputs, setTagInputs] = useState({ included: '', gear: '', excluded: '', warnings: '' })

  // ডে-টু-ডে প্ল্যানার
  const [itinerary, setItinerary] = useState([{ day: 1, title: '', desc: '' }])

  const IMGBB_API_KEY = 'c8e142b508f46f59807dbb6a3a2ccb23' 

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

  // 🔴 Image Cropper Logic (Free-Form Support)
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

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      )

      let quality = 0.8
      let base64Image = canvas.toDataURL('image/jpeg', quality)
      
      // Client-side compression (<100KB guard)
      while (base64Image.length > 130000 && quality > 0.2) {
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

  // 🔴 Smart Checklist Logic
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
    if (!imageFile && !imagePreview) {
      alert("অনুগ্রহ করে একটি কভার ছবি আপলোড করুন!")
      return
    }

    setLoading(true)

    try {
      let finalCoverPhotoUrl = imagePreview

      if (imageFile) {
        const imgFormData = new FormData()
        imgFormData.append('image', imageFile)

        const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: imgFormData
        })
        const imgbbData = await imgbbResponse.json()
        
        if (!imgbbData.success) throw new Error("ছবি আপলোড ফেইল করেছে!")
        finalCoverPhotoUrl = imgbbData.data.url
      }

      const eventPayload = {
        title: formData.title,
        category: formData.category,
        destination: formData.destination,
        cover_photo: finalCoverPhotoUrl,
        start_date: formData.startDate,
        end_date: formData.endDate,
        reporting_place: formData.reportingPlace,
        deadline: formData.deadline,
        total_seats: parseInt(formData.totalSeats),
        booked_seats: 0,
        tour_fee: parseInt(formData.totalFee),
        booking_fee: parseInt(formData.bookingFee),
        refund_policy: formData.refundPolicy,
        payment_methods: formData.paymentMethods,
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
        album_link: formData.albumLink,
        included: tags.included,
        required_gear: tags.gear,
        excluded: tags.excluded,
        warnings: tags.warnings,
        itinerary: itinerary,
        stats_meta: {
            treks: parseInt(formData.metaTreks) || 0,
            distance: parseInt(formData.metaDistance) || 0,
            nights: isDayEvent ? 0 : (parseInt(formData.metaNights) || 0)
        },
        status: "upcoming"
      }

      const { error } = await supabase.from('events').insert([eventPayload])
      if (error) throw error

      alert("মাস্টারপিস ইভেন্ট সফলভাবে লঞ্চ করা হয়েছে!")
      router.push('/admin/events')

    } catch (error) {
      console.error(error)
      alert("ইভেন্ট তৈরি করতে সমস্যা হয়েছে: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 🔴 Smart Category Variables
  const isDayEvent = formData.category === 'Day Tour' || formData.category === 'Workshop'
  const isCycling = formData.category === 'Cycling'
  const isSwimming = formData.category === 'Swimming'

  return (
    <div className="min-h-screen bg-[#050b08] pb-12 px-4 sm:px-6 relative text-gray-300 pt-24">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex items-center gap-4 mb-8">
            <Link href="/admin/events" className="text-gray-400 hover:text-white bg-white/5 p-3 rounded-xl transition-colors">
                <i className="fa-solid fa-arrow-left"></i>
            </Link>
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">স্মার্ট ইভেন্ট লঞ্চিং ইঞ্জিন</h1>
                <p className="text-sm text-gray-400">ট্রেকিং, সাইক্লিং বা ক্যাম্পিং কাস্টমাইজ করুন</p>
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
                        <input type="text" id="title" required value={formData.title} onChange={handleInputChange} placeholder="e.g. কেওক্রাডং ক্লাউড ক্যাম্পিং ও ট্রেইল এক্সপ্লোর" className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-[#e76f51] text-white font-bold" />
                    </div>
                    
                    {/* কভার ছবি আপলোড ও ক্রপার ট্রিগার */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">কভার ছবি (স্বেচ্ছাধীন সাইজ ক্রপ)</label>
                        <div className="relative w-full h-48 sm:h-64 rounded-2xl border-2 border-dashed border-gray-600 overflow-hidden bg-black/20 flex items-center justify-center hover:border-[#e76f51] transition-colors">
                            {imagePreview ? (
                                <>
                                  <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <span className="text-white font-bold bg-black/60 px-4 py-2 rounded"><i className="fa-solid fa-crop"></i> আবার ক্রপ বা পরিবর্তন করুন</span>
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
                            <option value="Swimming">Swimming (সাঁতার)</option>
                            <option value="Houseboat/Cruise">Houseboat/Cruise</option>
                            <option value="Expedition">Expedition (অভিযান)</option>
                            <option value="Day Tour">Day Tour (ডে ট্যুর)</option>
                            <option value="Workshop">Workshop (ওয়ার্কশপ)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">মূল গন্তব্য *</label>
                        <input type="text" id="destination" required value={formData.destination} onChange={handleInputChange} placeholder="e.g. বান্দরবান, রুমা" className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-[#e76f51] text-white" />
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
                        <input type="text" id="reportingPlace" required value={formData.reportingPlace} onChange={handleInputChange} placeholder="e.g. চুয়েট গোলচত্বর / জিইসি মোড়" className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-blue-400 text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-red-400 mb-2 uppercase">রেজিস্ট্রেশন ডেডলাইন *</label>
                        <input type="datetime-local" id="deadline" required value={formData.deadline} onChange={handleInputChange} className="w-full bg-black/40 border border-red-500/50 p-4 rounded-xl outline-none focus:border-red-500 text-white" />
                    </div>
                </div>
            </div>

            {/* সেকশন ৩: ফিন্যান্সিয়াল */}
            <div>
                <h3 className="font-bold text-emerald-400 mb-6 text-lg flex items-center gap-2 border-b border-emerald-400/20 pb-2">
                    <i className="fa-solid fa-wallet"></i> ৩. ফিন্যান্সিয়াল ইঞ্জিন
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-emerald-400 mb-2 uppercase">বুকিং ফি (Advance) *</label>
                        <input type="number" id="bookingFee" required value={formData.bookingFee} onChange={handleInputChange} placeholder="1020" className="w-full bg-black/40 border border-emerald-500/30 p-4 rounded-xl outline-none focus:border-emerald-500 text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">টোটাল প্যাকেজ ফি *</label>
                        <input type="number" id="totalFee" required value={formData.totalFee} onChange={handleInputChange} placeholder="4500" className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-emerald-500 text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">মোট সিট সংখ্যা *</label>
                        <input type="number" id="totalSeats" required value={formData.totalSeats} onChange={handleInputChange} placeholder="25" className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-emerald-500 text-white" />
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">পেমেন্ট মেথড ও নাম্বার (বিকাশ/নগদ/রকেট) *</label>
                        <input type="text" id="paymentMethods" required value={formData.paymentMethods} onChange={handleInputChange} placeholder="e.g. bKash (Personal): 01XXXXXXXXX, Nagad: 01XXXXXXXXX" className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-emerald-500 text-white" />
                    </div>
                </div>
            </div>

            {/* সেকশন ৪: স্মার্ট লজিস্টিকস */}
            <div>
                <h3 className="font-bold text-purple-400 mb-6 text-lg flex items-center gap-2 border-b border-purple-400/20 pb-2">
                    <i className="fa-solid fa-campground"></i> ৪. লজিস্টিকস ও টিম পরিচালনা
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
                        <input type="text" id="teamLeader" required value={formData.teamLeader} onChange={handleInputChange} placeholder="Team Leader Name" className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white" />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">লিডার ফোন নম্বর *</label>
                        <input type="tel" id="leaderPhone" required value={formData.leaderPhone} onChange={handleInputChange} placeholder="01XXXXXXXXX" className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white" />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-blue-400 mb-2 uppercase">ইভেন্ট অ্যালবাম লিংক (গুগল ড্রাইভ ফোল্ডার) - ঐচ্ছিক</label>
                        <div className="flex items-center gap-3 bg-black/40 border border-white/10 p-2 rounded-xl focus-within:border-blue-400 transition-colors">
                            <i className="fa-brands fa-google-drive text-blue-400 pl-3 text-lg"></i>
                            <input type="url" id="albumLink" value={formData.albumLink} onChange={handleInputChange} placeholder="https://drive.google.com/drive/folders/..." className="w-full bg-transparent text-white outline-none p-2 text-sm" />
                        </div>
                    </div>

                    <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">সংক্ষিপ্ত বিবরণ *</label>
                        <textarea id="description" required rows="3" value={formData.description} onChange={handleInputChange} placeholder="ইভেন্টের আকর্ষণীয় বিবরণ ও সারসংক্ষেপ লিখুন..." className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white resize-none"></textarea>
                    </div>
                </div>
            </div>

            {/* সেকশন ৫: স্মার্ট ড্রপডাউন চেকলিস্ট */}
            <div>
                <h3 className="font-bold text-yellow-500 mb-6 text-lg flex items-center gap-2 border-b border-yellow-500/20 pb-2">
                    <i className="fa-solid fa-list-check"></i> ৫. রুলস ও চেকলিস্ট (প্রিসেট ও কাস্টম)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Included */}
                    <div className="bg-black/20 p-5 rounded-2xl border border-emerald-500/20">
                        <label className="block text-xs font-bold text-emerald-400 mb-3 uppercase">যা যা ইনক্লুডেড (Included)</label>
                        
                        <select 
                          onChange={(e) => {
                            if(e.target.value) {
                              handleTagAdd('included', e.target.value)
                              e.target.value = ""
                            }
                          }} 
                          className="w-full bg-black/40 border border-emerald-500/30 p-3 rounded-lg text-sm text-gray-300 mb-3 outline-none cursor-pointer"
                        >
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

                    {/* Excluded */}
                    <div className="bg-black/20 p-5 rounded-2xl border border-gray-500/30">
                        <label className="block text-xs font-bold text-gray-400 mb-3 uppercase">যা ইনক্লুডেড নয় (Excluded)</label>
                        
                        <select 
                          onChange={(e) => {
                            if(e.target.value) {
                              handleTagAdd('excluded', e.target.value)
                              e.target.value = ""
                            }
                          }} 
                          className="w-full bg-black/40 border border-gray-500/30 p-3 rounded-lg text-sm text-gray-300 mb-3 outline-none cursor-pointer"
                        >
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

            {/* সেকশন ৭: ডায়নামিক ইউজার রিওয়ার্ড পয়েন্ট */}
            <div>
                <h3 className="font-bold text-amber-500 mb-2 text-lg flex items-center gap-2 border-b border-amber-500/20 pb-2">
                    <i className="fa-solid fa-medal"></i> ৭. ইউজার প্রোফাইল পয়েন্ট ও রিওয়ার্ড
                </h3>
                <p className="text-xs text-gray-400 mb-6">ইভেন্টটি সাফল্যের সাথে সম্পন্ন হলে অংশগ্রহণকারী এক্সপ্লোরারের প্রোফাইলে এই রেকর্ডগুলো যুক্ত হবে।</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">
                          {isCycling ? 'মোট রাইডের সংখ্যা' : isSwimming ? 'সাঁতার সেশন সংখ্যা' : 'ট্রেকের সংখ্যা (কাউন্ট)'}
                        </label>
                        <input type="number" id="metaTreks" required value={formData.metaTreks} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">
                          {isCycling ? 'মোট রাইডিং দূরত্ব (কি.মি.)' : isSwimming ? 'মোট সাঁতারের দূরত্ব (মিটার)' : 'মোট হাঁটার দূরত্ব (কি.মি.)'}
                        </label>
                        <input type="number" id="metaDistance" required value={formData.metaDistance} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white" />
                    </div>
                    
                    {!isDayEvent && (
                      <div>
                          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">ক্যাম্পিং রাত সংখ্যা</label>
                          <input type="number" id="metaNights" required value={formData.metaNights} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white" />
                      </div>
                    )}
                </div>
            </div>

            {/* সাবমিট বাটন */}
            <div className="pt-6 mt-4 border-t border-white/10">
                <button type="submit" disabled={loading} className="w-full bg-[#e76f51] hover:bg-orange-600 text-white font-black text-lg py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(231,111,81,0.4)] flex items-center justify-center gap-3">
                    {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-rocket"></i>}
                    <span>{loading ? 'লঞ্চ হচ্ছে...' : 'ইভেন্ট সফলভাবে প্রকাশ করুন'}</span>
                </button>
            </div>

        </form>

        {/* 🔴 ফ্রি-ফর্ম ক্রপার মডাল (ইচ্ছামতো টেনে সাইজ করার স্বাধীনতা) */}
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

      </div>
    </div>
  )
}
