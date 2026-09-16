'use client'

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase" 
import Link from "next/link"

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  
  // অ্যাক্টিভ ট্যাব ট্র্যাক করা
  const [activeTab, setActiveTab] = useState("survival_iq") 
  
  // ড্রপডাউন স্টেট
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // ড্রপডাউনের বাইরে ক্লিক করলে সেটি বন্ধ করার লজিক
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // ট্যাব পরিবর্তন হলে ডেটা নতুন করে ফেচ হবে
  useEffect(() => {
    fetchLeaderboard()
  }, [activeTab]) 

  const fetchLeaderboard = async () => {
    setLoading(true)
    
    // ক্যাটাগরি অনুযায়ী সর্টিং কলাম নির্ধারণ
    let orderByColumn = 'survival_iq'
    if (activeTab === 'total_events') orderByColumn = 'total_events'
    if (activeTab === 'trekking') orderByColumn = 'total_distance'
    if (activeTab === 'cycling') orderByColumn = 'cycling_distance'
    if (activeTab === 'swimming') orderByColumn = 'swimming_distance'

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, photo_url, survival_iq, total_events, total_treks, total_distance, total_rides, cycling_distance, total_swims, swimming_distance, role')
      .gt(orderByColumn, 0) // যাদের স্কোর ০ এর বেশি, শুধু তাদেরকেই লিডারবোর্ডে দেখাবে
      .order(orderByColumn, { ascending: false, nullsFirst: false })
      .limit(50)

    if (data) {
      setLeaders(data)
    }
    setLoading(false)
  }

  const getRankStyle = (index) => {
    if (index === 0) return { color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/50", shadow: "shadow-[0_0_20px_rgba(250,204,21,0.3)]", icon: "fa-trophy", label: "Champion" }
    if (index === 1) return { color: "text-gray-300", bg: "bg-gray-300/10", border: "border-gray-300/50", shadow: "shadow-[0_0_15px_rgba(209,213,219,0.2)]", icon: "fa-medal", label: "Runner Up" }
    if (index === 2) return { color: "text-amber-600", bg: "bg-amber-600/10", border: "border-amber-600/50", shadow: "shadow-[0_0_15px_rgba(217,119,6,0.2)]", icon: "fa-award", label: "Third Place" }
    return { color: "text-[#34d399]", bg: "bg-white/5", border: "border-white/10", shadow: "", icon: "fa-star", label: "Explorer" }
  }

  // ডায়নামিক ডেটা দেখানোর ফাংশন
  const getDisplayValue = (user) => {
    if (activeTab === "survival_iq") return { 
        mainValue: user.survival_iq || 0, 
        mainLabel: "IQ Points",
        subValue: null
    }
    if (activeTab === "total_events") return { 
        mainValue: user.total_events || 0, 
        mainLabel: "Events Done",
        subValue: null
    }
    if (activeTab === "trekking") return { 
        mainValue: user.total_distance || 0, 
        mainLabel: "KM Walked",
        subValue: user.total_treks || 0,
        subLabel: "Treks",
        unit: "km"
    }
    if (activeTab === "cycling") return { 
        mainValue: user.cycling_distance || 0, 
        mainLabel: "KM Ridden",
        subValue: user.total_rides || 0,
        subLabel: "Rides",
        unit: "km"
    }
    if (activeTab === "swimming") return { 
        mainValue: user.swimming_distance || 0, 
        mainLabel: "Meters Swam",
        subValue: user.total_swims || 0,
        subLabel: "Sessions",
        unit: "m"
    }
  }

  // অ্যাক্টিভ ট্যাব অনুযায়ী "Activities" বাটনের লেবেল ও স্টাইল চেঞ্জ হবে
  const isActivityActive = ["trekking", "cycling", "swimming"].includes(activeTab)
  
  const getActivityButtonLabel = () => {
    if (activeTab === "trekking") return "Trekking"
    if (activeTab === "cycling") return "Cycling"
    if (activeTab === "swimming") return "Swimming"
    return "Activities"
  }

  const getActivityButtonIcon = () => {
    if (activeTab === "trekking") return "fa-person-hiking"
    if (activeTab === "cycling") return "fa-bicycle"
    if (activeTab === "swimming") return "fa-person-swimming"
    return "fa-person-running"
  }

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-10 relative">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#e76f51]/10 rounded-full blur-3xl pointer-events-none"></div>
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 tracking-tight relative z-10 drop-shadow-lg">
            ক্যাম্পাস <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e76f51] to-yellow-500">লিডারবোর্ড</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-lg relative z-10 max-w-2xl mx-auto">
            আমাদের ক্লাবের সেরা এক্সপ্লোরারদের রিয়েল-টাইম র‍্যাংকিং। আপনার ক্যাটাগরি বেছে নিন এবং সেরাদের তালিকা দেখুন!
          </p>
        </div>

        {/* 🔴 Filter Tabs & Dropdown */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-10 relative z-10">
          
          <button 
            onClick={() => setActiveTab("survival_iq")}
            className={`px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 flex items-center gap-2 ${activeTab === "survival_iq" ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"}`}
          >
            <i className="fa-solid fa-brain"></i> Survival IQ
          </button>

          <button 
            onClick={() => setActiveTab("total_events")}
            className={`px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 flex items-center gap-2 ${activeTab === "total_events" ? "bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-105" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"}`}
          >
            <i className="fa-solid fa-tent"></i> Total Events
          </button>
          
          {/* Activities Dropdown Container */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 flex items-center gap-2 ${isActivityActive ? "bg-[#e76f51] text-white shadow-[0_0_15px_rgba(231,111,81,0.4)] scale-105" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"}`}
            >
              <i className={`fa-solid ${getActivityButtonIcon()}`}></i> 
              {getActivityButtonLabel()}
              <i className={`fa-solid fa-chevron-down text-[10px] ml-1 transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`}></i>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#0a1c13]/90 backdrop-blur-lg border border-white/10 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden z-50 origin-top-right animate-in fade-in zoom-in-95 duration-200">
                <div className="p-1">
                  <button 
                    onClick={() => { setActiveTab("trekking"); setIsDropdownOpen(false) }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center gap-3 ${activeTab === "trekking" ? "bg-[#e76f51] text-white" : "text-gray-300 hover:bg-white/10"}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${activeTab === "trekking" ? "bg-white/20" : "bg-[#e76f51]/20 text-[#e76f51]"}`}>
                      <i className="fa-solid fa-person-hiking text-xs"></i>
                    </div>
                    Trekking
                  </button>

                  <button 
                    onClick={() => { setActiveTab("cycling"); setIsDropdownOpen(false) }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center gap-3 ${activeTab === "cycling" ? "bg-blue-500 text-white" : "text-gray-300 hover:bg-white/10"}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${activeTab === "cycling" ? "bg-white/20" : "bg-blue-500/20 text-blue-400"}`}>
                      <i className="fa-solid fa-bicycle text-xs"></i>
                    </div>
                    Cycling
                  </button>

                  <button 
                    onClick={() => { setActiveTab("swimming"); setIsDropdownOpen(false) }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center gap-3 ${activeTab === "swimming" ? "bg-cyan-500 text-white" : "text-gray-300 hover:bg-white/10"}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${activeTab === "swimming" ? "bg-white/20" : "bg-cyan-500/20 text-cyan-400"}`}>
                      <i className="fa-solid fa-person-swimming text-xs"></i>
                    </div>
                    Swimming
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <i className="fa-solid fa-compass fa-spin text-4xl text-[#e76f51]"></i>
          </div>
        ) : (
          <div className="space-y-4 relative z-10">
            {leaders.map((user, index) => {
              const rank = getRankStyle(index)
              const avatar = user.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=0a1c13&color=fff`
              const displayData = getDisplayValue(user)

              return (
                <div 
                  key={user.id} 
                  className={`bg-[#0a1c13] flex items-center justify-between p-4 sm:p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${rank.bg} ${rank.border} ${rank.shadow}`}
                >
                  <div className="flex items-center gap-4 sm:gap-6">
                    {/* Rank Number */}
                    <div className="w-8 sm:w-12 text-center">
                      <span className={`text-2xl sm:text-3xl font-black ${rank.color}`}>
                        {index < 3 ? <i className={`fa-solid ${rank.icon}`}></i> : `#${index + 1}`}
                      </span>
                    </div>

                    {/* Profile Picture */}
                    <div className="relative">
                      <img src={avatar} alt={user.full_name} className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 ${rank.border}`} />
                      {index < 3 && (
                        <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs bg-[#050b08] border ${rank.border} ${rank.color}`}>
                          <i className={`fa-solid ${rank.icon}`}></i>
                        </div>
                      )}
                    </div>

                    {/* Name & Title */}
                    <div>
                      <Link href={`/profile/${user.id}`} className="text-lg sm:text-xl font-bold text-white hover:text-[#e76f51] transition-colors">
                        {user.full_name || 'Unknown Explorer'}
                      </Link>
                      
                      <div className="flex items-center gap-3 mt-1">
                        <p className={`text-[10px] sm:text-xs font-black tracking-widest uppercase ${rank.color}`}>
                          {rank.label}
                        </p>
                        
                        {/* সাব-স্ট্যাটস (যেমন: কতটা ট্রেক বা রাইড দিয়েছে) */}
                        {displayData.subValue !== null && (
                          <>
                            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                            <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                              <i className="fa-solid fa-bolt text-yellow-500"></i> {displayData.subValue} {displayData.subLabel}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Score Display */}
                  <div className="text-right shrink-0">
                    <p className="text-2xl sm:text-4xl font-black text-white">
                      {displayData.mainValue}
                      {displayData.unit && <span className="text-sm text-gray-500 ml-1">{displayData.unit}</span>}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">{displayData.mainLabel}</p>
                  </div>
                </div>
              )
            })}

            {leaders.length === 0 && (
              <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10">
                <i className="fa-solid fa-ghost text-5xl text-gray-600 mb-4 opacity-50"></i>
                <h3 className="text-xl font-bold text-gray-400">লিডারবোর্ড ফাঁকা!</h3>
                <p className="text-sm text-gray-500 mt-2">এই ক্যাটাগরিতে এখনো কেউ পয়েন্ট অর্জন করেনি। আপনিই প্রথম হতে পারেন!</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
