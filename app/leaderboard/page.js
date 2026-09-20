'use client'

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase" 
import Link from "next/link"

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  
  // অ্যাক্টিভ ট্যাব এবং ড্রপডাউন স্টেট
  const [activeTab, setActiveTab] = useState("survival_iq") 
  const [isActivityDropdownOpen, setIsActivityDropdownOpen] = useState(false)
  
  // ফিল্টার স্টেট এবং ড্রপডাউন Ref
  const [filterBatch, setFilterBatch] = useState("All")
  const [filterDept, setFilterDept] = useState("All")
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  
  // ড্রপডাউনের বাইরে ক্লিক করলে বন্ধ করার জন্য Ref
  const dropdownRef = useRef(null)
  const filterDropdownRef = useRef(null) 

  useEffect(() => {
    fetchLeaderboard()
  }, [activeTab, filterBatch, filterDept]) 

  // ড্রপডাউনের বাইরে ক্লিক হ্যান্ডলার
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsActivityDropdownOpen(false)
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchLeaderboard = async () => {
    setLoading(true)
    
    // ডায়নামিক সর্টিং কলাম নির্ধারণ (🔴 Added Running)
    let orderByColumn = 'survival_iq'
    if (activeTab === 'total_events') orderByColumn = 'total_events' 
    if (activeTab === 'trekking') orderByColumn = 'total_distance'
    if (activeTab === 'cycling') orderByColumn = 'cycling_distance'
    if (activeTab === 'swimming') orderByColumn = 'swimming_distance'
    if (activeTab === 'running') orderByColumn = 'running_distance'

    // সুপাবেজ কোয়েরি বিল্ডার (🔴 Added Running Fields)
    let query = supabase
      .from('profiles')
      .select('id, full_name, photo_url, survival_iq, total_events, total_treks, total_distance, total_rides, cycling_distance, total_swims, swimming_distance, total_runs, running_distance, role, student_id, batch')
      .order(orderByColumn, { ascending: false, nullsFirst: false })

    // ব্যাচ ফিল্টার লজিক
    if (filterBatch !== "All") {
      query = query.eq('batch', filterBatch)
    }

    // ডিপার্টমেন্ট ফিল্টার লজিক
    if (filterDept !== "All") {
      query = query.like('student_id', `__${filterDept}%`)
    }

    const { data, error } = await query.limit(50)

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

  const getDisplayValue = (user) => {
    if (activeTab === "survival_iq") return { 
        mainValue: user.survival_iq || 0, mainLabel: "IQ Points", subValue: null, unit: "Pts"
    }
    if (activeTab === "total_events") return { 
        mainValue: user.total_events || user.total_treks || 0, mainLabel: "Events Done", subValue: null, unit: ""
    }
    if (activeTab === "trekking") return { 
        mainValue: user.total_distance || 0, mainLabel: "KM Walked", subValue: user.total_treks || 0, subLabel: "Treks", unit: "km"
    }
    if (activeTab === "cycling") return { 
        mainValue: user.cycling_distance || 0, mainLabel: "KM Ridden", subValue: user.total_rides || 0, subLabel: "Rides", unit: "km"
    }
    if (activeTab === "swimming") return { 
        mainValue: user.swimming_distance || 0, mainLabel: "Meters Swam", subValue: user.total_swims || 0, subLabel: "Sessions", unit: "m"
    }
    // 🔴 Added Running Display Data
    if (activeTab === "running") return { 
        mainValue: user.running_distance || 0, mainLabel: "KM Run", subValue: user.total_runs || 0, subLabel: "Runs", unit: "km"
    }
    return { mainValue: 0, mainLabel: "Points", subValue: null, unit: "" }
  }

  // 🔴 Added Running to active check
  const isActivityActive = ["trekking", "cycling", "swimming", "running"].includes(activeTab)

  const handleActivitySelect = (activity) => {
    setActiveTab(activity)
    setIsActivityDropdownOpen(false) 
  }

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-10 relative">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#e76f51]/10 rounded-full blur-3xl pointer-events-none"></div>
          <h1 className="text-3xl sm:text-6xl font-black text-white mb-2 sm:mb-4 tracking-tight relative z-10 drop-shadow-lg">
            ক্যাম্পাস <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e76f51] to-yellow-500">লিডারবোর্ড</span>
          </h1>
          <p className="text-gray-400 text-xs sm:text-lg relative z-10 max-w-2xl mx-auto">
            আমাদের ক্লাবের সেরা এক্সপ্লোরারদের রিয়েল-টাইম র‍্যাংকিং। ক্যাটাগরি বেছে নিন এবং সেরাদের তালিকা দেখুন!
          </p>
        </div>
  {/* 🔴 Certificate Banner Section */}
        <div className="flex justify-center mb-10 relative z-20 px-4">
          <Link href="/certificate" className="w-full sm:w-auto bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 hover:from-yellow-500/20 hover:via-amber-500/20 hover:to-yellow-500/20 border border-yellow-500/30 hover:border-yellow-400 px-6 py-4 rounded-2xl flex items-center justify-center gap-4 transition-all duration-300 shadow-[0_0_20px_rgba(234,179,8,0.1)] hover:shadow-[0_0_25px_rgba(234,179,8,0.25)] hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 group-hover:scale-110 group-hover:bg-yellow-500 group-hover:text-[#0a1c13] transition-all duration-300 shrink-0">
              <i className="fa-solid fa-award text-2xl"></i>
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black tracking-widest uppercase text-yellow-500 mb-0.5">অফিসিয়াল রিকগনিশন</p>
              <p className="text-sm sm:text-base font-bold text-white flex items-center gap-2">আপনার অ্যাচিভমেন্ট ও সার্টিফিকেট দেখুন <i className="fa-solid fa-arrow-right opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all"></i></p>
            </div>
          </Link>
        </div>

        {/* Compact Filter Tabs (Mobile Friendly - One Line) */}
        <div className="flex justify-center items-center gap-1.5 sm:gap-4 mb-8 sm:mb-10 relative z-20 w-full overflow-visible">
          
          <button 
            onClick={() => { setActiveTab("survival_iq"); setIsActivityDropdownOpen(false); }}
            className={`px-3 sm:px-6 py-2 sm:py-3 rounded-full font-bold text-[10px] sm:text-sm transition-all duration-300 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeTab === "survival_iq" ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] sm:scale-105" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"}`}
          >
            <i className="fa-solid fa-brain"></i> <span className="hidden sm:inline">Survival</span> IQ
          </button>
          
          <button 
            onClick={() => { setActiveTab("total_events"); setIsActivityDropdownOpen(false); }}
            className={`px-3 sm:px-6 py-2 sm:py-3 rounded-full font-bold text-[10px] sm:text-sm transition-all duration-300 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeTab === "total_events" ? "bg-[#e76f51] text-white shadow-[0_0_15px_rgba(231,111,81,0.4)] sm:scale-105" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"}`}
          >
            <i className="fa-solid fa-tent"></i> <span className="hidden sm:inline">Total</span> Events
          </button>
          
          {/* Smooth Dropdown Menu */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => { setIsActivityDropdownOpen(!isActivityDropdownOpen); setIsFilterDropdownOpen(false); }}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-full font-bold text-[10px] sm:text-sm transition-all duration-300 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${isActivityActive ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] sm:scale-105" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"}`}
            >
              <i className="fa-solid fa-chart-line"></i> Activities <i className={`fa-solid fa-chevron-down text-[8px] sm:text-xs transition-transform ${isActivityDropdownOpen ? "rotate-180" : ""}`}></i>
            </button>

            {isActivityDropdownOpen && (
              <div className="absolute top-full right-0 sm:left-1/2 sm:transform sm:-translate-x-1/2 mt-2 sm:mt-3 w-40 sm:w-48 bg-[#0a1c13] border border-white/10 rounded-xl sm:rounded-2xl shadow-2xl z-50 overflow-hidden py-1 sm:py-2 animate-fade-in-up">
                <button 
                  onClick={() => handleActivitySelect("trekking")}
                  className={`w-full text-left px-4 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-sm font-bold flex items-center gap-2 sm:gap-3 transition-colors ${activeTab === "trekking" ? "bg-white/10 text-emerald-400" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}
                >
                  <i className="fa-solid fa-person-hiking w-4 sm:w-5 text-center"></i> Trekking
                </button>
                <button 
                  onClick={() => handleActivitySelect("cycling")}
                  className={`w-full text-left px-4 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-sm font-bold flex items-center gap-2 sm:gap-3 transition-colors ${activeTab === "cycling" ? "bg-white/10 text-blue-400" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}
                >
                  <i className="fa-solid fa-bicycle w-4 sm:w-5 text-center"></i> Cycling
                </button>
                <button 
                  onClick={() => handleActivitySelect("swimming")}
                  className={`w-full text-left px-4 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-sm font-bold flex items-center gap-2 sm:gap-3 transition-colors ${activeTab === "swimming" ? "bg-white/10 text-cyan-400" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}
                >
                  <i className="fa-solid fa-person-swimming w-4 sm:w-5 text-center"></i> Swimming
                </button>
                {/* 🔴 Added Running Menu Item */}
                <button 
                  onClick={() => handleActivitySelect("running")}
                  className={`w-full text-left px-4 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-sm font-bold flex items-center gap-2 sm:gap-3 transition-colors ${activeTab === "running" ? "bg-white/10 text-orange-400" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}
                >
                  <i className="fa-solid fa-person-running w-4 sm:w-5 text-center"></i> Running
                </button>
              </div>
            )}
          </div>

          {/* Filter Dropdown Button */}
          <div className="relative" ref={filterDropdownRef}>
            <button 
              onClick={() => { setIsFilterDropdownOpen(!isFilterDropdownOpen); setIsActivityDropdownOpen(false); }}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-full font-bold text-[10px] sm:text-sm transition-all duration-300 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${(filterBatch !== "All" || filterDept !== "All") ? "bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] sm:scale-105" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"}`}
            >
              <i className="fa-solid fa-filter"></i> <span className="hidden sm:inline">Filter</span>
            </button>

            {isFilterDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 sm:mt-3 w-64 bg-[#0a1c13] border border-white/10 rounded-xl sm:rounded-2xl shadow-2xl z-50 p-4 animate-fade-in-up">
                
                {/* ডিপার্টমেন্ট ফিল্টার */}
                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">ডিপার্টমেন্ট</label>
                  <div className="relative">
                    <select 
                      value={filterDept} 
                      onChange={(e) => setFilterDept(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-[#e76f51] transition-colors appearance-none"
                    >
                      <option value="All">সকল ডিপার্টমেন্ট</option>
                      <option value="01">Civil Engineering (CE)</option>
                      <option value="02">Electrical & Electronic (EEE)</option>
                      <option value="03">Mechanical Engineering (ME)</option>
                      <option value="04">Computer Science (CSE)</option>
                      <option value="05">Urban & Regional Planning (URP)</option>
                      <option value="06">Architecture (ARCH)</option>
                      <option value="07">Petroleum & Mining (PME)</option>
                      <option value="08">Electronics & Telecomm (ETE)</option>
                      <option value="09">Mechatronics & Industrial (MIE)</option>
                      <option value="10">Water Resources (WRE)</option>
                      <option value="11">Biomedical Engineering (BME)</option>
                      <option value="12">Materials & Metallurgical (MME)</option>
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-[10px] pointer-events-none"></i>
                  </div>
                </div>

                {/* ব্যাচ ফিল্টার */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">ব্যাচ</label>
                  <div className="relative">
                    <select 
                      value={filterBatch} 
                      onChange={(e) => setFilterBatch(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-[#e76f51] transition-colors appearance-none max-h-48"
                    >
                      <option value="All">সকল ব্যাচ</option>
                      {Array.from({length: 2050 - 1968 + 1}, (_, i) => 2050 - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-[10px] pointer-events-none"></i>
                  </div>
                </div>

                {/* ক্লিয়ার ফিল্টার বাটন */}
                {(filterBatch !== "All" || filterDept !== "All") && (
                  <button 
                    onClick={() => { setFilterBatch("All"); setFilterDept("All"); }}
                    className="mt-4 w-full py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-xmark"></i> রিসেট করুন
                  </button>
                )}
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
                  className={`bg-[#0a1c13] flex items-center justify-between p-3 sm:p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${rank.bg} ${rank.border} ${rank.shadow}`}
                >
                  <div className="flex items-center gap-3 sm:gap-6 w-full">
                    {/* Rank Number */}
                    <div className="w-6 sm:w-12 text-center shrink-0">
                      <span className={`text-xl sm:text-3xl font-black ${rank.color}`}>
                        {index < 3 ? <i className={`fa-solid ${rank.icon}`}></i> : `#${index + 1}`}
                      </span>
                    </div>

                    {/* Profile Picture */}
                    <div className="relative shrink-0">
                      <img src={avatar} alt={user.full_name} className={`w-10 h-10 sm:w-16 sm:h-16 rounded-full object-cover border-2 ${rank.border}`} />
                      {index < 3 && (
                        <div className={`absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[8px] sm:text-xs bg-[#050b08] border ${rank.border} ${rank.color}`}>
                          <i className={`fa-solid ${rank.icon}`}></i>
                        </div>
                      )}
                    </div>

                    {/* Name & Title */}
                    <div className="flex-grow min-w-0 pr-2">
                      <Link href={`/public-profile?id=${user.id}`} className="text-sm sm:text-xl font-bold text-white hover:text-[#e76f51] transition-colors line-clamp-1">
                        {user.full_name || 'Unknown Explorer'}
                      </Link>
                      
                      <div className="flex items-center gap-1.5 sm:gap-3 mt-0.5 sm:mt-1 flex-wrap">
                        <p className={`text-[8px] sm:text-[10px] font-black tracking-widest uppercase ${rank.color}`}>
                          {displayData.mainValue === 0 ? "Newbie" : rank.label}
                        </p>
                        
                        {displayData.subValue !== null && (
                          <>
                            <span className="hidden sm:block w-1 h-1 bg-gray-600 rounded-full"></span>
                            <p className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                              <i className="fa-solid fa-bolt text-yellow-500"></i> {displayData.subValue} {displayData.subLabel}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Dynamic Score Display */}
                    <div className="text-right shrink-0">
                      <p className="text-lg sm:text-4xl font-black text-white leading-none mb-1">
                        {displayData.mainValue}<span className="text-[10px] sm:text-sm text-gray-500 ml-1">{displayData.unit}</span>
                      </p>
                      <p className="text-[8px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest">{displayData.mainLabel}</p>
                    </div>
                  </div>
                </div>
              )
            })}

            {leaders.length === 0 && (
              <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10">
                <i className="fa-solid fa-ghost text-5xl text-gray-600 mb-4 opacity-50"></i>
                <h3 className="text-xl font-bold text-gray-400">লিডারবোর্ড ফাঁকা!</h3>
                <p className="text-sm text-gray-500 mt-2">এই ক্যাটাগরি ও ফিল্টারে কাউকে পাওয়া যায়নি।</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
