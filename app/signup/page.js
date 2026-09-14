'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [currentLang, setCurrentLang] = useState('bn')
  const [theme, setTheme] = useState('dark')

  // ফর্মের স্টেট
  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    email: '',
    phone: '',
    department: '',
    batch: '',
    gender: '',
    bloodGroup: '',
    hall: '',
    tshirtSize: '',
    emergencyContact: '',
    emergencyRelation: '',
    swimmingSkill: '',
    hasBicycle: '',
    experienceLevel: '',
    fbLink: '',
    instaLink: '',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') || 'bn'
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setCurrentLang(savedLang)
    setTheme(savedTheme)
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light')
    }
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      alert(currentLang === 'bn' ? 'পাসওয়ার্ড দুটি মিলছে না!' : 'Passwords do not match!')
      return
    }

    setLoading(true)
    try {
      // ১. Supabase Auth এ ইউজার সাইন আপ
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError

      const user = authData.user
      if (user) {
        // ২. Supabase profiles টেবিলে ইউজারের বিস্তারিত তথ্য সেভ করা
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: user.id,
            full_name: formData.fullName,
            email: formData.email,
            department: formData.department.toUpperCase(),
            batch: formData.batch,
            blood_group: formData.bloodGroup,
            role: 'explorer'
          }
        ])

        if (profileError) throw profileError

        alert(currentLang === 'bn' ? 'অ্যাডভেঞ্চার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!' : 'Adventure account created successfully!')
        router.push('/dashboard')
      }
    } catch (error) {
      alert((currentLang === 'bn' ? 'সমস্যা হয়েছে: ' : 'Error: ') + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-darkForest text-gray-300 font-sans p-6 md:p-12 flex items-center justify-center">
      <div className="max-w-4xl w-full bg-[#0a1c13]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
          <h1 className="text-2xl md:text-3xl font-black text-white">
            <span className="text-campfire">CUET AS</span> সাইন আপ
          </h1>
          <a href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            <i className="fa-solid fa-arrow-left mr-2"></i> হোম
          </a>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2">আপনার নাম *</label>
              <input type="text" id="fullName" required value={formData.fullName} onChange={handleChange} placeholder="Full Name" className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-white focus:border-campfire outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2">স্টুডেন্ট আইডি *</label>
              <input type="text" id="studentId" required value={formData.studentId} onChange={handleChange} placeholder="e.g. 2101001" className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-white focus:border-campfire outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2">ইমেইল অ্যাড্রেস *</label>
              <input type="email" id="email" required value={formData.email} onChange={handleChange} placeholder="example@cuet.ac.bd" className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-white focus:border-campfire outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2">ফোন নম্বর *</label>
              <input type="tel" id="phone" required value={formData.phone} onChange={handleChange} placeholder="01XXXXXXXXX" className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-white focus:border-campfire outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2">ডিপার্টমেন্ট *</label>
              <input type="text" id="department" required value={formData.department} onChange={handleChange} placeholder="e.g. ME, CSE" className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-white focus:border-campfire outline-none uppercase" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2">ব্যাচ *</label>
              <select id="batch" required value={formData.batch} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-white focus:border-campfire outline-none">
                <option value="">নির্বাচন করুন</option>
                <option value="2022">2022</option>
                <option value="2023">2023</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2">রক্তের গ্রুপ *</label>
              <select id="bloodGroup" required value={formData.bloodGroup} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-white focus:border-campfire outline-none">
                <option value="">নির্বাচন করুন</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2">রক্তের গ্রুপ / অভিজ্ঞতা</label>
              <select id="experienceLevel" required value={formData.experienceLevel} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-white focus:border-campfire outline-none">
                <option value="">অভিজ্ঞতা নির্বাচন করুন</option>
                <option value="Beginner">Beginner (বিগিনার)</option>
                <option value="Intermediate">Intermediate (ইন্টারমিডিয়েট)</option>
                <option value="Pro">Pro (প্রো)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2">পাসওয়ার্ড *</label>
              <input type="password" id="password" required value={formData.password} onChange={handleChange} placeholder="••••••••" className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-white focus:border-campfire outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2">পুনরায় পাসওয়ার্ড দিন *</label>
              <input type="password" id="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-white focus:border-campfire outline-none" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-campfire hover:bg-orange-600 text-white font-black py-4 rounded-xl transition-all shadow-glow flex justify-center items-center gap-2 text-lg">
            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-compass">​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​</i>}
            <span>{loading ? 'প্রোফাইল তৈরি হচ্ছে...' : 'অ্যাডভেঞ্চার অ্যাকাউন্ট তৈরি করুন'}</span>
          </button>
        </form>
      </div>
    </main>
  )
}
