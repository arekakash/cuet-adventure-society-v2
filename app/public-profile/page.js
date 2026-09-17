// app/public-profile/page.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; 
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";

export default function PublicProfilePage() {
  const [profile, setProfile] = useState(null);
  const [userStories, setUserStories] = useState([]);
  const [rank, setRank] = useState('-');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 });
    
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get("id");
    
    if (id) {
      fetchPublicProfile(id);
    } else {
      setError("কোনো এক্সপ্লোরারকে খুঁজে পাওয়া যায়নি!");
      setLoading(false);
    }
  }, []);

  const fetchPublicProfile = async (userId) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id, full_name, department, batch, photo_url, role, 
          survival_iq, total_events, total_treks, total_distance, total_rides, 
          cycling_distance, total_swims, swimming_distance, fb_link, insta_link
        `)
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        throw new Error("প্রোফাইলটি হয়তো মুছে ফেলা হয়েছে।");
      }
      setProfile(profileData);

      // Rank Calculation (ড্যাশবোর্ডের মতো)
      const totalActivities = (profileData.total_treks || 0) + (profileData.total_rides || 0) + (profileData.total_swims || 0);
      if (totalActivities > 0 || (profileData.survival_iq && profileData.survival_iq > 0)) {
        const { count, error: rankError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('survival_iq', profileData.survival_iq || 0);
        
        if (!rankError) setRank(count + 1);
      }

      // ইউজারের লেখা গল্পগুলো
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select('id, title, cover_image, created_at')
        .eq('author_id', userId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (!storiesError && storiesData) {
        setUserStories(storiesData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-GB', options);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#050b08]">
        <div className="text-center">
          <i className="fa-solid fa-compass fa-spin text-5xl text-[#e76f51] mb-4"></i>
          <p className="text-gray-400 font-bold tracking-widest uppercase text-xs">প্রোফাইল লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#050b08] px-4">
        <div className="bg-[#0a1c13] text-center p-8 rounded-3xl max-w-sm w-full border border-red-500/30 shadow-2xl">
          <i className="fa-solid fa-user-xmark text-4xl text-red-500 mb-4"></i>
          <h2 className="text-xl font-black text-white mb-2">{error}</h2>
          <button onClick={() => window.history.back()} className="inline-block mt-4 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-bold text-sm border border-white/10">
            <i className="fa-solid fa-arrow-left mr-2"></i> ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  const avatar = profile.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=0a1c13&color=fff&size=256`;

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 relative overflow-x-hidden">
      
      {/* Background Glow */}
      <div className="fixed top-20 right-0 w-64 h-64 bg-[#e76f51]/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto space-y-5">
        
        {/* Back Button */}
        <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-1">
          <i className="fa-solid fa-arrow-left"></i> ফিরে যান
        </button>

        {/* 🔴 Top Section: 4-Column Profile Info + 8-Column 6-Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" data-aos="fade-up">
          
          {/* Profile Card - Compact */}
          <div className="lg:col-span-4 bg-[#0a1c13]/80 backdrop-blur-md rounded-3xl p-5 border border-white/5 shadow-xl relative overflow-hidden flex flex-col items-center text-center gap-3">
            
            <div className="shrink-0 relative mt-2">
              <img src={avatar} alt={profile.full_name} className="w-24 h-24 rounded-full object-cover border-[3px] border-[#e76f51]/20 shadow-[0_0_15px_rgba(231,111,81,0.2)]" />
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[#050b08] text-[#e76f51] border border-[#e76f51]/30 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">
                <i className="fa-solid fa-fire mr-1"></i> {profile.role}
              </div>
            </div>

            <div className="w-full">
              <h1 className="text-xl font-black text-white mb-1 line-clamp-1">{profile.full_name}</h1>
              <p className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase mb-3 bg-emerald-400/10 inline-block px-2 py-1 rounded border border-emerald-400/20">
                {profile.department} '{String(profile.batch).slice(-2)}
              </p>
              
              <div className="flex justify-center gap-2 mt-1">
                {profile.fb_link && (
                  <a href={profile.fb_link} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors border border-blue-500/20 text-xs">
                    <i className="fa-brands fa-facebook-f"></i>
                  </a>
                )}
                {profile.insta_link && (
                  <a href={profile.insta_link} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-pink-500/10 text-pink-400 flex items-center justify-center hover:bg-pink-500 hover:text-white transition-colors border border-pink-500/20 text-xs">
                    <i className="fa-brands fa-instagram"></i>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* 6 Stats Grid - Compact */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
            
            {/* Global Rank */}
            <div className="bg-[#0a1c13]/80 backdrop-blur-md p-3.5 rounded-2xl border border-yellow-500/20 text-center hover:border-yellow-500/40 transition-all flex flex-col justify-center items-center shadow-md">
              <div className="w-7 h-7 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center text-sm mb-1.5"><i className="fa-solid fa-crown"></i></div>
              <h3 className="text-xl font-black text-white mb-0.5">#{rank}</h3>
              <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Global Rank</p>
            </div>

            {/* Survival IQ */}
            <div className="bg-[#0a1c13]/80 backdrop-blur-md p-3.5 rounded-2xl border border-[#34d399]/20 text-center hover:border-[#34d399]/40 transition-all flex flex-col justify-center items-center shadow-md">
              <div className="w-7 h-7 rounded-full bg-[#34d399]/20 text-[#34d399] flex items-center justify-center text-sm mb-1.5"><i className="fa-solid fa-brain"></i></div>
              <h3 className="text-xl font-black text-white mb-0.5">{profile.survival_iq || 0}</h3>
              <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Survival IQ</p>
            </div>

            {/* Total Events */}
            <div className="bg-[#0a1c13]/80 backdrop-blur-md p-3.5 rounded-2xl border border-[#e76f51]/20 text-center hover:border-[#e76f51]/40 transition-all flex flex-col justify-center items-center shadow-md">
              <div className="w-7 h-7 rounded-full bg-[#e76f51]/20 text-[#e76f51] flex items-center justify-center text-sm mb-1.5"><i className="fa-solid fa-tent"></i></div>
              <h3 className="text-xl font-black text-white mb-0.5">{profile.total_events || 0}</h3>
              <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Total Events</p>
            </div>

            {/* Trekking */}
            <div className="bg-[#0a1c13]/80 backdrop-blur-md p-3.5 rounded-2xl border border-emerald-500/20 text-center hover:border-emerald-500/40 transition-all flex flex-col justify-center shadow-md">
              <i className="fa-solid fa-shoe-prints text-emerald-400 text-base mb-1.5 opacity-80"></i>
              <h3 className="text-xl font-black text-white mb-0.5">{profile.total_distance || 0}<span className="text-[9px] text-gray-500 ml-0.5 font-normal">km</span></h3>
              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{profile.total_treks || 0} Treks</p>
            </div>

            {/* Cycling */}
            <div className="bg-[#0a1c13]/80 backdrop-blur-md p-3.5 rounded-2xl border border-blue-500/20 text-center hover:border-blue-500/40 transition-all flex flex-col justify-center shadow-md">
              <i className="fa-solid fa-bicycle text-blue-400 text-base mb-1.5 opacity-80"></i>
              <h3 className="text-xl font-black text-white mb-0.5">{profile.cycling_distance || 0}<span className="text-[9px] text-gray-500 ml-0.5 font-normal">km</span></h3>
              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{profile.total_rides || 0} Rides</p>
            </div>

            {/* Swimming */}
            <div className="bg-[#0a1c13]/80 backdrop-blur-md p-3.5 rounded-2xl border border-cyan-500/20 text-center hover:border-cyan-500/40 transition-all flex flex-col justify-center shadow-md">
              <i className="fa-solid fa-person-swimming text-cyan-400 text-base mb-1.5 opacity-80"></i>
              <h3 className="text-xl font-black text-white mb-0.5">{profile.swimming_distance || 0}<span className="text-[9px] text-gray-500 ml-0.5 font-normal">m</span></h3>
              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{profile.total_swims || 0} Swims</p>
            </div>

          </div>
        </div>

        {/* 🔴 Compact User's Stories Section */}
        <div data-aos="fade-up" data-aos-delay="100" className="pt-2">
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-pen-nib text-sm text-yellow-500"></i>
              <h2 className="text-sm font-black text-white tracking-wide uppercase">পাবলিশ করা গল্প</h2>
            </div>
            <span className="text-xs text-gray-500 font-bold bg-white/5 px-2 py-0.5 rounded">{userStories.length}</span>
          </div>

          {userStories.length === 0 ? (
            <div className="bg-[#0a1c13]/50 p-6 rounded-2xl border border-white/5 text-center">
              <p className="text-gray-500 text-xs font-medium">এই এক্সপ্লোরার এখনো কোনো গল্প শেয়ার করেননি।</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {userStories.map((story) => (
                <Link key={story.id} href={`/story-reader?id=${story.id}`} className="bg-[#0a1c13] rounded-xl overflow-hidden border border-white/5 hover:border-[#e76f51]/40 transition-all group flex flex-col shadow-md">
                  <div className="w-full h-24 relative overflow-hidden">
                    <img src={story.cover_image || "https://images.unsplash.com/photo-1511497584788-876760111969"} alt={story.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a1c13] to-transparent opacity-80"></div>
                  </div>
                  <div className="p-2.5">
                    <h3 className="text-[10px] font-bold text-white mb-1 line-clamp-2 leading-snug group-hover:text-[#e76f51] transition-colors">{story.title}</h3>
                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                      {formatDate(story.created_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
