// app/write-blog/page.js
"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import AOS from "aos";
import "aos/dist/aos.css";

import 'react-quill/dist/quill.snow.css'; 
import "cropperjs/dist/cropper.css";

// SSR ক্র্যাশ এড়াতে দুটোকেই ডায়নামিক ইম্পোর্ট করা হলো
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
const Cropper = dynamic(() => import("react-cropper"), { ssr: false });

// 🔴 ফিক্স: ইনফিনিট লুপ (Infinite Loop) এবং ব্রাউজার ক্র্যাশ ঠেকাতে 
// modules অবজেক্টটিকে মেইন কম্পোনেন্টের বাইরে বের করে আনা হয়েছে।
const modules = {
  toolbar: [
    [{ 'header': [3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link'],
    ['clean']
  ],
};

export default function WriteBlogPage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // ফর্ম স্টেট
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState(null); 
  const [previewImg, setPreviewImg] = useState(null);

  // ক্রপার স্টেট
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImage, setRawImage] = useState(null);
  const cropperRef = useRef(null);

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

  const handleImageSelect = (e) => {
    e.preventDefault();
    let files;
    if (e.dataTransfer) {
      files = e.dataTransfer.files;
    } else if (e.target) {
      files = e.target.files;
    }
    
    if (files && files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        setRawImage(reader.result);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(files[0]);
    }
  };

  const compressImage = (dataUrl, targetSizeKB = 100) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        let quality = 0.9;
        let resultDataUrl = canvas.toDataURL("image/jpeg", quality);
        
        let sizeKB = Math.round((resultDataUrl.length * 3) / 4 / 1024);

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

  const getCropData = async () => {
    if (typeof cropperRef.current?.cropper !== "undefined") {
      const croppedDataUrl = cropperRef.current?.cropper.getCroppedCanvas().toDataURL("image/jpeg");
      const compressedDataUrl = await compressImage(croppedDataUrl, 100);
      
      setPreviewImg(compressedDataUrl);
      const finalFile = dataURLtoFile(compressedDataUrl, "cover-image.jpg");
      setCoverImage(finalFile);
      setCropModalOpen(false);
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
    
    if (!title.trim() || !content.trim() || content === "<p><br></p>") {
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
          content: content,
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
              {previewImg ? (
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
                  <span className="text-[10px] mt-1 text-gray-500">ছবি অটোমেটিক ক্রপ ও ১০০ কেবির নিচে কম্প্রেস হয়ে যাবে</span>
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

          <div data-aos="fade-up" data-aos-delay="300" className="write-blog-editor">
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">গল্পের বিস্তারিত *</label>
            <div className="bg-black/40 rounded-xl border border-white/10 overflow-hidden">
              <ReactQuill 
                theme="snow" 
                value={content} 
                onChange={setContent} 
                modules={modules}
                placeholder="আপনার অ্যাডভেঞ্চারের রোমাঞ্চকর অভিজ্ঞতা এখানে লিখুন..."
                className="text-gray-200"
              />
            </div>
            <style jsx global>{`
              .write-blog-editor .ql-toolbar {
                background: rgba(255, 255, 255, 0.05);
                border: none;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
              }
              .write-blog-editor .ql-container {
                border: none;
                min-height: 300px;
                font-size: 1.1rem;
              }
              .write-blog-editor .ql-editor {
                padding: 1.5rem;
              }
              .write-blog-editor .ql-editor p {
                margin-bottom: 1rem;
                line-height: 1.8;
              }
              .write-blog-editor .ql-stroke {
                stroke: #9ca3af;
              }
              .write-blog-editor .ql-fill {
                fill: #9ca3af;
              }
              .write-blog-editor .ql-picker {
                color: #9ca3af;
              }
            `}</style>
          </div>

          <div className="pt-6 border-t border-white/10 flex justify-end" data-aos="fade-up" data-aos-delay="400">
            <button 
              type="submit" 
              disabled={loading} 
              className="bg-blue-500 hover:bg-blue-600 text-white font-black text-lg py-3 px-8 rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)] flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
              <span>{loading ? 'সাবমিট হচ্ছে...' : 'রিভিউর জন্য পাঠান'}</span>
            </button>
          </div>

        </form>
      </div>

      {/* Image Cropper Modal */}
      {cropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4">
          <div className="bg-[#0a1c13] border border-white/10 rounded-2xl p-6 w-full max-w-2xl relative shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><i className="fa-solid fa-crop text-blue-400"></i> ছবি ক্রপ করুন (ফ্রি সাইজ)</h3>
            <div className="w-full bg-black rounded-lg overflow-hidden h-[60vh]">
              <Cropper
                ref={cropperRef}
                style={{ height: "100%", width: "100%" }}
                zoomTo={0.5}
                preview=".img-preview"
                src={rawImage}
                viewMode={1}
                minCropBoxHeight={10}
                minCropBoxWidth={10}
                background={false}
                responsive={true}
                autoCropArea={1}
                checkOrientation={false} 
                guides={true}
              />
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button onClick={() => setCropModalOpen(false)} className="px-6 py-2 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors font-bold">
                ক্যান্সেল
              </button>
              <button onClick={getCropData} className="px-6 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all shadow-glow-blue">
                ক্রপ ও সেভ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
