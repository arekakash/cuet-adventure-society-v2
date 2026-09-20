'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import html2canvas from 'html2canvas'

export default function CertificateGeneratorPage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeCert, setActiveCert] = useState(null) // কোন সার্টিফিকেট জেনারেট হচ্ছে তার ডেটা

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  // 🔴 Hardcore Standards Calculation Logic
  const getProgress = () => {
    if (!profile) return []

    const p = profile
    
    // 1. Trekking: 5 Treks OR 50 KM
    const trekProg1 = Math.min((p.total_treks || 0) / 5, 1) * 100
    const trekProg2 = Math.min((p.total_distance || 0) / 50, 1) * 100
    const trekProg = Math.max(trekProg1, trekProg2)
    const trekUnlocked = (p.total_treks >= 5) || (p.total_distance >= 50)

    // 2. Cycling: 10 Rides OR 250 KM
    const cycleProg1 = Math.min((p.total_rides || 0) / 10, 1) * 100
    const cycleProg2 = Math.min((p.cycling_distance || 0) / 250, 1) * 100
    const cycleProg = Math.max(cycleProg1, cycleProg2)
    const cycleUnlocked = (p.total_rides >= 10) || (p.cycling_distance >= 250)

    // 3. Running: 10 Runs OR 50 KM
    const runProg1 = Math.min((p.total_runs || 0) / 10, 1) * 100
    const runProg2 = Math.min((p.running_distance || 0) / 50, 1) * 100
    const runProg = Math.max(runProg1, runProg2)
    const runUnlocked = (p.total_runs >= 10) || (p.running_distance >= 50)

    // 4. Swimming: 10 Sessions OR 5000 M
    const swimProg1 = Math.min((p.total_swims || 0) / 10, 1) * 100
    const swimProg2 = Math.min((p.swimming_distance || 0) / 5000, 1) * 100
    const swimProg = Math.max(swimProg1, swimProg2)
    const swimUnlocked = (p.total_swims >= 10) || (p.swimming_distance >= 5000)

    // 5. All-Rounder: 10 Events AND 1000 Survival IQ
    const allProg1 = Math.min((p.total_events || 0) / 10, 1) * 100
    const allProg2 = Math.min((p.survival_iq || 0) / 1000, 1) * 100
    const allProg = (allProg1 + allProg2) / 2 // Average for 'AND' logic display
    const allUnlocked = (p.total_events >= 10) && (p.survival_iq >= 1000)

    return [
      { id: 'trekking', title: 'Iron Explorer - Trekking', icon: 'fa-person-hiking', progress: trekProg, unlocked: trekUnlocked, desc: 'Complete 5 Treks or 50 KM walking distance.', current: `${p.total_treks || 0} Treks / ${p.total_distance || 0} KM` },
      { id: 'cycling', title: 'Iron Explorer - Cycling', icon: 'fa-bicycle', progress: cycleProg, unlocked: cycleUnlocked, desc: 'Complete 10 Rides or 250 KM cycling distance.', current: `${p.total_rides || 0} Rides / ${p.cycling_distance || 0} KM` },
      { id: 'running', title: 'Iron Explorer - Running', icon: 'fa-person-running', progress: runProg, unlocked: runUnlocked, desc: 'Complete 10 Runs or 50 KM running distance.', current: `${p.total_runs || 0} Runs / ${p.running_distance || 0} KM` },
      { id: 'swimming', title: 'Iron Explorer - Swimming', icon: 'fa-person-swimming', progress: swimProg, unlocked: swimUnlocked, desc: 'Complete 10 Sessions or 5000 M swimming.', current: `${p.total_swims || 0} Swims / ${p.swimming_distance || 0} M` },
      { id: 'allrounder', title: 'Diamond Master - Overall', icon: 'fa-gem', progress: allProg, unlocked: allUnlocked, desc: 'Complete 10 Events AND earn 1000 Survival IQ.', current: `${p.total_events || 0} Events / ${p.survival_iq || 0} IQ` }
    ]
  }

  const handleGenerateCertificate = async (category) => {
    setActiveCert(category)
    setGenerating(true)

    // একটু অপেক্ষা (DOM এ হিডেন সার্টিফিকেট রেন্ডার হওয়ার জন্য)
    setTimeout(async () => {
      const element = document.getElementById('cas-certificate-template')
      if (element) {
        try {
          // রেন্ডারের জন্য দৃশ্যমান করা হচ্ছে (স্ক্রিনের বাইরে)
          element.style.display = 'flex'
          
          const canvas = await html2canvas(element, {
            backgroundColor: '#fbf8f1',
            scale: 2, // High Quality HD
            useCORS: true,
            logging: false
          })

          const dataUrl = canvas.toDataURL('image/jpeg', 1.0)
          const link = document.createElement('a')
          link.href = dataUrl
          link.download = `CAS-${category.title.replace(/\s+/g, '-')}-Certificate.jpg`
          link.click()

        } catch (error) {
          console.error("Certificate Generation Error:", error)
          alert("সার্টিফিকেট জেনারেট করতে সমস্যা হয়েছে!")
        } finally {
          element.style.display = 'none'
          setGenerating(false)
          setActiveCert(null)
        }
      }
    }, 500)
  }

  if (loading) {
    return <div className="min-h-screen bg-[#050b08] flex items-center justify-center"><i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#e76f51]"></i></div>
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#050b08] flex flex-col items-center justify-center text-white px-4 text-center">
        <i className="fa-solid fa-lock text-5xl text-gray-600 mb-4"></i>
        <h2 className="text-2xl font-black mb-2">লগইন প্রয়োজন</h2>
        <p className="text-gray-400 mb-6">আপনার সার্টিফিকেট এবং প্রোগ্রেস দেখতে লগইন করুন।</p>
        <Link href="/login" className="bg-[#e76f51] px-6 py-3 rounded-xl font-bold">লগইন করুন</Link>
      </div>
    )
  }

  const progressData = getProgress()

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-20 px-4 sm:px-6 relative text-gray-300">
      
      {/* Google Fonts for the Certificate */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&display=swap');
        .font-playfair { font-family: 'Playfair Display', serif; }
        .font-vibes { font-family: 'Great Vibes', cursive; }
        .cert-bg { background-color: #f4ebd8; background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E"); }
      `}} />

      <div className="max-w-6xl mx-auto">
        
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">অফিসিয়াল <span className="text-yellow-500">সার্টিফিকেট</span></h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base">CUET Adventure Society-এর এক্সট্রিম স্ট্যান্ডার্ড পূর্ণ করে নিজের সম্মানজনক ডিজিটাল সার্টিফিকেট ক্লেইম করুন।</p>
        </div>

        {/* Progress Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {progressData.map((cat, idx) => (
            <div key={idx} className={`bg-[#0a1c13] border rounded-3xl p-6 transition-all duration-500 relative overflow-hidden ${cat.unlocked ? 'border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.15)]' : 'border-white/10'}`}>
              
              {/* Background Icon Watermark */}
              <i className={`fa-solid ${cat.icon} absolute -right-6 -bottom-6 text-9xl opacity-5`}></i>

              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${cat.unlocked ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-[#0a1c13]' : 'bg-white/5 text-gray-500'}`}>
                  <i className={`fa-solid ${cat.icon}`}></i>
                </div>
                <div>
                  <h3 className={`font-black text-lg ${cat.unlocked ? 'text-yellow-500' : 'text-white'}`}>{cat.title}</h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">{cat.current}</p>
                </div>
              </div>

              <p className="text-xs text-gray-400 mb-6 relative z-10 h-8">{cat.desc}</p>

              {cat.unlocked ? (
                <button 
                  onClick={() => handleGenerateCertificate(cat)}
                  disabled={generating}
                  className="w-full relative z-10 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 text-[#0a1c13] py-4 rounded-xl font-black tracking-widest uppercase shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:scale-[1.02] transition-transform flex justify-center items-center gap-2"
                >
                  {(generating && activeCert?.id === cat.id) ? (
                    <><i className="fa-solid fa-compass fa-spin"></i> জেনারেট হচ্ছে...</>
                  ) : (
                    <><i className="fa-solid fa-award text-lg"></i> Claim Certificate</>
                  )}
                </button>
              ) : (
                <div className="relative z-10">
                  <div className="flex justify-between text-[10px] font-bold mb-1 text-gray-500">
                    <span>Progress</span>
                    <span>{Math.floor(cat.progress)}%</span>
                  </div>
                  <div className="w-full bg-black/50 h-3 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="bg-gradient-to-r from-gray-600 to-gray-400 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${cat.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-center mt-3 text-red-400/80 font-bold"><i className="fa-solid fa-lock"></i> টার্গেট পূরণ হয়নি</p>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* 🔴 Hidden Vintage Certificate Template (Zero Storage Rendering Engine) */}
      <div className="fixed top-[-9999px] left-[-9999px] pointer-events-none">
        {activeCert && (
          <div id="cas-certificate-template" className="cert-bg w-[1123px] h-[794px] relative flex items-center justify-center p-12 text-[#1a1a1a]" style={{ display: 'none' }}>
            
            {/* Outer Golden Frame */}
            <div className="w-full h-full border-[3px] border-[#c5a059] p-2 relative">
              {/* Inner Double Golden Frame */}
              <div className="w-full h-full border-[8px] border-double border-[#c5a059] p-10 flex flex-col items-center text-center relative overflow-hidden">
                
                {/* Subtle Background CAS Logo Watermark */}
                <i className="fa-solid fa-mountain-sun absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[300px] text-[#c5a059] opacity-[0.05]"></i>

                {/* Top Headers */}
                <p className="text-[#c5a059] font-black tracking-[0.4em] uppercase text-sm mb-6 mt-2 relative z-10">
                  Cuet Adventure Society (CAS)
                </p>

                <h1 className="font-playfair font-black text-6xl text-[#2c3e50] mb-8 relative z-10">
                  Certificate of Achievement
                </h1>

                <p className="font-playfair text-xl text-gray-600 italic mb-8 relative z-10">
                  This is proudly presented to
                </p>

                {/* Participant Name (Royal Cursive) */}
                <h2 className="font-vibes text-7xl text-[#1a1a1a] mb-6 relative z-10 border-b-[3px] border-[#c5a059]/40 px-16 pb-4">
                  {profile?.full_name || 'Valiant Explorer'}
                </h2>

                {/* Achievement Description */}
                <p className="font-playfair text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed relative z-10 mb-8">
                  For demonstrating outstanding resilience, unyielding endurance, and conquering the hardcore standards of the society to achieve the prestigious title of
                  <br />
                  <strong className="text-2xl text-[#c5a059] block mt-4 tracking-widest uppercase">{activeCert.title}</strong>
                </p>

                {/* Date & Seal */}
                <div className="flex items-center justify-center gap-4 mb-auto relative z-10">
                  <div className="h-[1px] w-16 bg-[#c5a059]"></div>
                  <p className="text-sm font-bold tracking-widest text-gray-500 uppercase">{new Date().toLocaleDateString('en-GB')}</p>
                  <div className="h-[1px] w-16 bg-[#c5a059]"></div>
                </div>

                {/* Three Signatures at the Bottom */}
                <div className="w-full grid grid-cols-3 gap-12 mt-16 px-8 relative z-10">
                  {/* Sig 1 */}
                  <div className="flex flex-col items-center">
                    <div className="w-48 h-12 flex flex-col justify-end">
                      {/* Fake Signature Script */}
                      <span className="font-vibes text-3xl text-gray-800 opacity-80 -mb-2">Signature</span>
                    </div>
                    <div className="w-full border-t border-gray-400 mt-2 pt-2">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-600">Founder Team Leader</p>
                    </div>
                  </div>
                  
                  {/* Sig 2 (Middle Badge & Sig) */}
                  <div className="flex flex-col items-center relative -top-6">
                    <div className="w-24 h-24 rounded-full border-4 border-[#c5a059] flex items-center justify-center bg-[#f4ebd8] shadow-lg mb-2 text-[#c5a059]">
                      <i className={`fa-solid ${activeCert.icon} text-4xl`}></i>
                    </div>
                    <div className="w-full border-t border-gray-400 pt-2 px-4">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-600">Founder Team Leader</p>
                    </div>
                  </div>

                  {/* Sig 3 */}
                  <div className="flex flex-col items-center">
                    <div className="w-48 h-12 flex flex-col justify-end">
                      {/* Fake Signature Script */}
                      <span className="font-vibes text-3xl text-gray-800 opacity-80 -mb-2">Signature</span>
                    </div>
                    <div className="w-full border-t border-gray-400 mt-2 pt-2">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-600">Founder Team Leader</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
