'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AOS from 'aos'
import 'aos/dist/aos.css'

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    fullName: '', studentId: '', email: '', phone: '',
    department: '', batch: '', gender: '', bloodGroup: '',
    hall: '', tshirtSize: '', emergencyContact: '', emergencyRelation: '',
    swimmingSkill: '', hasBicycle: '', experienceLevel: '',
    fbLink: '', instaLink: '', password: '', confirmPassword: ''
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
    AOS.init({ once: true, offset: 50, duration: 800 })
  }, [])

  // জেন্ডার চেঞ্জ করলে হল অটোমেটিক রিসেট হওয়ার লজিক
  const handleChange = (e) => {
    const { id, value } = e.target;
    if (id === 'gender') {
      setFormData((prev) => ({ ...prev, gender: value, hall: '' }));
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: 'https://cuet-adventure-society-v2.pages.dev/auth/callback' 
        }
      })
      if (error) throw error
    } catch (error) {
      alert('গুগল লগইন ফেইল করেছে: ' + error.message)
      setGoogleLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      alert('পাসওয়ার্ড দুটি মিলছে না! দয়া করে আবার চেক করুন।')
      return
    }
    if (formData.password.length < 6) {
      alert('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।')
      return
    }

    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })
      if (authError) throw authError

      const user = authData.user
      if (user) {
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: user.id,
            full_name: formData.fullName,
            student_id: formData.studentId,
            email: formData.email,
            phone: formData.phone,
            department: formData.department.toUpperCase(),
            batch: formData.batch,
            gender: formData.gender,
            blood_group: formData.bloodGroup,
            hall: formData.hall,
            tshirt_size: formData.tshirtSize,
            emergency_contact: formData.emergencyContact,
            emergency_relation: formData.emergencyRelation,
            swimming_skill: formData.swimmingSkill,
            has_bicycle: formData.hasBicycle, 
            experience_level: formData.experienceLevel,
            fb_link: formData.fbLink,
            insta_link: formData.instaLink,
            role: 'explorer'
          }
        ])
        if (profileError) throw profileError

        alert('অ্যাডভেঞ্চার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!')
        router.push('/dashboard')
      }
    } catch (error) {
      // ⚠️ 스마트 (Smart) এরর হ্যান্ডলিং: JWT ও ঘড়ির সময়ের এরর যাচাই
      if (error.message.includes('JWT') || error.message.includes('future') || error.message.includes('expired')) {
        alert(
          '⚠️ আপনার ডিভাইসের ঘড়ির সময় সঠিক নেই!\n\n' +
          'দয়া করে আপনার মোবাইলের বা কম্পিউটারের সেটিংসে গিয়ে "Automatic Date & Time" (Network Time) চালু করুন এবং পেজটি রিলোড দিয়ে আবার চেষ্টা করুন। ঘড়ির সময় ঠিক না থাকলে নিরাপত্তার কারণে অ্যাকাউন্ট তৈরি করা যায় না।'
        );
      } else {
        alert('সমস্যা হয়েছে: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl w-full mx-auto mt-12 mb-12 glass-panel rounded-[2rem] shadow-[0_0_20px_rgba(231,111,81,0.1)] overflow-hidden flex flex-col md:flex-row relative z-10 border border-white/10" data-aos="zoom-in">
      
      {/* Left Side: Hero */}
      <div className="w-full md:w-5/12 bg-black/40 p-10 lg:p-14 flex flex-col justify-between relative overflow-hidden border-r border-white/5">
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div data-aos="fade-right" data-aos-delay="200">
            <div className="flex items-center gap-3 mb-12">
              <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-campfire transition-colors backdrop-blur-sm bg-white/5 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase border border-white/10">
                <i className="fa-solid fa-arrow-left"></i> <span>হোমপেজে ফিরে যান</span>
              </Link>
            </div>
            
            <div className="mb-8 transform transition-transform duration-700 hover:rotate-12">
              <i className="fa-solid fa-fire-flame-curved text-6xl text-[#e76f51] drop-shadow-[0_0_15px_rgba(231,111,81,0.8)] animate-pulse"></i>
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-5 text-white">
              অজানার পথে <br/><span className="text-[#e76f51]">প্রথম পা</span>
            </h2>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed border-l-2 border-[#e76f51] pl-4">
              একটি প্রোফাইল, অসংখ্য ট্রেইল। ক্লাবের ইভেন্ট বুকিং, ট্রেইল হিস্ট্রি এবং সেফটি ইনডেক্স ম্যানেজ করতে আজই আপনার অ্যাডভেঞ্চার আইডি তৈরি করুন।
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full md:w-7/12 p-8 sm:p-12 lg:p-16 relative">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-8 text-center sm:text-left" data-aos="fade-down" data-aos-delay="300">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 shadow-sm backdrop-blur-md text-[#e76f51] text-3xl">
            <i className="fa-solid fa-user-shield"></i>
          </div>
          <div className="mt-1">
            <h3 className="text-2xl lg:text-3xl font-black text-white mb-2 tracking-tight">অ্যাডভেঞ্চার অ্যাকাউন্ট তৈরি করুন</h3>
            <p className="text-sm text-gray-300 mb-2">
              ইতোমধ্যে কি অ্যাকাউন্ট আছে? <Link href="/login" className="text-[#e76f51] font-bold hover:text-white transition-colors border-b border-transparent hover:border-white pb-0.5">এখানে লগইন করুন</Link>
            </p>
            <p className="text-xs text-gray-500 font-medium">অধিক নিরাপত্তার জন্য আপনার গুগল অ্যাকাউন্ট সংযুক্ত করুন</p>
          </div>
        </div>

        {/* Google Login */}
        <div data-aos="fade-up" data-aos-delay="400">
          <button 
            onClick={handleGoogleLogin} 
            disabled={googleLoading}
            type="button" 
            className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-gray-200 hover:border-[#e76f51]/50 font-bold py-3.5 px-4 rounded-xl transition-all mb-6 relative overflow-hidden backdrop-blur-sm shadow-sm"
          >
            {googleLoading ? (
              <i className="fa-solid fa-circle-notch fa-spin text-gray-400"></i>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.08-1.92 3.27-4.74 3.27-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.58-2.77c-.98.66-2.23 1.06-3.7 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span>{googleLoading ? 'অপেক্ষা করুন...' : 'গুগল দিয়ে কন্টিনিউ করুন'}</span>
          </button>
        </div>

        <div className="relative flex items-center py-4 mb-6" data-aos="fade-up" data-aos-delay="450">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink-0 mx-4 text-gray-500 text-[10px] sm:text-xs font-bold tracking-widest uppercase bg-transparent px-2">অথবা ম্যানুয়ালি লিখুন</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-aos="fade-up" data-aos-delay="500">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">আপনার নাম *</label>
              <input type="text" id="fullName" required value={formData.fullName} onChange={handleChange} placeholder="Full Name" className="glass-input w-full text-sm rounded-xl block p-3.5 bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">স্টুডেন্ট আইডি *</label>
              <input type="text" id="studentId" required value={formData.studentId} onChange={handleChange} placeholder="e.g. 2101001" className="glass-input w-full text-sm rounded-xl block p-3.5 bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-aos="fade-up" data-aos-delay="550">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">ইমেইল অ্যাড্রেস *</label>
              <input type="email" id="email" required value={formData.email} onChange={handleChange} placeholder="example@cuet.ac.bd" className="glass-input w-full text-sm rounded-xl block p-3.5 bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">নিজের ফোন নম্বর *</label>
              <input type="tel" id="phone" required value={formData.phone} onChange={handleChange} placeholder="01XXXXXXXXX" className="glass-input w-full text-sm rounded-xl block p-3.5 bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-aos="fade-up" data-aos-delay="600">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">ডিপার্টমেন্ট *</label>
              <input type="text" id="department" required value={formData.department} onChange={handleChange} placeholder="e.g. ME, CE..." className="glass-input w-full text-sm rounded-xl block p-3.5 uppercase bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">ব্যাচ (সাল) *</label>
              <select id="batch" required value={formData.batch} onChange={handleChange} className="glass-input w-full text-sm rounded-xl block p-3.5 appearance-none cursor-pointer bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none">
                <option value="" disabled>নির্বাচন করুন</option>
                {years.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-aos="fade-up" data-aos-delay="650">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">জেন্ডার *</label>
              <select id="gender" required value={formData.gender} onChange={handleChange} className="glass-input w-full text-sm rounded-xl block p-3.5 appearance-none cursor-pointer bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none">
                <option value="" disabled>নির্বাচন করুন</option>
                <option value="Male">পুরুষ (Male)</option>
                <option value="Female">নারী (Female)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">রক্তের গ্রুপ *</label>
              <select id="bloodGroup" required value={formData.bloodGroup} onChange={handleChange} className="glass-input w-full text-sm rounded-xl block p-3.5 appearance-none cursor-pointer bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none">
                <option value="" disabled>নির্বাচন করুন</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-aos="fade-up" data-aos-delay="700">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">আবাসিক হল *</label>
              <select 
                id="hall" 
                required 
                value={formData.hall} 
                onChange={handleChange} 
                disabled={!formData.gender}
                className={`glass-input w-full text-sm rounded-xl block p-3.5 appearance-none cursor-pointer bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none ${!formData.gender ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="" disabled>{formData.gender ? "নির্বাচন করুন" : "প্রথমে জেন্ডার নির্বাচন করুন"}</option>
                {formData.gender === 'Male' && maleHalls.map(h => <option key={h} value={h}>{h}</option>)}
                {formData.gender === 'Female' && femaleHalls.map(h => <option key={h} value={h}>{h}</option>)}
                <option value="Attached/Non-residential">অ্যাটাচড/অনাবাসিক</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">টি-শার্ট সাইজ *</label>
              <select id="tshirtSize" required value={formData.tshirtSize} onChange={handleChange} className="glass-input w-full text-sm rounded-xl block p-3.5 appearance-none cursor-pointer bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none">
                <option value="" disabled>নির্বাচন করুন</option>
                <option value="S">S (Small)</option><option value="M">M (Medium)</option>
                <option value="L">L (Large)</option><option value="XL">XL (Extra Large)</option>
                <option value="XXL">XXL (Double XL)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-aos="fade-up" data-aos-delay="750">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">জরুরি কন্টাক্ট নম্বর *</label>
              <input type="tel" id="emergencyContact" required value={formData.emergencyContact} onChange={handleChange} placeholder="01XXXXXXXXX" className="glass-input w-full text-sm rounded-xl block p-3.5 bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">সম্পর্ক (যেমন: বাবা/ভাই) *</label>
              <input type="text" id="emergencyRelation" required value={formData.emergencyRelation} onChange={handleChange} placeholder="e.g. Father, Brother" className="glass-input w-full text-sm rounded-xl block p-3.5 bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-aos="fade-up" data-aos-delay="800">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">সাঁতার জানেন? *</label>
              <select id="swimmingSkill" required value={formData.swimmingSkill} onChange={handleChange} className="glass-input w-full text-sm rounded-xl block p-3.5 appearance-none cursor-pointer bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none">
                <option value="" disabled>নির্বাচন করুন</option>
                <option value="Yes">হ্যাঁ</option>
                <option value="No">না</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">নিজের সাইকেল আছে? *</label>
              <select id="hasBicycle" required value={formData.hasBicycle} onChange={handleChange} className="glass-input w-full text-sm rounded-xl block p-3.5 appearance-none cursor-pointer bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none">
                <option value="" disabled>নির্বাচন করুন</option>
                <option value="Yes">হ্যাঁ</option>
                <option value="No">না</option>
              </select>
            </div>
          </div>

          <div data-aos="fade-up" data-aos-delay="850">
            <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">অ্যাডভেঞ্চার অভিজ্ঞতা *</label>
            <select id="experienceLevel" required value={formData.experienceLevel} onChange={handleChange} className="glass-input w-full text-sm rounded-xl block p-3.5 appearance-none cursor-pointer bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none">
              <option value="" disabled>নির্বাচন করুন</option>
              <option value="Beginner">বিগিনার (Beginner)</option>
              <option value="Intermediate">ইন্টারমিডিয়েট (Intermediate)</option>
              <option value="Pro">প্রো (Pro Trekker)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-aos="fade-up" data-aos-delay="900">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">ফেসবুক প্রোফাইল লিংক (ঐচ্ছিক)</label>
              <input type="text" id="fbLink" value={formData.fbLink} onChange={handleChange} placeholder="e.g. facebook.com/username" className="glass-input w-full text-sm rounded-xl block p-3.5 bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">ইন্সটাগ্রাম লিংক (ঐচ্ছিক)</label>
              <input type="text" id="instaLink" value={formData.instaLink} onChange={handleChange} placeholder="e.g. instagram.com/username" className="glass-input w-full text-sm rounded-xl block p-3.5 bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4" data-aos="fade-up" data-aos-delay="950">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">পাসওয়ার্ড *</label>
              <input type="password" id="password" required value={formData.password} onChange={handleChange} placeholder="••••••••" className="glass-input w-full text-sm rounded-xl block p-3.5 bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">পুনরায় পাসওয়ার্ড দিন *</label>
              <input type="password" id="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className="glass-input w-full text-sm rounded-xl block p-3.5 bg-black/40 border border-white/10 text-[#f3f4f6] focus:border-[#e76f51] outline-none" />
            </div>
          </div>

          <div className="pt-6" data-aos="zoom-in" data-aos-delay="1000">
            <button type="submit" disabled={loading} className="w-full bg-[#e76f51] hover:bg-orange-600 text-white font-black text-lg py-4 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(231,111,81,0.4)] hover:-translate-y-1 flex justify-center items-center gap-2">
              {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-compass"></i>}
              <span>{loading ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'অ্যাডভেঞ্চার অ্যাকাউন্ট তৈরি করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
