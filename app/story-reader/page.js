// app/story-reader/page.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; 
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";

export default function StoryReaderPage() {
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 });
    
    // URL থেকে গল্পের ID বের করা (Next.js 빌드 এরর এড়াতে window.location ব্যবহার করা হলো)
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get("id");
    
    if (id) {
      fetchStory(id);
    } else {
      setError("গল্প খুঁজে পাওয়া যায়নি!");
      setLoading(false);
    }
  }, []);

  const fetchStory = async (id) => {
    const { data, error } = await supabase
      .from('stories')
      .select('id, title, content, cover_image, created_at, profiles!inner(id, full_name, department, batch, photo_url)')
      .eq('id', id)
      .single();

    if (error || !data) {
      setError("গল্পটি হয়তো মুছে ফেলা হয়েছে অথবা এখনো অ্যাপ্রুভ হয়নি।");
    } else {
      setStory(data);
    }
    setLoading(false);
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
          <i className="fa-solid fa-compass fa-spin text-5xl text-blue-500 mb-4"></i>
          <p className="text-gray-400 font-bold tracking-widest uppercase">গল্প লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // এরর স্টেট
  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#050b08] px-4">
        <div className="glass-panel text-center p-10 rounded-3xl max-w-lg w-full border border-red-500/30">
          <i className="fa-solid fa-triangle-exclamation text-5xl text-red-500 mb-6"></i>
          <h2 className="text-2xl font-black text-white mb-2">{error}</h2>
          <Link href="/stories" className="inline-block mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-bold border border-white/10">
            <i className="fa-solid fa-arrow-left mr-2"></i> স্টোরিজ পেজে ফিরে যান
          </Link>
        </div>
      </div>
    );
  }

  const author = story.profiles;
  const authorAvatar = author.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.full_name || 'Author')}&background=3b82f6&color=fff`;
  const coverImg = story.cover_image || "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=1200";

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Back Button */}
        <Link href="/stories" className="inline-flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors font-bold mb-8 group" data-aos="fade-right">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
            <i className="fa-solid fa-arrow-left"></i>
          </div>
          সব গল্পে ফিরে যান
        </Link>

        <div className="glass-panel rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl" data-aos="fade-up">
          
          {/* Cover Image */}
          <div className="w-full h-64 sm:h-96 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a1c13] via-transparent to-transparent z-10"></div>
            <img src={coverImg} alt={story.title} className="w-full h-full object-cover" />
          </div>

          <div className="p-6 sm:p-12 relative z-20 -mt-20">
            
            {/* Title & Meta */}
            <div className="mb-10 text-center">
              <h1 className="text-3xl sm:text-5xl font-black text-white mb-6 leading-tight drop-shadow-md">
                {story.title}
              </h1>
              
              {/* Author Info */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 bg-black/40 backdrop-blur-md border border-white/10 py-3 px-6 rounded-full inline-flex">
                <Link href={`/public-profile?id=${author.id}`} className="flex items-center gap-3 group">
                  <img src={authorAvatar} alt={author.full_name} className="w-10 h-10 rounded-full border-2 border-blue-500/50 object-cover group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-200 group-hover:text-blue-400 transition-colors">{author.full_name}</p>
                    <p className="text-[10px] text-[#34d399] tracking-widest uppercase font-semibold">
                      {author.department} • Batch {author.batch}
                    </p>
                  </div>
                </Link>
                
                <div className="w-px h-8 bg-white/20 hidden sm:block"></div>
                
                <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm font-bold">
                  <i className="fa-regular fa-calendar-days text-blue-400"></i>
                  {formatDate(story.created_at)}
                </div>
              </div>
            </div>

            {/* Story Content (Rich Text) */}
            <div 
              className="story-content text-gray-300 text-lg leading-relaxed"
              dangerouslySetInnerHTML={{ __html: story.content }}
            ></div>

          </div>
        </div>

      </div>

      {/* Global Style for Rich Text Formatting */}
      <style jsx global>{`
        .story-content p {
          margin-bottom: 1.5rem;
          line-height: 1.8;
        }
        .story-content h3 {
          font-size: 1.5rem;
          font-weight: 900;
          color: #fff;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }
        .story-content h4 {
          font-size: 1.25rem;
          font-weight: bold;
          color: #e5e7eb;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .story-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .story-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .story-content li {
          margin-bottom: 0.5rem;
        }
        .story-content a {
          color: #3b82f6;
          text-decoration: underline;
        }
        .story-content strong {
          color: #fff;
        }
        .story-content blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1rem;
          font-style: italic;
          color: #9ca3af;
          margin-bottom: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          padding: 1rem;
          border-radius: 0 0.5rem 0.5rem 0;
        }
      `}</style>
    </div>
  );
}
