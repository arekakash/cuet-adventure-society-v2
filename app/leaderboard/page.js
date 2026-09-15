// app/leaderboard/page.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; 
import Link from "next/link";

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // নতুন লজিক: কোন ফিল্টারটি অ্যাক্টিভ আছে তা ট্র্যাক করা
  const [activeTab, setActiveTab] = useState("survival_iq"); 

  // যখনই ইউজার অন্য ট্যাবে ক্লিক করবে, ডেটা নতুন করে ফেচ হবে
  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]); 

  const fetchLeaderboard = async () => {
    setLoading(true);
    // ডায়নামিক সর্টিং লজিক
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, photo_url, survival_iq, total_events, total_km, role')
      .order(activeTab, { ascending: false, nullsFirst: false })
      .limit(50);

    if (data) {
      setLeaders(data);
    }
    setLoading(false);
  };

  const getRankStyle = (index) => {
    if (index === 0) return { color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/50", shadow: "shadow-[0_0_20px_rgba(250,204,21,0.3)]", icon: "fa-trophy", label: "Champion" };
    if (index === 1) return { color: "text-gray-300", bg: "bg-gray-300/10", border: "border-gray-300/50", shadow: "shadow-[0_0_15px_rgba(209,213,219,0.2)]", icon: "fa-medal", label: "Runner Up" };
    if (index === 2) return { color: "text-amber-600", bg: "bg-amber-600/10", border: "border-amber-600/50", shadow: "shadow-[0_0_15px_rgba(217,119,6,0.2)]", icon: "fa-award", label: "Third Place" };
    return { color: "text-[#34d399]", bg: "bg-white/5", border: "border-white/10", shadow: "", icon: "fa-star", label: "Explorer" };
  };

  // ডায়নামিক ডেটা দেখানোর ফাংশন
  const getDisplayValue = (user) => {
    if (activeTab === "survival_iq") return { value: user.survival_iq || 0, label: "IQ Points" };
    if (activeTab === "total_events") return { value: user.total_events || 0, label: "Events Done" };
    if (activeTab === "total_km") return { value: user.total_km || 0, label: "Trek KM" };
  };

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-10 relative">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 tracking-tight relative z-10">
            ক্যাম্পাস <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">লিডারবোর্ড</span>
          </h1>
          <p className="text-gray-400 text-lg relative z-10">
            আমাদের ক্লাবের সেরা এক্সপ্লোরারদের রিয়েল-টাইম র‍্যাংকিং। 
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-10 relative z-10">
          <button 
            onClick={() => setActiveTab("survival_iq")}
            className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 flex items-center gap-2 ${activeTab === "survival_iq" ? "bg-[#34d399] text-[#050b08] shadow-[0_0_15px_rgba(52,211,153,0.4)] scale-105" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"}`}
          >
            <i className="fa-solid fa-brain"></i> Survival IQ
          </button>
          
          <button 
            onClick={() => setActiveTab("total_events")}
            className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 flex items-center gap-2 ${activeTab === "total_events" ? "bg-[#e76f51] text-white shadow-[0_0_15px_rgba(231,111,81,0.4)] scale-105" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"}`}
          >
            <i className="fa-solid fa-tent"></i> Total Events
          </button>
          
          <button 
            onClick={() => setActiveTab("total_km")}
            className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 flex items-center gap-2 ${activeTab === "total_km" ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] scale-105" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"}`}
          >
            <i className="fa-solid fa-person-hiking"></i> Trekking KM
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <i className="fa-solid fa-compass fa-spin text-4xl text-[#e76f51]"></i>
          </div>
        ) : (
          <div className="space-y-4 relative z-10">
            {leaders.map((user, index) => {
              const rank = getRankStyle(index);
              const avatar = user.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=0a1c13&color=fff`;
              const displayData = getDisplayValue(user);

              return (
                <div 
                  key={user.id} 
                  className={`glass-panel flex items-center justify-between p-4 sm:p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${rank.bg} ${rank.border} ${rank.shadow}`}
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
                      <Link href={`/public-profile?id=${user.id}`} className="text-lg sm:text-xl font-bold text-white hover:text-blue-400 transition-colors">
                        {user.full_name || 'Unknown Explorer'}
                      </Link>
                      <p className={`text-xs sm:text-sm font-semibold tracking-wider uppercase mt-1 ${rank.color}`}>
                        {displayData.value === 0 ? "Newbie" : rank.label}
                      </p>
                    </div>
                  </div>

                  {/* Dynamic Score Display */}
                  <div className="text-right">
                    <p className="text-2xl sm:text-4xl font-black text-white">{displayData.value}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">{displayData.label}</p>
                  </div>
                </div>
              );
            })}

            {leaders.length === 0 && (
              <div className="text-center py-10 glass-panel rounded-2xl border border-white/10">
                <p className="text-gray-400">এখনো কোনো এক্সপ্লোরারের ডেটা পাওয়া যায়নি!</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
