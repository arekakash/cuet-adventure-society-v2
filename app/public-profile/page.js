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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 });
    
    // URL থেকে ইউজারের ID বের করা (SSR এরর এড়াতে window.location ব্যবহার করা হলো)
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
      // ১. ইউজারের শুধুমাত্র পাবলিক (নন-সেনসিটিভ) ডেটা ফেচ করা হচ্ছে
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, department, batch, photo_url, role, survival_iq, total_events, total_km, fb_link, insta_link')
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        throw new Error("প্রোফাইলটি হয়তো মুছে ফেলা হয়েছে।");
      }
      setProfile(profileData);

      // ২. এই ইউজারের লেখা অ্যাপ্রুভ হওয়া গল্পগুলো ফেচ করা হচ্ছে
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
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('bn-BD', options);
  };

  // লোডিং স্টেট
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#050b08]">
        <div className="text-center">
          <i className="fa-solid fa-compass fa-spin text-5xl text-[#e76f51] mb-4"></i>
          <p className="text-gray-400 font-bold tracking-widest uppercase">প্রোফাইল লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // এরর স্টেট
  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#050b08] px-4">
        <div className="glass-panel text-center p-10 rounded-3xl max-w-lg w-full border border-red-500/30">
          <i className="fa-solid fa-user-xmark text-5xl text-red-500 mb-6"></i>
          <h2 className="text-2xl font-black text-white mb-2">{error}</h2>
          <Link href="/leaderboard" className="inline-block mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-bold border border-white/10">
            <i className="fa-solid fa-trophy mr-2"></i> লিডারবোর্ডে ফিরে যান
          </Link>
        </div>
      </div>
    );
  }

  const avatar = profile.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=e76f51&color=fff&size=256`;

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Back Button */}
        <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 text-gray-400 hover:text-[#e76f51] transition-colors font-bold mb-4 group">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#e76f51]/20 transition-colors">
            <i className="fa-solid fa-arrow-left"></i>
          </div>
          ফিরে যান
        </button>

        {/* Top Profile Section */}
        <div className="glass-panel rounded-[2rem] p-6 sm:p-10 border border-white/10 relative overflow-hidden" data-aos="fade-up">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#e76f51]/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
            
            {/* Avatar */}
            <div className="shrink-0 relative">
              <img src={avatar} alt={profile.full_name} className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-[#e76f51]/30 shadow-[0_0_30px_rgba(231,111,81,0.2)]" />
              <div className="absolute -bottom-2 right-4 bg-[#0a1c13] text-[#e76f51] border border-[#e76f51]/50 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                <i className="fa-solid fa-fire"></i> {profile.role}
              </div>
            </div>

            {/* User Info */}
            <div className="text-center md:text-left flex-grow">
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">{profile.full_name}</h1>
              <p className="text-[#34d399] font-bold tracking-widest uppercase mb-4">
                <i className="fa-solid fa-graduation-cap mr-2"></i> {profile.department} • ব্যাচ {profile.batch}
              </p>
              
              {/* Social Links */}
              <div className="flex justify-center md:justify-start gap-3 mt-4">
                {profile.fb_link && (
                  <a href={profile.fb_link} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition-colors border border-[#1877F2]/30">
                    <i className="fa-brands fa-facebook-f"></i>
                  </a>
                )}
                {profile.insta_link && (
                  <a href={profile.insta_link} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#E1306C]/10 text-[#E1306C] flex items-center justify-center hover:bg-[#E1306C] hover:text-white transition-colors border border-[#E1306C]/30">
                    <i className="fa-brands fa-instagram"></i>
                  </a>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6" data-aos="fade-up" data-aos-delay="100">
          
          <div className="glass-panel p-6 rounded-3xl border border-white/10 text-center hover:border-yellow-500/50 transition-colors group">
            <div className="w-14 h-14 mx-auto bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 text-2xl mb-4 group-hover:scale-110 transition-transform">
              <i className="fa-solid fa-brain"></i>
            </div>
            <h3 className="text-4xl font-black text-white mb-1">{profile.survival_iq || 0}</h3>
            <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">Survival IQ</p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-white/10 text-center hover:border-[#e76f51]/50 transition-colors group">
            <div className="w-14 h-14 mx-auto bg-[#e76f51]/10 rounded-2xl flex items-center justify-center text-[#e76f51] text-2xl mb-4 group-hover:scale-110 transition-transform">
              <i className="fa-solid fa-tent"></i>
            </div>
            <h3 className="text-4xl font-black text-white mb-1">{profile.total_events || 0}</h3>
            <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">Total Events</p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-white/10 text-center hover:border-blue-500/50 transition-colors group">
            <div className="w-14 h-14 mx-auto bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 text-2xl mb-4 group-hover:scale-110 transition-transform">
              <i className="fa-solid fa-person-hiking"></i>
            </div>
            <h3 className="text-4xl font-black text-white mb-1">{profile.total_km || 0} <span className="text-xl text-gray-500">km</span></h3>
            <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">Trekking Distance</p>
          </div>

        </div>

        {/* User's Stories Section */}
        <div data-aos="fade-up" data-aos-delay="200" className="pt-8">
          <div className="flex items-center gap-3 mb-6">
            <i className="fa-solid fa-book-open-reader text-2xl text-[#34d399]"></i>
            <h2 className="text-2xl font-black text-white">{profile.full_name} এর লেখা গল্পসমূহ</h2>
          </div>

          {userStories.length === 0 ? (
            <div className="glass-panel p-10 rounded-3xl border border-white/10 text-center">
              <p className="text-gray-400">এই এক্সপ্লোরার এখনো কোনো গল্প শেয়ার করেননি।</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {userStories.map((story) => (
                <Link key={story.id} href={`/story-reader?id=${story.id}`} className="glass-panel rounded-2xl overflow-hidden border border-white/10 hover:border-[#e76f51]/50 transition-all group flex h-32">
                  <div className="w-1/3 relative overflow-hidden shrink-0">
                    <img src={story.cover_image || "https://images.unsplash.com/photo-1511497584788-876760111969"} alt={story.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="w-2/3 p-4 flex flex-col justify-center">
                    <h3 className="text-sm font-bold text-white mb-2 line-clamp-2 group-hover:text-[#e76f51] transition-colors">{story.title}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      <i className="fa-regular fa-calendar mr-1"></i> {formatDate(story.created_at)}
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
