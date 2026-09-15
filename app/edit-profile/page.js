'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AOS from 'aos'
import 'aos/dist/aos.css'

export default function EditProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  
  // ImgBB API Key (তোমার দেওয়া কি)
  const IMGBB_API_KEY = 'c8e142b508f46f59807dbb6a3a2ccb23'

  const [avatarPreview, setAvatarPreview] = useState('')
  const [croppedBase64Image, setCroppedBase64Image] = useState(null)

  const [formData, setFormData] = useState({
    full_name: '', student_id: '', email: '', department: '', batch: '',
    hall: '', blood_group: '', phone: '', emergency_contact: '',
    gender: '', emergency_relation: '', tshirt_size: '',
    swimming_skill: '', has_bicycle: '', experience_level: '',
    fb_link: '', insta_link: ''
  })

  // ১৯৬৮ থেকে ২০৫০ সাল পর্যন্ত ডায়নামিক ক্যালকুলেশন
  const years = Array.from({ length: 2050 - 1968 + 1 }, (_, i) => 2050 - i)

  // চুয়েটের আবাসিক হলের তালিকা
  const maleHalls = [
    "Dr. Qudrat-E-Khuda Hall",
    "Kabi Kazi Nazrul Islam Hall",
    "Muktijoddha Hall",
    "Shaheed Abu Sayeed Hall",
    "Shaheed Mohammad Shah Hall",
    "Shaheed Tareq Huda Hall"
  ]

  const femaleHalls = [
    "Sufia Kamal Hall",
    "Shamsennahar Khan Hall",
    "Taposhi Rabeya Hall"
  ]

  useEffect(() => {
    AOS.init({ once: true, offset: 50 })
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        router.push('/login')
        return
      }
      setUser(session.user)

      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (error) throw error

      if (data) {
        setFormData({
          full_name: data.full_name || '', student_id: data.student_id || '', email: data.email || '',
          department: data.department || '', batch: data.batch || '', hall: data.hall || '',
          blood_group: data.blood_group || '', phone: data.phone || '', emergency_contact: data.emergency_contact || '',
          gender: data.gender || '', emergency_relation: data.emergency_relation || '', tshirt_size: data.tshirt_size || '',
          swimming_skill: data.swimming_skill || '', has_bicycle: data.has_bicycle || '', experience_level: data.experience_level || '',
          fb_link: data.fb_link || '', insta_link: data.insta_link || ''
        })
        setAvatarPreview(data.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.full_name || 'User')}&background=0a1c13&color=fff&size=256`)
      }
    } catch (error) {
      console.error('ডেটা লোড করতে সমস্যা:', error.message)
    } finally {
      setLoading(false)
    }
  }

  // জেন্ডার চেঞ্জ করলে হল অটোমেটিক রিসেট হওয়ার লজিক
  const handleChange = (e) => {
    const { id, value } = e.target;
    if (id === 'gender') {
      setFormData((prev) => ({ ...prev, gender: value, hall: '' }));
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  }

  // ১:১ ক্রপ এবং <30KB কম্প্রেশন (Canvas API)
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          canvas.width = 300
          canvas.height = 300
          
          const size = Math.min(img.width, img.height)
          const startX = (img.width - size) / 2
          const startY = (img.height - size) / 2
          
          ctx.drawImage(img, startX, startY, size, size, 0, 0, 300, 300)
          
          let quality = 0.8
          let base64String = canvas.toDataURL('image/jpeg', quality)
          
          while (base64String.length > 40000 && quality > 0.1) {
            quality -= 0.1
            base64String = canvas.toDataURL('image/jpeg', quality)
          }
          
          setCroppedBase64Image(base64String)
          setAvatarPreview(base64String)
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      let photoUrl = avatarPreview

      // ImgBB-তে ছবি আপলোড
      if (croppedBase64Image && IMGBB_API_KEY !== 'YOUR_IMGBB_API_KEY') {
        const base64Data = croppedBase64Image.split(',')[1] // Data URI প্রিফিক্স বাদ দেওয়া
        const imgFormData = new FormData()
        imgFormData.append('image', base64Data)

        const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: imgFormData
        })
        
        const imgbbData = await imgbbRes.json()
        if (imgbbData.success) {
          photoUrl = imgbbData.data.url
        } else {
          throw new Error('ImgBB-তে ছবি আপলোড ফেইল করেছে!')
        }
      }

      // Supabase-এ ডেটা আপডেট
      const { error: updateError } = await supabase.from('profiles').update({
        ...formData,
        department: formData.department.toUpperCase(),
        photo_url: photoUrl
      }).eq('id', user.id)

      if (updateError) throw updateError

      alert('প্রোফাইল সফলভাবে আপডেট হয়েছে!')
      router.push('/dashboard')

    } catch (error) {
      alert('আপডেট করতে সমস্যা হয়েছে: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <i className="fa-solid fa-compass text-5xl text-campfire animate-spin mb-4"></i>
        <p className="text-gray-400 font-bold tracking-widest animate-pulse">প্রোফাইল ডেটা লোড হচ্ছে...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl w-full mx-auto my-12 bg-[#0a1c13]/70 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden relative z-10" data-aos="zoom-in">
      <div className="p-8 sm:p-10 border-b border-white/10 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-black/20">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <i className="fa-solid fa-user-pen text-campfire"></i> <span>প্রোফাইল এডিট</span>
          </h2>
          <p className="text-sm text-gray-400 mt-1">আপনার প্রয়োজনীয় তথ্য আপডেট করুন</p>
        </div>
        <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 px-4 py-2.5 rounded-xl text-sm font-bold border border-white/10">
          <i className="fa-solid fa-arrow-left"></i> <span>ড্যাশবোর্ড</span>
        </Link>
      </div>

      <div className="p-8 sm:p-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-6 mb-8 p-6 bg-white/5 rounded-2xl border border-white/5" data-aos="fade-up">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-campfire shadow-[0_0_15px_rgba(231,111,81,0.5)] group shrink-0">
              <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
              <label htmlFor="profilePic" className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <i className="fa-solid fa-camera text-white text-xl"></i>
              </label>
              <input type="file" id="profilePic" accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>
            <div>
              <p className="text-sm font-bold text-white mb-1">অ্যাভাটার আপডেট</p>
              <p className="text-xs text-gray-400 mb-2">ক্যামেরা আইকনে ক্লিক করে ছবি আপলোড করুন (&lt;30KB)</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" data-aos="fade-up">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">আপনার নাম *</label>
              <input type="text" id="full_name" required value={formData.full_name} onChange={handleChange} className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 outline-none focus:border-campfire" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">স্টুডেন্ট আইডি *</label>
              <input type="text" id="student_id" required value={formData.student_id} onChange={handleChange} className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 outline-none focus:border-campfire" />
            </div>
          </div>

          <div data-aos="fade-up">
            <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">ইমেইল অ্যাড্রেস (পরিবর্তনযোগ্য নয়)</label>
            <input type="email" value={formData.email} readOnly className="w-full bg-black/50 border border-white/10 text-gray-400 rounded-xl block p-3.5 outline-none opacity-70 cursor-not-allowed" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" data-aos="fade-up">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">ডিপার্টমেন্ট *</label>
              <input type="text" id="department" required value={formData.department} onChange={handleChange} className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 uppercase outline-none focus:border-campfire" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">ব্যাচ (সাল) *</label>
              <select id="batch" required value={formData.batch} onChange={handleChange} className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 outline-none cursor-pointer focus:border-campfire">
                <option value="" disabled>নির্বাচন করুন</option>
                {years.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" data-aos="fade-up">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">জেন্ডার *</label>
              <select id="gender" required value={formData.gender} onChange={handleChange} className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 outline-none cursor-pointer focus:border-campfire">
                <option value="" disabled>নির্বাচন করুন</option>
                <option value="Male">পুরুষ (Male)</option>
                <option value="Female">নারী (Female)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">আবাসিক হল *</label>
              <select 
                id="hall" 
                required 
                value={formData.hall} 
                onChange={handleChange} 
                disabled={!formData.gender}
                className={`w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 outline-none cursor-pointer focus:border-campfire ${!formData.gender ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="" disabled>{formData.gender ? "নির্বাচন করুন" : "প্রথমে জেন্ডার নির্বাচন করুন"}</option>
                {formData.gender === 'Male' && maleHalls.map(h => <option key={h} value={h}>{h}</option>)}
                {formData.gender === 'Female' && femaleHalls.map(h => <option key={h} value={h}>{h}</option>)}
                <option value="Attached/Non-residential">অ্যাটাচড/অনাবাসিক</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" data-aos="fade-up">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">রক্তের গ্রুপ *</label>
              <select id="blood_group" required value={formData.blood_group} onChange={handleChange} className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 outline-none cursor-pointer focus:border-campfire">
                <option value="" disabled>নির্বাচন করুন</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">টি-শার্ট সাইজ *</label>
              <select id="tshirt_size" required value={formData.tshirt_size} onChange={handleChange} className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 outline-none cursor-pointer focus:border-campfire">
                <option value="S">S (Small)</option><option value="M">M (Medium)</option>
                <option value="L">L (Large)</option><option value="XL">XL (Extra Large)</option>
                <option value="XXL">XXL (Double XL)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" data-aos="fade-up">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">নিজের ফোন নম্বর *</label>
              <input type="tel" id="phone" required value={formData.phone} onChange={handleChange} className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 outline-none focus:border-campfire" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">জরুরি কন্টাক্ট নম্বর *</label>
              <input type="tel" id="emergency_contact" required value={formData.emergency_contact} onChange={handleChange} className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 outline-none focus:border-campfire" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" data-aos="fade-up">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">জরুরি কন্টাক্টের সাথে সম্পর্ক *</label>
              <input type="text" id="emergency_relation" required value={formData.emergency_relation} onChange={handleChange} placeholder="e.g. Father, Brother" className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 outline-none focus:border-campfire" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">অ্যাডভেঞ্চার অভিজ্ঞতা *</label>
              <select id="experience_level" required value={formData.experience_level} onChange={handleChange} className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 outline-none cursor-pointer focus:border-campfire">
                <option value="" disabled>নির্বাচন করুন</option>
                <option value="Beginner">বিগিনার (Beginner)</option>
                <option value="Intermediate">ইন্টারমিডিয়েট (Intermediate)</option>
                <option value="Pro">প্রো (Pro Trekker)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" data-aos="fade-up">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">সাঁতার জানেন? *</label>
              <select id="swimming_skill" required value={formData.swimming_skill} onChange={handleChange} className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 outline-none cursor-pointer focus:border-campfire">
                <option value="" disabled>নির্বাচন করুন</option>
                <option value="Yes">হ্যাঁ</option>
                <option value="No">না</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">নিজের সাইকেল আছে? *</label>
              <select id="has_bicycle" required value={formData.has_bicycle} onChange={handleChange} className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 outline-none cursor-pointer focus:border-campfire">
                <option value="" disabled>নির্বাচন করুন</option>
                <option value="Yes">হ্যাঁ</option>
                <option value="No">না</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" data-aos="fade-up">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">ফেসবুক লিংক (ঐচ্ছিক)</label>
              <input type="text" id="fb_link" value={formData.fb_link} onChange={handleChange} placeholder="facebook.com/username" className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 outline-none focus:border-campfire" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">ইন্সটাগ্রাম লিংক (ঐচ্ছিক)</label>
              <input type="text" id="insta_link" value={formData.insta_link} onChange={handleChange} placeholder="instagram.com/username" className="w-full bg-black/40 border border-white/10 text-white rounded-xl block p-3.5 outline-none focus:border-campfire" />
            </div>
          </div>

          <div className="pt-8" data-aos="zoom-in">
            <button type="submit" disabled={saving} className="w-full bg-[#2d6a4f] hover:bg-emerald-700 text-white font-black text-lg py-4 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(45,106,79,0.5)] hover:-translate-y-1 flex justify-center items-center gap-2">
              {saving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
              <span>{saving ? 'সেভ হচ্ছে...' : 'পরিবর্তন সেভ করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
