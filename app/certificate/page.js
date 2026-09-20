'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import html2canvas from 'html2canvas'

export default function CertificateGeneratorPage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeCert, setActiveCert] = useState(null)

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

  // 🔴 Expanded Hardcore Standards (Iron & Diamond Levels)
  const getProgress = () => {
    if (!profile) return []

    const p = profile
    
    // Trekking
    const trekIronUnlocked = (p.total_treks >= 5) || (p.total_distance >= 50)
    const trekIronProg = Math.max(Math.min((p.total_treks || 0) / 5, 1), Math.min((p.total_distance || 0) / 50, 1)) * 100
    const trekDiamondUnlocked = (p.total_treks >= 15) || (p.total_distance >= 150)
    const trekDiamondProg = Math.max(Math.min((p.total_treks || 0) / 15, 1), Math.min((p.total_distance || 0) / 150, 1)) * 100

    // Cycling
    const cycleIronUnlocked = (p.total_rides >= 10) || (p.cycling_distance >= 250)
    const cycleIronProg = Math.max(Math.min((p.total_rides || 0) / 10, 1), Math.min((p.cycling_distance || 0) / 250, 1)) * 100
    const cycleDiamondUnlocked = (p.total_rides >= 30) || (p.cycling_distance >= 1000)
    const cycleDiamondProg = Math.max(Math.min((p.total_rides || 0) / 30, 1), Math.min((p.cycling_distance || 0) / 1000, 1)) * 100

    // Running
    const runIronUnlocked = (p.total_runs >= 10) || (p.running_distance >= 50)
    const runIronProg = Math.max(Math.min((p.total_runs || 0) / 10, 1), Math.min((p.running_distance || 0) / 50, 1)) * 100
    const runDiamondUnlocked = (p.total_runs >= 30) || (p.running_distance >= 200)
    const runDiamondProg = Math.max(Math.min((p.total_runs || 0) / 30, 1), Math.min((p.running_distance || 0) / 200, 1)) * 100

    // Swimming
    const swimIronUnlocked = (p.total_swims >= 10) || (p.swimming_distance >= 5000)
    const swimIronProg = Math.max(Math.min((p.total_swims || 0) / 10, 1), Math.min((p.swimming_distance || 0) / 5000, 1)) * 100
    const swimDiamondUnlocked = (p.total_swims >= 30) || (p.swimming_distance >= 15000)
    const swimDiamondProg = Math.max(Math.min((p.total_swims || 0) / 30, 1), Math.min((p.swimming_distance || 0) / 15000, 1)) * 100

    // All-Rounder
    const allIronUnlocked = (p.total_events >= 10) && (p.survival_iq >= 1000)
    const allIronProg = ((Math.min((p.total_events || 0) / 10, 1) + Math.min((p.survival_iq || 0) / 1000, 1)) / 2) * 100
    const allDiamondUnlocked = (p.total_events >= 25) && (p.survival_iq >= 3000)
    const allDiamondProg = ((Math.min((p.total_events || 0) / 25, 1) + Math.min((p.survival_iq || 0) / 3000, 1)) / 2) * 100

    return [
      { 
        id: 'trekking', title: 'Trekking Expeditions', icon: 'fa-person-hiking', 
        current: `${p.total_treks || 0} Treks / ${p.total_distance || 0} KM`,
        iron: { name: 'Iron Explorer - Trekking', progress: trekIronProg, unlocked: trekIronUnlocked, target: '5 Treks or 50 KM', achievementStr: `completing an accumulated walking distance of ${p.total_distance || 0} KM across ${p.total_treks || 0} trekking expeditions` },
        diamond: { name: 'Diamond Master - Trekking', progress: trekDiamondProg, unlocked: trekDiamondUnlocked, target: '15 Treks or 150 KM', achievementStr: `mastering the trails with a massive walking distance of ${p.total_distance || 0} KM across ${p.total_treks || 0} extreme trekking expeditions` }
      },
      { 
        id: 'cycling', title: 'Cycling Adventures', icon: 'fa-bicycle', 
        current: `${p.total_rides || 0} Rides / ${p.cycling_distance || 0} KM`,
        iron: { name: 'Iron Explorer - Cycling', progress: cycleIronProg, unlocked: cycleIronUnlocked, target: '10 Rides or 250 KM', achievementStr: `completing a total riding distance of ${p.cycling_distance || 0} KM across ${p.total_rides || 0} cycling adventures` },
        diamond: { name: 'Diamond Master - Cycling', progress: cycleDiamondProg, unlocked: cycleDiamondUnlocked, target: '30 Rides or 1000 KM', achievementStr: `achieving a phenomenal riding record of ${p.cycling_distance || 0} KM across ${p.total_rides || 0} epic cycling adventures` }
      },
      { 
        id: 'running', title: 'Endurance Running', icon: 'fa-person-running', 
        current: `${p.total_runs || 0} Runs / ${p.running_distance || 0} KM`,
        iron: { name: 'Iron Explorer - Running', progress: runIronProg, unlocked: runIronUnlocked, target: '10 Runs or 50 KM', achievementStr: `demonstrating stamina by covering ${p.running_distance || 0} KM across ${p.total_runs || 0} endurance runs` },
        diamond: { name: 'Diamond Master - Running', progress: runDiamondProg, unlocked: runDiamondUnlocked, target: '30 Runs or 200 KM', achievementStr: `pushing human limits by conquering ${p.running_distance || 0} KM across ${p.total_runs || 0} grueling endurance runs` }
      },
      { 
        id: 'swimming', title: 'Aquatic Swimming', icon: 'fa-person-swimming', 
        current: `${p.total_swims || 0} Swims / ${p.swimming_distance || 0} M`,
        iron: { name: 'Iron Explorer - Swimming', progress: swimIronProg, unlocked: swimIronUnlocked, target: '10 Sessions or 5000 M', achievementStr: `completing an impressive swimming distance of ${p.swimming_distance || 0} Meters across ${p.total_swims || 0} sessions` },
        diamond: { name: 'Diamond Master - Swimming', progress: swimDiamondProg, unlocked: swimDiamondUnlocked, target: '30 Sessions or 15000 M', achievementStr: `mastering the waters with a breathtaking swimming distance of ${p.swimming_distance || 0} Meters across ${p.total_swims || 0} sessions` }
      },
      { 
        id: 'allrounder', title: 'Overall Adventurer', icon: 'fa-gem', 
        current: `${p.total_events || 0} Events / ${p.survival_iq || 0} IQ`,
        iron: { name: 'Active Explorer - Overall', progress: allIronProg, unlocked: allIronUnlocked, target: '10 Events AND 1000 IQ', achievementStr: `successfully participating in ${p.total_events || 0} diverse events and earning an outstanding ${p.survival_iq || 0} Survival IQ points` },
        diamond: { name: 'Diamond Master - Overall', progress: allDiamondProg, unlocked: allDiamondUnlocked, target: '25 Events AND 3000 IQ', achievementStr: `devoting unparalleled dedication by completing ${p.total_events || 0} events and accumulating an incredible ${p.survival_iq || 0} Survival IQ points` }
      }
    ]
  }

  const handleGenerateCertificate = async (certLevelData, categoryIcon) => {
    setActiveCert({ ...certLevelData, icon: categoryIcon })
    setGenerating(true)

    setTimeout(async () => {
      const element = document.getElementById('cas-certificate-template')
      if (element) {
        try {
          element.style.display = 'flex'
          
          const canvas = await html2canvas(element, {
            backgroundColor: '#fbf8f1',
            scale: 2, 
            useCORS: true,
            logging: false
          })

          const dataUrl = canvas.toDataURL('image/jpeg', 1.0)
          const link = document.createElement('a')
          link.href = dataUrl
          link.download = `CAS-${certLevelData.name.replace(/\s+/g, '-')}-Certificate.jpg`
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

        {/* Dashboard Grid (Grouped by Category) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {progressData.map((cat, idx) => (
            <div key={idx} className="bg-[#0a1c13] border border-white/10 rounded-3xl p-6 relative overflow-hidden">
              <i className={`fa-solid ${cat.icon} absolute -right-6 -bottom-6 text-9xl opacity-[0.03]`}></i>
              
              <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-xl text-gray-300">
                  <i className={`fa-solid ${cat.icon}`}></i>
                </div>
                <div>
                  <h3 className="font-black text-xl text-white">{cat.title}</h3>
                  <p className="text-xs text-yellow-500 font-bold uppercase tracking-widest">{cat.current}</p>
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                {/* Iron Level */}
                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className={`text-sm font-bold ${cat.iron.unlocked ? 'text-amber-500' : 'text-gray-400'}`}><i className="fa-solid fa-medal"></i> Iron Explorer</h4>
                    <span className="text-[10px] text-gray-500 font-mono">Target: {cat.iron.target}</span>
                  </div>
                  {cat.iron.unlocked ? (
                    <button onClick={() => handleGenerateCertificate(cat.iron, cat.icon)} disabled={generating} className="w-full mt-2 bg-amber-500/10 hover:bg-amber-500 border border-amber-500/30 hover:border-amber-400 text-amber-500 hover:text-[#0a1c13] py-2.5 rounded-lg font-bold transition-all flex justify-center items-center gap-2 text-sm">
                      {(generating && activeCert?.name === cat.iron.name) ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Generating...</> : <><i className="fa-solid fa-download"></i> Claim Certificate</>}
                    </button>
                  ) : (
                    <div>
                      <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden mt-3">
                        <div className="bg-gray-500 h-full rounded-full" style={{ width: `${cat.iron.progress}%` }}></div>
                      </div>
                      <p className="text-[10px] text-right mt-1 text-gray-500">{Math.floor(cat.iron.progress)}%</p>
                    </div>
                  )}
                </div>

                {/* Diamond Level */}
                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className={`text-sm font-bold ${cat.diamond.unlocked ? 'text-cyan-400' : 'text-gray-400'}`}><i className="fa-regular fa-gem"></i> Diamond Master</h4>
                    <span className="text-[10px] text-gray-500 font-mono">Target: {cat.diamond.target}</span>
                  </div>
                  {cat.diamond.unlocked ? (
                    <button onClick={() => handleGenerateCertificate(cat.diamond, cat.icon)} disabled={generating} className="w-full mt-2 bg-cyan-500/10 hover:bg-cyan-400 border border-cyan-500/30 hover:border-cyan-300 text-cyan-400 hover:text-[#0a1c13] py-2.5 rounded-lg font-bold transition-all flex justify-center items-center gap-2 text-sm shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                      {(generating && activeCert?.name === cat.diamond.name) ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Generating...</> : <><i className="fa-solid fa-download"></i> Claim Certificate</>}
                    </button>
                  ) : (
                    <div>
                      <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden mt-3">
                        <div className="bg-gray-600 h-full rounded-full" style={{ width: `${cat.diamond.progress}%` }}></div>
                      </div>
                      <p className="text-[10px] text-right mt-1 text-gray-500">{Math.floor(cat.diamond.progress)}%</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>

      {/* 🔴 Hidden Vintage Certificate Template (FIXED LAYOUT) */}
      <div className="fixed top-[-9999px] left-[-9999px] pointer-events-none">
        {activeCert && (
          <div id="cas-certificate-template" className="cert-bg w-[1123px] h-[794px] relative flex items-center justify-center p-12 text-[#1a1a1a]" style={{ display: 'none' }}>
            
            <div className="w-full h-full border-[3px] border-[#c5a059] p-2 relative">
              <div className="w-full h-full border-[8px] border-double border-[#c5a059] p-10 flex flex-col items-center text-center relative overflow-hidden">
                
                <i className="fa-solid fa-mountain-sun absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[350px] text-[#c5a059] opacity-[0.04]"></i>

                <div className="flex-grow flex flex-col items-center justify-center relative z-10 w-full">
                  <p className="text-[#c5a059] font-black tracking-[0.4em] uppercase text-sm mb-8 mt-4">
                    Cuet Adventure Society (CAS)
                  </p>

                  <h1 className="font-playfair font-black text-[64px] text-[#2c3e50] mb-6">
                    Certificate of Achievement
                  </h1>

                  <p className="font-playfair text-2xl text-gray-600 italic mb-8">
                    This is proudly presented to
                  </p>

                  <h2 className="font-vibes text-[80px] leading-none text-[#1a1a1a] mb-8 border-b-[3px] border-[#c5a059]/40 px-16 pb-4">
                    {profile?.full_name || 'Valiant Explorer'}
                  </h2>

                  <p className="font-playfair text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed mb-8 px-4">
                    For demonstrating outstanding resilience, unyielding endurance, and conquering the hardcore standards of the society by {activeCert.achievementStr} to earn the prestigious title of
                  </p>

                  <h3 className="text-3xl text-[#c5a059] font-black tracking-[0.2em] uppercase mb-10">
                    {activeCert.name}
                  </h3>

                  <div className="flex items-center justify-center gap-4 mb-8">
                    <div className="h-[2px] w-12 bg-[#c5a059]"></div>
                    <p className="text-sm font-bold tracking-widest text-gray-500 uppercase">{new Date().toLocaleDateString('en-GB')}</p>
                    <div className="h-[2px] w-12 bg-[#c5a059]"></div>
                  </div>
                </div>

                {/* 🔴 Fixed Signature Area: Placed perfectly at the bottom without cutting off */}
                <div className="w-full flex justify-between items-end px-12 pb-6 relative z-10 mt-auto">
                  
                  <div className="flex flex-col items-center w-64">
                    <div className="h-16 flex flex-col justify-end">
                      <span className="font-vibes text-4xl text-gray-800 opacity-80 -mb-2">Signature</span>
                    </div>
                    <div className="w-full border-t-[1.5px] border-gray-400 mt-2 pt-2">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-600">Founder Team Leader</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center relative pb-2">
                    <div className="w-24 h-24 rounded-full border-4 border-[#c5a059] flex items-center justify-center bg-[#f4ebd8] shadow-md text-[#c5a059] relative z-20">
                      <i className={`fa-solid ${activeCert.icon} text-4xl`}></i>
                    </div>
                  </div>

                  <div className="flex flex-col items-center w-64">
                    <div className="h-16 flex flex-col justify-end">
                      <span className="font-vibes text-4xl text-gray-800 opacity-80 -mb-2">Signature</span>
                    </div>
                    <div className="w-full border-t-[1.5px] border-gray-400 mt-2 pt-2">
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
