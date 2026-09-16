"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; 
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";

export default function PublicProfilePage() {
  const [profile, setProfile] = useState(null);
  const [userStories, setUserStories] = useState([]);
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
      // 🔴 আপডেট: নতুন স্ট্যাটস কলামগুলো ফেচ করা হচ্ছে
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id, full_name, department, batch, photo_url, role, 
          survival_iq, total_treks, total_distance, total_rides, 
          cycling_distance, total_swims, swimming_distance, fb_link, insta_link
        `)
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        throw new Error("প্রোফাইলটি হয়তো মুছে ফেলা হয়েছে।");
      }
      setProfile(profileData);

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
          <Link href="/leaderboard" className="inline-block mt-4 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-bold text-sm border border-white/10">
            <i className="fa-solid fa-arrow-left mr-2"></i> ফিরে যান
          </Link>
        </div>
      </div>
    );
  }

  const avatar = profile.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=0a1c13&color=fff&size=256`;

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 relative overflow-x-hidden">
      
      {/* Background Glow */}
      <div className="fixed top-20 right-0 w-64 h-64 bg-[#e76f51]/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Back Button */}
        <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-2">
          <i className="fa-solid fa-arrow-left"></i> ফিরে যান
        </button>

        {/* 🔴 Top Section: Profile Info & Stats combined to save space */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" data-aos="fade-up">
          
          {/* User Info Card */}
          <div className="lg:col-span-5 bg-[#0a1c13]/80 backdrop-blur-md rounded-[2rem] p-6 sm:p-8 border border-white/5 shadow-xl relative overflow-hidden flex flex-col items-center sm:items-start sm:flex-row gap-6">
            
            <div className="shrink-0 relative">
              <img src={avatar} alt={profile.full_name} className="w-28 h-28 rounded-full object-cover border-4 border-[#e76f51]/20 shadow-[0_0_20px_rgba(231,111,81,0.2)]" />
              <div className="absolute -bottom-2 right-2 bg-[#050b08] text-[#e76f51] border border-[#e76f51]/30 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg">
                <i className="fa-solid fa-fire mr-1"></i> {profile.role}
              </div>
            </div>

            <div className="text-center sm:text-left flex-grow">
              <h1 className="text-2xl font-black text-white mb-1 line-clamp-1">{profile.full_name}</h1>
              <p className="text-emerald-400 text-xs font-bold tracking-widest uppercase mb-3 bg-emerald-400/10 inline-block px-2.5 py-1 rounded-md border border-emerald-400/20">
                {profile.department} '{String(profile.batch).slice(-2)}
              </p>
              
              <div className="flex justify-center sm:justify-start gap-2">
                {profile.fb_link && (
                  <a href={profile.fb_link} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors border border-blue-500/20 text-sm">
                    <i className="fa-brands fa-facebook-f"></i>
                  </a>
                )}
                {profile.insta_link && (
                  <a href={profile.insta_link} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-pink-500/10 text-pink-400 flex items-center justify-center hover:bg-pink-500 hover:text-white transition-colors border border-pink-500/20 text-sm">
                    <i className="fa-brands fa-instagram"></i>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* 🔴 Compact Multi-Disciplinary Stats Grid */}
          <div className="lg:col-span-7 grid grid-cols-3 gap-3 sm:gap-4">
            
            {/* Trekking */}
            <div className="bg-[#0a1c13]/80 backdrop-blur-md p-4 rounded-3xl border border-white/5 text-center hover:border-emerald-500/30 hover:-translate-y-1 transition-all group shadow-md flex flex-col justify-center">
              <i className="fa-solid fa-shoe-prints text-emerald-400 text-xl mb-2 group-hover:scale-110 transition-transform"></i>
              <h3 className="text-2xl font-black text-white mb-0.5">{profile.total_distance || 0}<span className="text-[10px] text-gray-500 ml-1">km</span></h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{profile.total_treks || 0} Treks</p>
            </div>

            {/* Cycling */}
            <div className="bg-[#0a1c13]/80 backdrop-blur-md p-4 rounded-3xl border border-white/5 text-center hover:border-blue-500/30 hover:-translate-y-1 transition-all group shadow-md flex flex-col justify-center">
              <i className="fa-solid fa-bicycle text-blue-400 text-xl mb-2 group-hover:scale-110 transition-transform"></i>
              <h3 className="text-2xl font-black text-white mb-0.5">{profile.cycling_distance || 0}<span className="text-[10px] text-gray-500 ml-1">km</span></h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{profile.total_rides || 0} Rides</p>
            </div>

            {/* Swimming */}
            <div className="bg-[#0a1c13]/80 backdrop-blur-md p-4 rounded-3xl border border-white/5 text-center hover:border-cyan-400/30 hover:-translate-y-1 transition-all group shadow-md flex flex-col justify-center">
              <i className="fa-solid fa-person-swimming text-cyan-400 text-xl mb-2 group-hover:scale-110 transition-transform"></i>
              <h3 className="text-2xl font-black text-white mb-0.5">{profile.swimming_distance || 0}<span className="text-[10px] text-gray-500 ml-1">m</span></h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{profile.total_swims || 0} Swims</p>
            </div>

          </div>
        </div>

        {/* 🔴 Compact User's Stories Section */}
        <div data-aos="fade-up" data-aos-delay="100" className="pt-4">
          <div className="flex items-center gap-2 mb-4">
            <i className="fa-solid fa-pen-nib text-lg text-yellow-500"></i>
            <h2 className="text-lg font-black text-white tracking-wide">পাবলিশ করা গল্পসমূহ</h2>
          </div>

          {userStories.length === 0 ? (
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
              <p className="text-gray-400 text-sm">এই এক্সপ্লোরার এখনো কোনো গল্প শেয়ার করেননি।</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {userStories.map((story) => (
                <Link key={story.id} href={`/story-reader?id=${story.id}`} className="bg-[#0a1c13] rounded-xl overflow-hidden border border-white/5 hover:border-[#e76f51]/40 transition-all group flex flex-col shadow-md">
                  <div className="w-full h-24 sm:h-28 relative overflow-hidden">
                    <img src={story.cover_image || "https://images.unsplash.com/photo-1511497584788-876760111969"} alt={story.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a1c13] to-transparent opacity-60"></div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-xs font-bold text-white mb-1.5 line-clamp-2 leading-snug group-hover:text-[#e76f51] transition-colors">{story.title}</h3>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
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
