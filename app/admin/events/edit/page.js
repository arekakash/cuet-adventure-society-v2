// app/admin/events/edit/page.js
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EditEvent() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [eventId, setEventId] = useState(null)
  
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [existingImage, setExistingImage] = useState('')

  // ফর্মের সাধারণ ডেটা
  const [formData, setFormData] = useState({
    title: '', subtitle: '', category: 'Trekking', destination: '',
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

  const IMGBB_API_KEY = 'c8e142b508f46f59807dbb6a3a2ccb23' 

  // URL থেকে ID নিয়ে ইভেন্ট ফেচ করা
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get("id");
    
    if (id) {
      setEventId(id);
      fetchEventData(id);
    } else {
      alert("কোনো ইভেন্ট আইডি পাওয়া যায়নি!");
      router.push('/admin/events');
    }
  }, []);

  const fetchEventData = async (id) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        // ডেটা ফর্মে সেট করা
        setFormData({
          title: data.title || '', subtitle: data.subtitle || '', category: data.category || 'Trekking', destination: data.destination || '',
          startDate: data.start_date ? new Date(data.start_date).toISOString().slice(0, 16) : '', 
          endDate: data.end_date ? new Date(data.end_date).toISOString().slice(0, 16) : '', 
          reportingPlace: data.reporting_place || '', 
          deadline: data.deadline ? new Date(data.deadline).toISOString().slice(0, 16) : '',
          bookingFee: data.booking_fee || '', totalFee: data.tour_fee || '', totalSeats: data.total_seats || '', 
          refundPolicy: data.refund_policy || 'Non-Refundable', paymentMethods: data.payment_methods || '',
          stayType: data.stay_type || 'Resort/Hotel Shared', washroom: data.washroom || 'Attached & Shared', foodPlan: data.food_plan || '',
          difficulty: data.difficulty || 'Moderate', tourVibe: data.tour_vibe || 'Hardcore Trekking', 
          fitnessLevel: data.fitness_level || '', teamLeader: data.team_leader || '', 
          leaderPhone: data.leader_phone || '', leaderWhatsapp: data.leader_whatsapp || '',
          description: data.description || '', 
          totalDays: data.itinerary ? data.itinerary.length : 1,
          metaTreks: data.stats_meta?.treks || 0, metaDistance: data.stats_meta?.distance || 0, metaNights: data.stats_meta?.nights || 0
        });

        setTags({
          included: data.included || [], gear: data.required_gear || [], 
          excluded: data.excluded || [], warnings: data.warnings || []
        });

        setItinerary(data.itinerary || [{ day: 1, title: '', desc: '' }]);
        
        // ইমেজ প্রিভিউ সেট করা
        setExistingImage(data.cover_photo || '');
        setImagePreview(data.cover_photo || '');
      }
    } catch (error) {
      console.error(error);
      alert("ইভেন্ট ফেচ করতে সমস্যা হয়েছে!");
    } finally {
      setFetching(false);
    }
  };

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

  // ছবি সিলেক্ট এবং প্রিভিউ
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  // ডায়নামিক ট্যাগ হ্যান্ডলিং
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

  // ইভেন্ট আপডেট ফাংশন (SUBMIT UPDATE)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      let finalCoverPhotoUrl = existingImage;

      // যদি নতুন ছবি সিলেক্ট করা হয়, তবে ImgBB তে আপলোড হবে
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

      // 2. সুপাবেজে ডেটা UPDATE করা
      const updateData = {
        title: formData.title,
        subtitle: formData.subtitle,
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

  if (fetching) {
    return (
      <div className="min-h-screen bg-[#050b08] flex items-center justify-center">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-blue-500"></i>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050b08] pb-12 px-4 sm:px-6 relative text-gray-300 pt-24">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
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
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">ইভেন্টের শিরোনাম *</label>
                        <input type="text" id="title" required value={formData.title} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-[#e76f51] text-white font-bold" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">সাবটাইটেল / ট্যাগলাইন</label>
                        <input type="text" id="subtitle" value={formData.subtitle} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-[#e76f51] text-white" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">কভার ছবি (নতুন ছবি দিলে আপলোড করুন)</label>
                        <div className="relative w-full h-48 sm:h-64 rounded-2xl border-2 border-dashed border-gray-600 overflow-hidden bg-black/20 flex items-center justify-center hover:border-[#e76f51] transition-colors">
                            {imagePreview ? (
                                <>
                                  <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <span className="text-white font-bold bg-black/60 px-4 py-2 rounded">Change Image</span>
                                  </div>
                                </>
                            ) : (
                                <div className="text-center p-6 pointer-events-none">
                                    <i className="fa-solid fa-image text-4xl text-gray-500 mb-3"></i>
                                    <p className="text-sm font-bold text-gray-400">ক্লিক করে ছবি নির্বাচন করুন</p>
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">ক্যাটাগরি *</label>
                        <select id="category" value={formData.category} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-[#e76f51] text-white">
                            <option value="Trekking">Trekking</option>
                            <option value="Camping">Camping</option>
                            <option value="Houseboat/Cruise">Houseboat/Cruise</option>
                            <option value="Day Tour">Day Tour</option>
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
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">ফিরে আসা *</label>
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
                        <input type="text" id="paymentMethods" required value={formData.paymentMethods} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-emerald-500 text-white" />
                    </div>
                </div>
            </div>

            {/* সেকশন ৪: লজিস্টিকস ও ভাইব */}
            <div>
                <h3 className="font-bold text-purple-400 mb-6 text-lg flex items-center gap-2 border-b border-purple-400/20 pb-2">
                    <i className="fa-solid fa-campground"></i> ৪. লজিস্টিকস ও ভাইব
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">ডিফিকাল্টি *</label>
                        <select id="difficulty" value={formData.difficulty} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white">
                            <option value="Beginner">Beginner (সহজ)</option>
                            <option value="Moderate">Moderate (মাঝারি)</option>
                            <option value="Hard">Hard (কঠিন)</option>
                            <option value="Extreme">Extreme</option>
                        </select>
                    </div>
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
                    
                    {/* Included */}
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

                    {/* Excluded */}
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

            {/* সেকশন ৭: গ্যামিফিকেশন */}
            <div>
                <h3 className="font-bold text-amber-500 mb-6 text-lg flex items-center gap-2 border-b border-amber-500/20 pb-2">
                    <i className="fa-solid fa-chart-line"></i> ৭. গ্যামিফিকেশন স্ট্যাটস
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">ট্রেকের সংখ্যা</label>
                        <input type="number" id="metaTreks" required value={formData.metaTreks} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">মোট হাঁটার দূরত্ব (কি.মি.)</label>
                        <input type="number" id="metaDistance" required value={formData.metaDistance} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">ক্যাম্পিং রাত</label>
                        <input type="number" id="metaNights" required value={formData.metaNights} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white" />
                    </div>
                </div>
            </div>

            {/* আপডেট বাটন */}
            <div className="pt-6 mt-4 border-t border-white/10">
                <button type="submit" disabled={loading} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black text-lg py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center justify-center gap-3">
                    {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-pen-to-square"></i>}
                    <span>{loading ? 'আপডেট হচ্ছে...' : 'ইভেন্ট আপডেট করুন'}</span>
                </button>
            </div>

        </form>
      </div>
    </div>
  )
}
