'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CreateEvent() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')

  // ফর্মের সাধারণ ডেটা (subtitle রিমুভ করা হয়েছে)
  const [formData, setFormData] = useState({
    title: '', category: 'Trekking', destination: '',
    startDate: '', endDate: '', reportingPlace: '', deadline: '',
    bookingFee: '', totalFee: '', totalSeats: '', refundPolicy: 'Non-Refundable', paymentMethods: '',
    stayType: 'Resort/Hotel Shared', washroom: 'Attached & Shared', foodPlan: '',
    difficulty: 'Moderate', tourVibe: 'Hardcore Trekking', fitnessLevel: '', teamLeader: '', leaderPhone: '', leaderWhatsapp: '',
    description: '', totalDays: 1,
    metaTreks: 1, metaDistance: '', metaNights: ''
  })

  // ডায়নামিক ট্যাগস (চেকলিস্ট)
  const [tags, setTags] = useState({ included: [], gear: [], excluded: [], warnings: [] })
  const [tagInputs, setTagInputs] = useState({ included: '', gear: '', excluded: '', warnings: '' })

  // ডে-টু-ডে প্ল্যানার
  const [itinerary, setItinerary] = useState([{ day: 1, title: '', desc: '' }])

  const canvasRef = useRef(null)

  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))

    // ডে-টু-ডে প্ল্যানার অটো-আপডেট
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

  // 🔴 অ্যাডভান্সড 16:9 ক্রপার লজিক (Canvas)
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          // 16:9 Aspect Ratio (e.g., 1280x720)
          canvas.width = 1280
          canvas.height = 720
          
          const imgRatio = img.width / img.height
          const targetRatio = 16 / 9
          let drawWidth, drawHeight, offsetX, offsetY

          if (imgRatio > targetRatio) {
            drawHeight = canvas.height
            drawWidth = img.width * (canvas.height / img.height)
            offsetX = (canvas.width - drawWidth) / 2
            offsetY = 0
          } else {
            drawWidth = canvas.width
            drawHeight = img.height * (canvas.width / img.width)
            offsetX = 0
            offsetY = (canvas.height - drawHeight) / 2
          }
          
          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
          
          let quality = 0.8
          let base64String = canvas.toDataURL('image/jpeg', quality)
          
          // Compress < 100KB for mobile safety
          while (base64String.length > 150000 && quality > 0.2) {
            quality -= 0.1
            base64String = canvas.toDataURL('image/jpeg', quality)
          }
          
          setImagePreview(base64String)
          
          // Convert base64 back to Blob/File for ImgBB
          fetch(base64String)
            .then(res => res.blob())
            .then(blob => {
              const compressedFile = new File([blob], "cover.jpg", { type: "image/jpeg" })
              setImageFile(compressedFile)
            })
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    }
  }

  const handleTagAdd = (category) => {
    const value = tagInputs[category].trim()
    if (value) {
      setTags(prev => ({ ...prev, [category]: [...prev[category], value] }))
      setTagInputs(prev => ({ ...prev, [category]: '' }))
    }
  }

  const handleTagRemove = (category, index) => {
    setTags(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!imageFile) {
      alert("অনুগ্রহ করে কভার ছবি আপলোড করুন!")
      return
    }

    setLoading(true)

    try {
      const IMGBB_API_KEY = 'c8e142b508f46f59807dbb6a3a2ccb23' 
      const imgFormData = new FormData()
      imgFormData.append('image', imageFile)

      const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: imgFormData
      })
      const imgbbData = await imgbbResponse.json()
      
      if (!imgbbData.success) throw new Error("ছবি আপলোড ফেইল করেছে!")
      
      const coverPhotoUrl = imgbbData.data.url

      const newEvent = {
        title: formData.title,
        category: formData.category,
        destination: formData.destination,
        cover_photo: coverPhotoUrl,
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
        stay_type: formData.stayType,
        washroom: formData.washroom,
        food_plan: formData.foodPlan,
        difficulty: formData.difficulty,
        tour_vibe: formData.tourVibe,
        fitness_level: parseInt(formData.fitnessLevel) || 0,
        team_leader: formData.teamLeader,
        leader_phone: formData.leaderPhone,
        leader_whatsapp: formData.leaderWhatsapp,
        description: formData.description,
        included: tags.included,
        required_gear: tags.gear,
        excluded: tags.excluded,
        warnings: tags.warnings,
        itinerary: itinerary,
        stats_meta: {
            treks: parseInt(formData.metaTreks) || 0,
            distance: parseInt(formData.metaDistance) || 0,
            nights: parseInt(formData.metaNights) || 0
        },
        status: "upcoming"
      }

      const { error } = await supabase.from('events').insert([newEvent])
      if (error) throw error

      alert("মাস্টারপিস ইভেন্ট সফলভাবে লঞ্চ করা হয়েছে!")
      router.push('/admin')

    } catch (error) {
      console.error(error)
      alert("ইভেন্ট তৈরি করতে সমস্যা হয়েছে: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 🔴 স্মার্ট ক্যাটাগরি লজিক ভ্যারিয়েবলস
  const isDayEvent = formData.category === 'Day Tour' || formData.category === 'Workshop'
  const isCycling = formData.category === 'Cycling'
  const isSwimming = formData.category === 'Swimming' || formData.category === 'Houseboat/Cruise'

  return (
    <div className="min-h-screen bg-[#050b08] pb-12 px-4 sm:px-6 relative text-gray-300">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            <Link href="/admin" className="text-gray-400 hover:text-white bg-white/5 p-3 rounded-xl transition-colors">
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
                        <input type="text" id="title" required value={formData.title} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-[#e76f51] text-white font-bold" />
                    </div>
                    
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">কভার ছবি (অটো 16:9 ক্রপ) *</label>
                        <div className="relative w-full h-48 sm:h-64 rounded-2xl border-2 border-dashed border-gray-600 overflow-hidden bg-black/20 flex items-center justify-center hover:border-[#e76f51] transition-colors">
                            {imagePreview ? (
                                <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                            ) : (
                                <div className="text-center p-6 pointer-events-none">
                                    <i className="fa-solid fa-image text-4xl text-gray-500 mb-3"></i>
                                    <p className="text-sm font-bold text-gray-400">ক্লিক করে ছবি নির্বাচন করুন</p>
                                </div>
                            )}
                            <input type="file" accept="image/*" required onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
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
                            <option value="Day Tour">Day Tour</option>
                            <option value="Workshop">Workshop</option>
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
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">{isDayEvent ? 'ইভেন্ট শেষ' : 'ফিরে আসা'} *</label>
                        <input type="datetime-local" id="endDate" required value={formData.endDate} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-blue-400 text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">রিপোর্টিং প্লেস *</label>
                        <input type="text" id="reportingPlace" required value={formData.reportingPlace} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-blue-400 text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-red-400 mb-2 uppercase">ডেডলাইন *</label>
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
                        <input type="number" id="bookingFee" required value={formData.bookingFee} onChange={handleInputChange} className="w-full bg-black/40 border border-emerald-500/30 p-4 rounded-xl outline-none focus:border-emerald-500 text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">টোটাল ফি *</label>
                        <input type="number" id="totalFee" required value={formData.totalFee} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-emerald-500 text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">মোট সিট *</label>
                        <input type="number" id="totalSeats" required value={formData.totalSeats} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-emerald-500 text-white" />
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">পেমেন্ট মেথড ও নাম্বার (বিকাশ/নগদ) *</label>
                        <input type="text" id="paymentMethods" required value={formData.paymentMethods} onChange={handleInputChange} placeholder="e.g. bKash: 01XXX-XXXXXX (Personal)" className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-emerald-500 text-white" />
                    </div>
                </div>
            </div>

            {/* সেকশন ৪: স্মার্ট লজিস্টিকস (ক্যাটাগরি অনুযায়ী চেঞ্জ হবে) */}
            <div>
                <h3 className="font-bold text-purple-400 mb-6 text-lg flex items-center gap-2 border-b border-purple-400/20 pb-2">
                    <i className="fa-solid fa-campground"></i> ৪. ডায়নামিক লজিস্টিকস ও ভাইব
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* ডিফিকাল্টি (Workshop ছাড়া সবখানে দেখাবে) */}
                    {formData.category !== 'Workshop' && (
                      <div>
                          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">ডিফিকাল্টি *</label>
                          <select id="difficulty" value={formData.difficulty} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white">
                              <option value="Beginner">Beginner (সহজ)</option>
                              <option value="Moderate">Moderate (মাঝারি)</option>
                              <option value="Hard">Hard (কঠিন)</option>
                              <option value="Extreme">Extreme</option>
                          </select>
                      </div>
                    )}

                    {/* স্টে টাইপ (Day ইভেন্ট ছাড়া দেখাবে) */}
                    {!isDayEvent && (
                      <div>
                          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">থাকার ব্যবস্থা *</label>
                          <select id="stayType" value={formData.stayType} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white">
                              <option value="Resort/Hotel Shared">Resort/Hotel Shared</option>
                              <option value="Tent Camping">Tent Camping</option>
                              <option value="Houseboat">Houseboat</option>
                              <option value="Tribal Cottage">Tribal Cottage</option>
                              <option value="No Stay (Overnight Travel)">No Stay (Overnight Travel)</option>
                          </select>
                      </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">টিম লিডার *</label>
                        <input type="text" id="teamLeader" required value={formData.teamLeader} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">লিডার ফোন *</label>
                        <input type="text" id="leaderPhone" required value={formData.leaderPhone} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white" />
                    </div>

                    <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">সংক্ষিপ্ত বিবরণ *</label>
                        <textarea id="description" required rows="3" value={formData.description} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white resize-none"></textarea>
                    </div>
                </div>
            </div>

            {/* সেকশন ৫: ডায়নামিক ট্যাগস */}
            <div>
                <h3 className="font-bold text-yellow-500 mb-6 text-lg flex items-center gap-2 border-b border-yellow-500/20 pb-2">
                    <i className="fa-solid fa-list-check"></i> ৫. রুলস ও চেকলিস্ট
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    <div className="bg-black/20 p-5 rounded-2xl border border-emerald-500/20">
                        <label className="block text-xs font-bold text-emerald-400 mb-3 uppercase">যা যা ইনক্লুডেড</label>
                        <div className="flex gap-2 mb-3">
                            <input type="text" value={tagInputs.included} onChange={(e) => setTagInputs({...tagInputs, included: e.target.value})} className="bg-black/40 border border-white/10 flex-grow p-2 rounded-lg text-sm text-white" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleTagAdd('included'))} />
                            <button type="button" onClick={() => handleTagAdd('included')} className="bg-emerald-500 text-white px-4 rounded-lg font-bold">Add</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {tags.included.map((tag, idx) => (
                                <span key={idx} className="bg-white/10 px-3 py-1 rounded-full text-xs flex items-center gap-2">{tag} <i className="fa-solid fa-xmark text-red-400 cursor-pointer" onClick={() => handleTagRemove('included', idx)}></i></span>
                            ))}
                        </div>
                    </div>

                    <div className="bg-black/20 p-5 rounded-2xl border border-gray-500/30">
                        <label className="block text-xs font-bold text-gray-400 mb-3 uppercase">যা ইনক্লুডেড নয়</label>
                        <div className="flex gap-2 mb-3">
                            <input type="text" value={tagInputs.excluded} onChange={(e) => setTagInputs({...tagInputs, excluded: e.target.value})} className="bg-black/40 border border-white/10 flex-grow p-2 rounded-lg text-sm text-white" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleTagAdd('excluded'))} />
                            <button type="button" onClick={() => handleTagAdd('excluded')} className="bg-gray-600 text-white px-4 rounded-lg font-bold">Add</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {tags.excluded.map((tag, idx) => (
                                <span key={idx} className="bg-white/10 px-3 py-1 rounded-full text-xs flex items-center gap-2">{tag} <i className="fa-solid fa-xmark text-red-400 cursor-pointer" onClick={() => handleTagRemove('excluded', idx)}></i></span>
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
                                <input type="text" required placeholder="দিনের টাইটেল" value={day.title} onChange={(e) => {
                                    const newItin = [...itinerary]; newItin[idx].title = e.target.value; setItinerary(newItin);
                                }} className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-sm font-bold text-white outline-none" />
                                <textarea required rows="2" placeholder="বিস্তারিত..." value={day.desc} onChange={(e) => {
                                    const newItin = [...itinerary]; newItin[idx].desc = e.target.value; setItinerary(newItin);
                                }} className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-sm resize-none text-white outline-none"></textarea>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* সেকশন ৭: ইউজারের প্রোফাইল রিওয়ার্ড (গ্যামিফিকেশন নাম পরিবর্তন) */}
            <div>
                <h3 className="font-bold text-amber-500 mb-6 text-lg flex items-center gap-2 border-b border-amber-500/20 pb-2">
                    <i className="fa-solid fa-medal"></i> ৭. ইউজার প্রোফাইল পয়েন্ট ও রিওয়ার্ড
                </h3>
                <p className="text-xs text-gray-500 mb-4">এই ইভেন্টটি সম্পন্ন হলে ইউজারের প্রোফাইলে এই পয়েন্টগুলো স্বয়ংক্রিয়ভাবে যোগ হবে।</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">ট্রেকের সংখ্যা (পয়েন্ট)</label>
                        <input type="number" id="metaTreks" required value={formData.metaTreks} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">{isCycling ? 'মোট রাইডিং দূরত্ব (কি.মি.)' : 'মোট হাঁটার দূরত্ব (কি.মি.)'}</label>
                        <input type="number" id="metaDistance" required value={formData.metaDistance} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white" />
                    </div>
                    
                    {/* ডে ট্যুর হলে ক্যাম্পিং রাত হাইড হয়ে যাবে */}
                    {!isDayEvent && (
                      <div>
                          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">ক্যাম্পিং রাত</label>
                          <input type="number" id="metaNights" required value={formData.metaNights} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white" />
                      </div>
                    )}
                </div>
            </div>

            {/* সাবমিট বাটন */}
            <div className="pt-6 mt-4 border-t border-white/10">
                <button type="submit" disabled={loading} className="w-full bg-[#e76f51] hover:bg-orange-600 text-white font-black text-lg py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(231,111,81,0.4)] flex items-center justify-center gap-3">
                    {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-rocket"></i>}
                    <span>{loading ? 'লঞ্চ হচ্ছে...' : 'মাস্টারপিস ইভেন্ট লঞ্চ করুন'}</span>
                </button>
            </div>

        </form>
      </div>
    </div>
  )
}
