// app/stories/page.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; 
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";

export default function StoriesPage() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 });
    fetchStories();
  }, []);

  const fetchStories = async () => {
    // সুপাবেজ থেকে শুধু approved গল্প এবং লেখকের প্রোফাইল ডেটা (Join) ফেচ করা
    const { data, error } = await supabase
      .from('stories')
      .select('id, title, cover_image, created_at, profiles!inner(id, full_name, department, batch, photo_url)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (data) {
      setStories(data);
    }
    setLoading(false);
  };

  // তারিখ সুন্দর করে দেখানোর ফাংশন
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('bn-BD', options);
  };

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-12 relative" data-aos="fade-down">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="inline-block px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 font-bold text-xs sm:text-sm mb-4 tracking-widest relative z-10">
            <i className="fa-solid fa-book-open-reader mr-2"></i> কমিউনিটি ব্লগ
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 tracking-tight relative z-10">
            অ্যাডভেঞ্চারের <span className="text-[#34d399]">গল্প</span>
          </h1>
          <p className="text-gray-400 text-lg relative z-10 max-w-2xl mx-auto">
            ক্যাম্পাসের এক্সপ্লোরারদের রোমাঞ্চকর অভিজ্ঞতার ডায়েরি। পড়ুন এবং অনুপ্রেরণা নিন।
          </p>

          {/* Write Blog Button */}
          <div className="mt-8 relative z-10">
            <Link href="/write-blog" className="inline-flex items-center gap-3 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:-translate-y-1">
              <i className="fa-solid fa-pen-nib"></i> নিজের গল্প লিখুন
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <i className="fa-solid fa-compass fa-spin text-4xl text-blue-500"></i>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
            {stories.map((story, index) => {
              const author = story.profiles;
              const authorAvatar = author.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.full_name || 'Author')}&background=3b82f6&color=fff`;
              const coverImg = story.cover_image || "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=800";

              return (
                <div key={story.id} className="glass-panel rounded-2xl overflow-hidden border border-white/10 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-2 group flex flex-col" data-aos="fade-up" data-aos-delay={index * 100}>
                  
                  {/* Card Image (Clickable for reading story) */}
                  <Link href={`/story-reader?id=${story.id}`} className="block relative h-56 overflow-hidden">
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10"></div>
                    <img src={coverImg} alt={story.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
                  </Link>

                  {/* Card Content */}
                  <div className="p-6 flex flex-col flex-grow">
                    <Link href={`/story-reader?id=${story.id}`} className="block flex-grow">
                      <h3 className="text-xl font-black text-white mb-3 line-clamp-2 group-hover:text-blue-400 transition-colors">
                        {story.title}
                      </h3>
                      <p className="text-xs text-gray-400 mb-4 flex items-center gap-2">
                        <i className="fa-regular fa-calendar text-blue-400"></i> {formatDate(story.created_at)}
                      </p>
                    </Link>

                    {/* Author Info (Clickable for Public Profile) */}
                    <div className="pt-4 border-t border-white/10 mt-auto">
                      <Link href={`/public-profile?id=${author.id}`} className="flex items-center gap-3 hover:bg-white/5 p-2 -mx-2 rounded-xl transition-colors">
                        <img src={authorAvatar} alt={author.full_name} className="w-10 h-10 rounded-full border border-blue-500/30 object-cover" />
                        <div>
                          <p className="text-sm font-bold text-gray-200 hover:text-white">{author.full_name}</p>
                          <p className="text-[10px] font-semibold text-[#34d399] tracking-widest uppercase">
                            {author.department} • Batch {author.batch}
                          </p>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && stories.length === 0 && (
          <div className="text-center py-20 glass-panel rounded-3xl border border-white/10 max-w-2xl mx-auto" data-aos="zoom-in">
            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 text-3xl mx-auto mb-6">
              <i className="fa-solid fa-feather"></i>
            </div>
            <h3 className="text-2xl font-black text-white mb-2">এখনো কোনো গল্প প্রকাশিত হয়নি!</h3>
            <p className="text-gray-400 mb-6">প্রথম গল্পটি লিখে কমিউনিটিকে অনুপ্রাণিত করুন।</p>
            <Link href="/write-blog" className="inline-flex items-center gap-2 bg-[#34d399] hover:bg-emerald-600 text-[#050b08] font-bold py-3 px-6 rounded-xl transition-all">
              প্রথম গল্প লিখুন
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
