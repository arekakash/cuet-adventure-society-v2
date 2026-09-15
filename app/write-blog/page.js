// app/write-blog/page.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";

export default function WriteBlogPage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);
  
  // ফর্ম স্টেট
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState(null); 
  const [previewImg, setPreviewImg] = useState(null);

  // তোমার সংরক্ষিত ImgBB API Key
  const IMGBB_API_KEY = "C8e142b508f46f59807dbb6a3a2ccb23";

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 });
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("গল্প লেখার আগে অনুগ্রহ করে লগইন করুন।");
      router.push("/login");
      return;
    }
    
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, department, batch')
      .eq('id', session.user.id)
      .single();
      
    if (data) setUserProfile(data);
  };

  // নেটিভ Canvas API ব্যবহার করে ছবি কম্প্রেস করার ফাংশন
  const compressImage = (dataUrl, targetSizeKB = 100) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // ম্যাক্সিমাম উইডথ 1200px রেখে প্রোপোরশনালি সাইজ কমানো
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.9;
        let resultDataUrl = canvas.toDataURL("image/jpeg", quality);
        let sizeKB = Math.round((resultDataUrl.length * 3) / 4 / 1024);

        // টার্গেট সাইজের নিচে না আসা পর্যন্ত কোয়ালিটি কমানো হবে
        while (sizeKB > targetSizeKB && quality > 0.1) {
          quality -= 0.1;
          resultDataUrl = canvas.toDataURL("image/jpeg", quality);
          sizeKB = Math.round((resultDataUrl.length * 3) / 4 / 1024);
        }
        resolve(resultDataUrl);
      };
    });
  };

  const dataURLtoFile = (dataurl, filename) => {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  };

  // ছবি সিলেক্ট করার সাথে সাথেই অটো কম্প্রেস হবে
  const handleImageSelect = (e) => {
    e.preventDefault();
    const files = e.target.files;
    
    if (files && files.length > 0) {
      setImageProcessing(true);
      const reader = new FileReader();
      reader.onload = async () => {
        // ১০০ কেবির নিচে কম্প্রেস করা হচ্ছে
        const compressedDataUrl = await compressImage(reader.result, 100);
        setPreviewImg(compressedDataUrl);
        const finalFile = dataURLtoFile(compressedDataUrl, "cover-image.jpg");
        setCoverImage(finalFile);
        setImageProcessing(false);
      };
      reader.readAsDataURL(files[0]);
    }
  };

  const uploadToImgBB = async (imageFile) => {
    const formData = new FormData();
    formData.append("image", imageFile);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        return data.data.url; 
      } else {
        throw new Error("ইমেজ আপলোড ফেইল করেছে!");
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      alert("দয়া করে গল্পের শিরোনাম এবং বিস্তারিত অংশ পূরণ করুন।");
      return;
    }

    setLoading(true);

    try {
      let finalImageUrl = "";
      
      if (coverImage) {
        finalImageUrl = await uploadToImgBB(coverImage);
        if (!finalImageUrl) {
          alert("ছবি আপলোডে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.from('stories').insert([
        {
          title: title,
          // লাইন ব্রেকগুলো HTML <br> এ কনভার্ট করে সেভ করা হচ্ছে
          content: content.replace(/\n/g, "<br />"),
          cover_image: finalImageUrl,
          author_id: userProfile.id,
          status: 'pending' 
        }
      ]);

      if (error) throw error;

      alert("আপনার গল্পটি সফলভাবে সাবমিট হয়েছে! অ্যাডমিন অ্যাপ্রুভ করার পর এটি পাবলিক স্টোরিজ পেজে দেখা যাবে।");
      router.push("/stories");

    } catch (error) {
      console.error(error);
      alert("গল্প সাবমিট করতে সমস্যা হয়েছে: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile) return (
    <div className="min-h-screen flex justify-center items-center bg-[#050b08]">
      <i className="fa-solid fa-compass fa-spin text-4xl text-blue-500"></i>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto glass-panel rounded-[2rem] p-6 sm:p-10 border border-white/10 relative overflow-hidden" data-aos="fade-up">
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6 relative z-10">
          <Link href="/stories" className="text-gray-400 hover:text-white transition-colors w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-blue-500/20">
            <i className="fa-solid fa-arrow-left"></i>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">নতুন গল্প লিখুন</h1>
            <p className="text-sm text-gray-400 mt-1">
              লেখক: <span className="text-blue-400 font-bold">{userProfile.full_name}</span> ({userProfile.department} - {userProfile.batch})
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          
          <div data-aos="fade-up" data-aos-delay="100">
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">কভার ছবি (ঐচ্ছিক)</label>
            <div className="relative border-2 border-dashed border-white/20 hover:border-blue-500/50 rounded-2xl overflow-hidden bg-black/40 transition-colors group">
              {imageProcessing ? (
                <div className="w-full h-32 flex flex-col items-center justify-center text-blue-400">
                  <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-2"></i>
                  <span className="text-sm font-bold">ছবি অপটিমাইজ হচ্ছে...</span>
                </div>
              ) : previewImg ? (
                <>
                  <img src={previewImg} alt="Cover Preview" className="w-full h-48 sm:h-64 object-cover opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white font-bold bg-black/60 px-4 py-2 rounded-lg backdrop-blur-sm"><i className="fa-solid fa-camera mr-2"></i> ছবি পরিবর্তন করুন</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-32 flex flex-col items-center justify-center text-gray-500 group-hover:text-blue-400 transition-colors">
                  <i className="fa-solid fa-image text-3xl mb-2"></i>
                  <span className="text-sm font-bold">ক্লিক করে ছবি আপলোড করুন</span>
                  <span className="text-[10px] mt-1 text-gray-500">স্বয়ংক্রিয়ভাবে ১০০ কেবির নিচে অপটিমাইজ হয়ে যাবে</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleImageSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
          </div>

          <div data-aos="fade-up" data-aos-delay="200">
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">গল্পের শিরোনাম *</label>
            <input 
              type="text" 
              required 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="রোমাঞ্চকর কোনো শিরোনাম দিন..." 
              className="w-full text-lg sm:text-xl font-bold rounded-xl p-4 bg-black/40 border border-white/10 text-white focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          <div data-aos="fade-up" data-aos-delay="300">
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">গল্পের বিস্তারিত *</label>
            <textarea 
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="আপনার অ্যাডভেঞ্চারের রোমাঞ্চকর অভিজ্ঞতা এখানে লিখুন... (প্যারাগ্রাফ করতে এন্টার চাপুন)"
              className="w-full min-h-[300px] text-base sm:text-lg leading-relaxed rounded-xl p-5 bg-black/40 border border-white/10 text-gray-200 focus:border-blue-500 outline-none transition-colors resize-y"
            ></textarea>
          </div>

          <div className="pt-6 border-t border-white/10 flex justify-end" data-aos="fade-up" data-aos-delay="400">
            <button 
              type="submit" 
              disabled={loading || imageProcessing} 
              className="bg-blue-500 hover:bg-blue-600 text-white font-black text-lg py-3 px-8 rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)] flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
              <span>{loading ? 'সাবমিট হচ্ছে...' : 'রিভিউর জন্য পাঠান'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
