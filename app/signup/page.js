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
  const [facebookLoading, setFacebookLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState({
    fullName: '', studentId: '', email: '', phone: '',
    department: '', batch: '', gender: '', bloodGroup: '',
    hall: '', tshirtSize: '', emergencyContact: '', emergencyRelation: '',
    swimmingSkill: '', hasBicycle: '', experienceLevel: '',
    fbLink: '', instaLink: '', password: '', confirmPassword: ''
  })

  const years = Array.from({ length: 2050 - 1968 + 1 }, (_, i) => 2050 - i)

  // ✅ নতুন: চুয়েটের ১২টি স্নাতক ডিপার্টমেন্টের কোড
  const departmentCodes = [
    'ARCH', // Architecture
    'BME',  // Biomedical Engineering
    'CE',   // Civil Engineering
    'CSE',  // Computer Science and Engineering
    'EEE',  // Electrical and Electronic Engineering
    'ETE',  // Electronics and Telecommunication Engineering
    'MME',  // Materials and Metallurgical Engineering
    'ME',   // Mechanical Engineering
    'MIE',  // Mechatronics and Industrial Engineering
    'PME',  // Petroleum and Mining Engineering
    'URP',  // Urban and Regional Planning
    'WRE',  // Water Resources Engineering
  ]

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
    AOS.init({
      once: true,
      offset: 50,
      duration: 400,
      easing: 'ease-out',
      initClassName: 'aos-init',
      animatedClassName: 'aos-animate',
      disable: () => {
        if (typeof window === 'undefined') return false
        const w = window.innerWidth
        return w > 640 && w <= 1024
      },
    })
  }, [])

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
          redirectTo: 'https://cuetas.pages.dev/auth/callback'
        }
      })
      if (error) throw error
    } catch (error) {
      alert('গুগল লগইন ফেইল করেছে: ' + error.message)
      setGoogleLoading(false)
    }
  }

  const handleFacebookLogin = async () => {
    setFacebookLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: 'https://cuetas.pages.dev/auth/callback'
        }
      })
      if (error) throw error
    } catch (error) {
      alert('ফেসবুক লগইন ফেইল করেছে: ' + error.message)
      setFacebookLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      alert('পাসওয়ার্ড দুটি মিলছে না! দয়া করে আবার চেক করুন।')
      return
    }
    if (formData.password.length < 6) {
      alert('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।')
      return
    }

    const studentId = formData.studentId.trim()
    const validDeptCodes = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

    if (studentId.length !== 7 || isNaN(studentId)) {
      alert('⚠️ ইনভ্যালিড চুয়েট আইডি! স্টুডেন্ট আইডি অবশ্যই ৭ ডিজিটের নাম্বার হতে হবে (যেমন: 2101001)।')
      return
    }

    const deptCode = studentId.substring(2, 4)
    if (!validDeptCodes.includes(deptCode)) {
      alert(`⚠️ ইনভ্যালিড আইডি! '${deptCode}' নামে চুয়েটে কোনো ডিপার্টমেন্ট কোড নেই। দয়া করে সঠিক স্টুডেন্ট আইডি দিন।`)
      return
    }

    setLoading(true)
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('student_id')
        .eq('student_id', studentId)
        .single()

      if (existingUser) {
        alert('❌ এই স্টুডেন্ট আইডি দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট খোলা হয়েছে! দয়া করে লগইন করুন।')
        setLoading(false)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError

      const user = authData.user
      if (user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: user.id,
          full_name: formData.fullName,
          student_id: studentId,
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
        })

        if (profileError) throw profileError

        alert('✅ অ্যাডভেঞ্চার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!')
        router.push('/dashboard')
      }

    } catch (error) {
      if (error.message.includes('JWT') || error.message.includes('future') || error.message.includes('expired')) {
        alert(
          '⚠️ আপনার ডিভাইসের ঘড়ির সময় সঠিক নেই!\n\n' +
          'দয়া করে আপনার মোবাইলের বা কম্পিউটারের সেটিংসে গিয়ে "Automatic Date & Time" (Network Time) চালু করুন এবং পেজটি রিলোড দিয়ে আবার চেষ্টা করুন।'
        );
      } else {
        alert('সমস্যা হয়েছে: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fcf9f2] dark:bg-transparent py-12 px-4 sm:px-6 relative transition-colors">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .signup-glow-yellow {
          background: radial-gradient(circle,
            rgba(253, 224, 71, 0.22) 0%,
            rgba(253, 224, 71, 0.07) 38%,
            transparent 70%);
        }
        .signup-glow-emerald {
          background: radial-gradient(circle,
            rgba(6, 95, 70, 0.16) 0%,
            rgba(6, 95, 70, 0.05) 38%,
            transparent 70%);
        }
        .dark .signup-glow-yellow {
          background: radial-gradient(circle,
            rgba(231, 111, 81, 0.18) 0%,
            rgba(231, 111, 81, 0.05) 38%,
            transparent 70%);
        }
        .dark .signup-glow-emerald {
          background: radial-gradient(circle,
            rgba(45, 106, 79, 0.16) 0%,
            rgba(45, 106, 79, 0.04) 38%,
            transparent 70%);
        }

        [data-aos].aos-init:not(.aos-animate) {
          opacity: 0;
          will-change: opacity, transform;
        }
        [data-aos].aos-animate {
          will-change: auto;
        }

        @media (max-width: 1024px) {
          .backdrop-blur-sm,
          .backdrop-blur-md,
          .backdrop-blur,
          .backdrop-blur-xl {
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
          }
          .glass-panel,
          .glass-input {
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-aos] {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }
      `,
        }}
      />

      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#fcf9f2]/90 via-[#f3eedd]/80 to-[#fcf9f2]/90 dark:bg-transparent dark:from-transparent dark:via-transparent dark:to-transparent"></div>
        <div
          className="signup-glow-yellow absolute top-1/4 right-1/4 w-[520px] h-[520px] rounded-full"
          aria-hidden
        />
        <div
          className="signup-glow-emerald absolute bottom-1/4 left-1/4 w-[460px] h-[460px] rounded-full"
          aria-hidden
        />
      </div>

      <div className="max-w-6xl w-full mx-auto mt-12 mb-12 bg-white/60 dark:bg-transparent dark:glass-panel rounded-[2rem] shadow-soft dark:shadow-[0_0_20px_rgba(231,111,81,0.1)] overflow-hidden flex flex-col md:flex-row relative z-10 border border-yellow-700/10 dark:border-white/10 transition-colors" data-aos="zoom-in">

        {/* Left Side: Hero */}
        <div className="w-full md:w-5/12 bg-emerald-950/5 dark:bg-black/40 p-10 lg:p-14 flex flex-col justify-between relative overflow-hidden border-r border-emerald-900/10 dark:border-white/5 transition-colors">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div data-aos="fade-right" data-aos-delay="100">
              <div className="flex items-center gap-3 mb-12">
                <Link href="/" className="inline-flex items-center gap-2 text-emerald-800 dark:text-gray-400 hover:text-black dark:hover:text-campfire transition-colors bg-white/70 dark:bg-white/5 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase border border-emerald-900/10 dark:border-white/10 shadow-sm dark:shadow-none">
                  <i className="fa-solid fa-arrow-left"></i> <span>হোমপেজে ফিরে যান</span>
                </Link>
              </div>

              <div className="mb-8 transition-transform duration-300 hover:rotate-12">
                <i className="fa-solid fa-fire-flame-curved text-6xl text-yellow-600 dark:text-[#e76f51] transition-colors"></i>
              </div>

              <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-5 text-gray-900 dark:text-white transition-colors">
                অজানার পথে <br /><span className="text-yellow-600 dark:text-[#e76f51] transition-colors">প্রথম পা</span>
              </h2>
              <p className="text-emerald-800 dark:text-gray-400 text-sm sm:text-base leading-relaxed border-l-2 border-yellow-500 dark:border-[#e76f51] pl-4 font-medium transition-colors">
                চুয়েট অ্যাডভেঞ্চার সোসাইটির সাথে আপনার সমস্ত এক্টিভিটি ম্যানেজ করতে আপনার অ্যাডভেঞ্চার একাউন্ট তৈরি করুন।
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-7/12 p-8 sm:p-12 lg:p-16 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-8 text-center sm:text-left" data-aos="fade-down" data-aos-delay="150">
            <div className="p-4 bg-yellow-50 dark:bg-white/5 rounded-2xl border border-yellow-200 dark:border-white/10 shadow-sm text-yellow-600 dark:text-[#e76f51] text-3xl transition-colors">
              <i className="fa-solid fa-user-shield"></i>
            </div>
            <div className="mt-1">
              <h3 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight transition-colors">অ্যাডভেঞ্চার অ্যাকাউন্ট তৈরি করুন</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 transition-colors">
                ইতোমধ্যে কি অ্যাকাউন্ট আছে? <Link href="/login" className="text-emerald-700 dark:text-[#e76f51] font-bold hover:text-black dark:hover:text-white transition-colors border-b border-transparent hover:border-black dark:hover:border-white pb-0.5">এখানে লগইন করুন</Link>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 font-medium transition-colors">অধিক নিরাপত্তার জন্য আপনার গুগল বা ফেসবুক অ্যাকাউন্ট সংযুক্ত করুন</p>
            </div>
          </div>

          {/* Social Login Buttons (Google & Facebook) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6" data-aos="fade-up" data-aos-delay="200">
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              type="button"
              className="w-full flex items-center justify-center gap-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:border-yellow-500 dark:hover:border-[#e76f51]/50 font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm dark:shadow-none text-sm hover:shadow-md dark:hover:shadow-none"
            >
              {googleLoading ? (
                <i className="fa-solid fa-circle-notch fa-spin text-gray-400"></i>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.08-1.92 3.27-4.74 3.27-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.58-2.77c-.98.66-2.23 1.06-3.7 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              <span>{googleLoading ? 'অপেক্ষা করুন...' : 'গুগল দিয়ে সাইন-আপ'}</span>
            </button>

            <button
              onClick={handleFacebookLogin}
              disabled={facebookLoading}
              type="button"
              className="w-full flex items-center justify-center gap-2 bg-[#1877F2]/5 dark:bg-[#1877F2]/10 border border-[#1877F2]/20 dark:border-[#1877F2]/30 text-[#1877F2] hover:bg-[#1877F2] hover:text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm dark:shadow-none text-sm hover:shadow-md dark:hover:shadow-none"
            >
              {facebookLoading ? (
                <i className="fa-solid fa-circle-notch fa-spin text-gray-400"></i>
              ) : (
                <i className="fa-brands fa-facebook text-[#1877F2] text-xl"></i>
              )}
              <span>{facebookLoading ? 'অপেক্ষা করুন...' : 'ফেসবুক দিয়ে সাইন-আপ'}</span>
            </button>
          </div>

          <div className="relative flex items-center py-4 mb-6" data-aos="fade-up" data-aos-delay="220">
            <div className="flex-grow border-t border-gray-200 dark:border-white/10 transition-colors"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 dark:text-gray-500 text-[10px] sm:text-xs font-bold tracking-widest uppercase bg-transparent px-2 transition-colors">অথবা ম্যানুয়ালি লিখুন</span>
            <div className="flex-grow border-t border-gray-200 dark:border-white/10 transition-colors"></div>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-aos="fade-up" data-aos-delay="250">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">আপনার নাম *</label>
                <input type="text" id="fullName" required value={formData.fullName} onChange={handleChange} placeholder="Full Name" className="w-full text-sm rounded-xl block p-3.5 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">স্টুডেন্ট আইডি *</label>
                <input type="text" id="studentId" required value={formData.studentId} onChange={handleChange} placeholder="e.g. 2101001" className="w-full text-sm rounded-xl block p-3.5 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-aos="fade-up" data-aos-delay="270">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">ইমেইল অ্যাড্রেস *</label>
                <input type="email" id="email" required value={formData.email} onChange={handleChange} placeholder="example@cuet.ac.bd" className="w-full text-sm rounded-xl block p-3.5 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">নিজের ফোন নম্বর *</label>
                <input type="tel" id="phone" required value={formData.phone} onChange={handleChange} placeholder="01XXXXXXXXX" className="w-full text-sm rounded-xl block p-3.5 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors" />
              </div>
            </div>

            {/* ✅ Department: Text input → Dropdown with 12 CUET dept codes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-aos="fade-up" data-aos-delay="290">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">ডিপার্টমেন্ট *</label>
                <select id="department" required value={formData.department} onChange={handleChange} className="w-full text-sm rounded-xl block p-3.5 appearance-none cursor-pointer bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors">
                  <option value="" disabled>নির্বাচন করুন</option>
                  {departmentCodes.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">ব্যাচ (সাল) *</label>
                <select id="batch" required value={formData.batch} onChange={handleChange} className="w-full text-sm rounded-xl block p-3.5 appearance-none cursor-pointer bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors">
                  <option value="" disabled>নির্বাচন করুন</option>
                  {years.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-aos="fade-up" data-aos-delay="310">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">জেন্ডার *</label>
                <select id="gender" required value={formData.gender} onChange={handleChange} className="w-full text-sm rounded-xl block p-3.5 appearance-none cursor-pointer bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors">
                  <option value="" disabled>নির্বাচন করুন</option>
                  <option value="Male">পুরুষ (Male)</option>
                  <option value="Female">নারী (Female)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">রক্তের গ্রুপ *</label>
                <select id="bloodGroup" required value={formData.bloodGroup} onChange={handleChange} className="w-full text-sm rounded-xl block p-3.5 appearance-none cursor-pointer bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors">
                  <option value="" disabled>নির্বাচন করুন</option>
                  <option value="A+">A+</option><option value="A-">A-</option>
                  <option value="B+">B+</option><option value="B-">B-</option>
                  <option value="O+">O+</option><option value="O-">O-</option>
                  <option value="AB+">AB+</option><option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-aos="fade-up" data-aos-delay="330">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">আবাসিক হল *</label>
                <select
                  id="hall"
                  required
                  value={formData.hall}
                  onChange={handleChange}
                  disabled={!formData.gender}
                  className={`w-full text-sm rounded-xl block p-3.5 appearance-none cursor-pointer bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors ${!formData.gender ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="" disabled>{formData.gender ? "নির্বাচন করুন" : "প্রথমে জেন্ডার নির্বাচন করুন"}</option>
                  {formData.gender === 'Male' && maleHalls.map(h => <option key={h} value={h}>{h}</option>)}
                  {formData.gender === 'Female' && femaleHalls.map(h => <option key={h} value={h}>{h}</option>)}
                  <option value="Attached/Non-residential">অ্যাটাচড/অনাবাসিক</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">টি-শার্ট সাইজ *</label>
                <select id="tshirtSize" required value={formData.tshirtSize} onChange={handleChange} className="w-full text-sm rounded-xl block p-3.5 appearance-none cursor-pointer bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors">
                  <option value="" disabled>নির্বাচন করুন</option>
                  <option value="S">S (Small)</option><option value="M">M (Medium)</option>
                  <option value="L">L (Large)</option><option value="XL">XL (Extra Large)</option>
                  <option value="XXL">XXL (Double XL)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-aos="fade-up" data-aos-delay="350">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">জরুরি কন্টাক্ট নম্বর *</label>
                <input type="tel" id="emergencyContact" required value={formData.emergencyContact} onChange={handleChange} placeholder="01XXXXXXXXX" className="w-full text-sm rounded-xl block p-3.5 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">সম্পর্ক (যেমন: বাবা/ভাই) *</label>
                <input type="text" id="emergencyRelation" required value={formData.emergencyRelation} onChange={handleChange} placeholder="e.g. Father, Brother" className="w-full text-sm rounded-xl block p-3.5 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-aos="fade-up" data-aos-delay="370">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">সাঁতার জানেন? *</label>
                <select id="swimmingSkill" required value={formData.swimmingSkill} onChange={handleChange} className="w-full text-sm rounded-xl block p-3.5 appearance-none cursor-pointer bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors">
                  <option value="" disabled>নির্বাচন করুন</option>
                  <option value="Yes">হ্যাঁ</option>
                  <option value="No">না</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">নিজের সাইকেল আছে? *</label>
                <select id="hasBicycle" required value={formData.hasBicycle} onChange={handleChange} className="w-full text-sm rounded-xl block p-3.5 appearance-none cursor-pointer bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors">
                  <option value="" disabled>নির্বাচন করুন</option>
                  <option value="Yes">হ্যাঁ</option>
                  <option value="No">না</option>
                </select>
              </div>
            </div>

            <div data-aos="fade-up" data-aos-delay="390">
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">অ্যাডভেঞ্চার অভিজ্ঞতা *</label>
              <select id="experienceLevel" required value={formData.experienceLevel} onChange={handleChange} className="w-full text-sm rounded-xl block p-3.5 appearance-none cursor-pointer bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors">
                <option value="" disabled>নির্বাচন করুন</option>
                <option value="Beginner">বিগিনার (Beginner)</option>
                <option value="Intermediate">ইন্টারমিডিয়েট (Intermediate)</option>
                <option value="Pro">প্রো (Pro Trekker)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" data-aos="fade-up" data-aos-delay="410">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">ফেসবুক প্রোফাইল লিংক (ঐচ্ছিক)</label>
                <input type="text" id="fbLink" value={formData.fbLink} onChange={handleChange} placeholder="e.g. facebook.com/username" className="w-full text-sm rounded-xl block p-3.5 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">ইন্সটাগ্রাম লিংক (ঐচ্ছিক)</label>
                <input type="text" id="instaLink" value={formData.instaLink} onChange={handleChange} placeholder="e.g. instagram.com/username" className="w-full text-sm rounded-xl block p-3.5 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4" data-aos="fade-up" data-aos-delay="430">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">পাসওয়ার্ড *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full text-sm rounded-xl block p-3.5 pr-12 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-600 dark:hover:text-[#e76f51] transition-colors focus:outline-none"
                  >
                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider transition-colors">পুনরায় পাসওয়ার্ড দিন *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full text-sm rounded-xl block p-3.5 pr-12 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-[#f3f4f6] focus:border-yellow-500 dark:focus:border-[#e76f51] outline-none shadow-sm dark:shadow-none dark:glass-input transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-600 dark:hover:text-[#e76f51] transition-colors focus:outline-none"
                  >
                    <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6" data-aos="zoom-in" data-aos-delay="450">
              <button type="submit" disabled={loading} className="w-full bg-yellow-500 hover:bg-yellow-600 dark:bg-[#e76f51] dark:hover:bg-orange-600 text-gray-900 dark:text-white font-black text-lg py-4 px-4 rounded-xl transition-colors shadow-md dark:shadow-[0_4px_16px_rgba(231,111,81,0.28)] flex justify-center items-center gap-2 disabled:opacity-70">
                {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-compass"></i>}
                <span>{loading ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'অ্যাডভেঞ্চার অ্যাকাউন্ট তৈরি করুন'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
