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
    
    // URL থেকে গল্পের ID বের করা 
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

  // লোডিং স্টেট (Light/Dark Mode Supported)
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-pastel-bg dark:bg-darkForest transition-colors duration-500">
        <div className="text-center">
          <i className="fa-solid fa-compass fa-spin text-5xl text-blue-500 mb-4 transition-colors"></i>
          <p className="text-gray-500 dark:text-gray-400 font-bold tracking-widest uppercase transition-colors">গল্প লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // এরর স্টেট (Light/Dark Mode Supported)
  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-pastel-bg dark:bg-darkForest px-4 transition-colors duration-500">
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md text-center p-10 rounded-3xl max-w-lg w-full border border-red-200 dark:border-red-500/30 shadow-soft dark:shadow-none transition-colors duration-500">
          <i className="fa-solid fa-triangle-exclamation text-5xl text-red-500 mb-6 transition-colors"></i>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 transition-colors">{error}</h2>
          <Link href="/stories" className="inline-block mt-6 px-6 py-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white rounded-xl transition-colors font-bold border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none">
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
    // 🔴 Main background with transition
    <div className="min-h-screen bg-pastel-bg dark:bg-darkForest pt-24 pb-20 px-4 sm:px-6 lg:px-8 transition-colors duration-500">
      <div className="max-w-4xl mx-auto">
        
        {/* Back Button */}
        <Link href="/stories" className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-bold mb-8 group" data-aos="fade-right">
          <div className="w-8 h-8 rounded-full bg-white dark:bg-white/5 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors shadow-sm dark:shadow-none border border-gray-200 dark:border-transparent">
            <i className="fa-solid fa-arrow-left text-sm"></i>
          </div>
          সব গল্পে ফিরে যান
        </Link>

        {/* 🔴 Main Content Card */}
        <div className="bg-white/90 dark:bg-moss/70 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-gray-200 dark:border-white/10 shadow-lg dark:shadow-2xl transition-colors duration-500" data-aos="fade-up">
          
          {/* Cover Image */}
          <div className="w-full h-64 sm:h-96 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent dark:from-moss dark:via-transparent dark:to-transparent z-10 transition-colors duration-500"></div>
            <img src={coverImg} alt={story.title} className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal transition-opacity duration-500" />
          </div>

          <div className="p-6 sm:p-12 relative z-20 -mt-20">
            
            {/* Title & Meta */}
            <div className="mb-10 text-center">
              <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white mb-6 leading-tight drop-shadow-sm dark:drop-shadow-md transition-colors">
                {story.title}
              </h1>
              
              {/* Author Info */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 bg-gray-50/90 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 py-3 px-6 rounded-full inline-flex shadow-sm dark:shadow-none transition-colors">
                <Link href={`/public-profile?id=${author.id}`} className="flex items-center gap-3 group">
                  <img src={authorAvatar} alt={author.full_name} className="w-10 h-10 rounded-full border-2 border-blue-200 dark:border-blue-500/50 object-cover group-hover:scale-110 transition-all shadow-sm dark:shadow-none" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{author.full_name}</p>
                    <p className="text-[10px] text-emerald-600 dark:text-[#34d399] tracking-widest uppercase font-bold transition-colors">
                      {author.department} • Batch {author.batch}
                    </p>
                  </div>
                </Link>
                
                <div className="w-px h-8 bg-gray-300 dark:bg-white/20 hidden sm:block transition-colors"></div>
                
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-bold transition-colors">
                  <i className="fa-regular fa-calendar-days text-blue-500 dark:text-blue-400"></i>
                  {formatDate(story.created_at)}
                </div>
              </div>
            </div>

            {/* Story Content (Rich Text) */}
            <div 
              className="story-content text-gray-700 dark:text-gray-300 text-lg leading-relaxed transition-colors"
              dangerouslySetInnerHTML={{ __html: story.content }}
            ></div>

          </div>
        </div>

      </div>

      {/* 🔴 Global Style for Rich Text Formatting (Light/Dark Supported) */}
      <style jsx global>{`
        /* Text styling */
        .story-content p {
          margin-bottom: 1.5rem;
          line-height: 1.8;
        }

        /* Headings styling */
        .story-content h3 {
          font-size: 1.5rem;
          font-weight: 900;
          color: var(--tw-prose-headings, #111827); /* Light mode text-gray-900 */
          margin-top: 2rem;
          margin-bottom: 1rem;
          transition: color 0.5s ease;
        }
        .dark .story-content h3 {
          color: #ffffff; /* Dark mode text-white */
        }

        .story-content h4 {
          font-size: 1.25rem;
          font-weight: bold;
          color: var(--tw-prose-headings, #374151); /* Light mode text-gray-700 */
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          transition: color 0.5s ease;
        }
        .dark .story-content h4 {
          color: #e5e7eb; /* Dark mode text-gray-200 */
        }

        /* Lists styling */
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

        /* Links styling */
        .story-content a {
          color: #2563eb; /* Light mode text-blue-600 */
          text-decoration: underline;
          transition: color 0.3s ease;
        }
        .dark .story-content a {
          color: #3b82f6; /* Dark mode text-blue-500 */
        }
        .story-content a:hover {
          color: #1d4ed8; /* Light mode hover:text-blue-700 */
        }
        .dark .story-content a:hover {
          color: #60a5fa; /* Dark mode hover:text-blue-400 */
        }

        /* Strong text styling */
        .story-content strong {
          color: #111827; /* Light mode text-gray-900 */
          transition: color 0.5s ease;
        }
        .dark .story-content strong {
          color: #ffffff; /* Dark mode text-white */
        }

        /* Blockquote styling */
        .story-content blockquote {
          border-left: 4px solid #3b82f6; /* Blue border */
          font-style: italic;
          color: #4b5563; /* Light mode text-gray-600 */
          margin-bottom: 1.5rem;
          background: rgba(0, 0, 0, 0.03); /* Light mode subtle bg */
          padding: 1rem 1rem 1rem 1.25rem;
          border-radius: 0 0.5rem 0.5rem 0;
          transition: background-color 0.5s ease, color 0.5s ease;
        }
        .dark .story-content blockquote {
          color: #9ca3af; /* Dark mode text-gray-400 */
          background: rgba(255, 255, 255, 0.05); /* Dark mode subtle bg */
        }
      `}</style>
    </div>
  );
}
