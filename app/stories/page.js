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
    // 🔴 Main background with Light/Dark Mode transition
    <div className="min-h-screen bg-pastel-bg dark:bg-darkForest pt-24 pb-12 px-4 sm:px-6 lg:px-8 transition-colors duration-500">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-12 relative" data-aos="fade-down">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-100 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none transition-colors duration-500"></div>
          
          <div className="inline-block px-4 py-1.5 rounded-full border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs sm:text-sm mb-4 tracking-widest relative z-10 shadow-sm dark:shadow-none transition-colors duration-500">
            <i className="fa-solid fa-book-open-reader mr-2"></i> কমিউনিটি ব্লগ
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-black text-gray-900 dark:text-white mb-4 tracking-tight relative z-10 transition-colors duration-500">
            অ্যাডভেঞ্চারের <span className="text-emerald-500 dark:text-[#34d399] transition-colors duration-500">গল্প</span>
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 text-lg relative z-10 max-w-2xl mx-auto transition-colors duration-500">
            ক্যাম্পাসের এক্সপ্লোরারদের রোমাঞ্চকর অভিজ্ঞতার ডায়েরি। পড়ুন এবং অনুপ্রেরণা নিন।
          </p>

          {/* Write Blog Button */}
          <div className="mt-8 relative z-10">
            <Link href="/write-blog" className="inline-flex items-center gap-3 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full transition-all shadow-md dark:shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:-translate-y-1">
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
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8 relative z-10">
            {stories.map((story, index) => {
              const author = story.profiles;
              const authorAvatar = author.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.full_name || 'Author')}&background=3b82f6&color=fff`;
              const coverImg = story.cover_image || "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=800";

              return (
                <div 
                  key={story.id} 
                  className="bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-2 group flex flex-col shadow-soft dark:shadow-none hover:shadow-md dark:hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]" 
                  data-aos="fade-up" 
                  data-aos-delay={index * 100}
                >
                  
                  {/* Card Image (Clickable for reading story) */}
                  <Link href={`/story-reader?id=${story.id}`} className="block relative h-28 md:h-56 overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-black/10 dark:bg-black/20 group-hover:bg-transparent transition-colors z-10"></div>
                    <img src={coverImg} alt={story.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
                  </Link>

                  {/* Card Content */}
                  <div className="p-3 md:p-6 flex flex-col flex-grow">
                    <Link href={`/story-reader?id=${story.id}`} className="block flex-grow">
                      <h3 className="text-sm md:text-xl font-black text-gray-900 dark:text-white mb-2 md:mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                        {story.title}
                      </h3>
                      <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mb-2 md:mb-4 flex items-center gap-1 md:gap-2 transition-colors">
                        <i className="fa-regular fa-calendar text-blue-500 dark:text-blue-400"></i> {formatDate(story.created_at)}
                      </p>
                    </Link>

                    {/* Author Info (Clickable for Public Profile) */}
                    <div className="pt-2 md:pt-4 border-t border-gray-200 dark:border-white/10 mt-auto transition-colors">
                      <Link href={`/public-profile?id=${author.id}`} className="flex items-center gap-2 md:gap-3 hover:bg-gray-50 dark:hover:bg-white/5 p-1 md:p-2 -mx-1 md:-mx-2 rounded-xl transition-colors group/author">
                        <img src={authorAvatar} alt={author.full_name} className="w-7 h-7 md:w-10 md:h-10 rounded-full border border-blue-200 dark:border-blue-500/30 shadow-sm dark:shadow-none object-cover flex-shrink-0 transition-colors" />
                        <div className="min-w-0">
                          <p className="text-xs md:text-sm font-bold text-gray-800 dark:text-gray-200 group-hover/author:text-blue-600 dark:group-hover/author:text-white truncate transition-colors">{author.full_name}</p>
                          <p className="text-[8px] md:text-[10px] font-bold text-emerald-600 dark:text-[#34d399] tracking-widest uppercase truncate transition-colors">
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
          <div className="text-center py-20 bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-white/10 max-w-2xl mx-auto shadow-soft dark:shadow-none transition-colors duration-500" data-aos="zoom-in">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 dark:text-blue-400 text-3xl mx-auto mb-6 shadow-sm dark:shadow-none transition-colors">
              <i className="fa-solid fa-feather"></i>
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 transition-colors">এখনো কোনো গল্প প্রকাশিত হয়নি!</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 transition-colors">প্রথম গল্পটি লিখে কমিউনিটিকে অনুপ্রাণিত করুন।</p>
            <Link href="/write-blog" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-[#34d399] dark:hover:bg-emerald-600 text-white dark:text-[#050b08] font-bold py-3 px-6 rounded-xl transition-all shadow-md dark:shadow-none hover:-translate-y-1">
              প্রথম গল্প লিখুন
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
