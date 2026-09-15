// app/write-blog/page.js
"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";

// অরিজিনাল Quill এর সিএসএস ইম্পোর্ট
import 'quill/dist/quill.snow.css';

// কম্পোনেন্টের বাইরে হেল্পার ফাংশন রাখা হলো যাতে পেজ বারবার রেন্ডার না হয়
const compressImageHelper = (dataUrl, targetSizeKB = 100) => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
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

      while (sizeKB > targetSizeKB && quality > 0.1) {
        quality -= 0.1;
        resultDataUrl = canvas.toDataURL("image/jpeg", quality);
        sizeKB = Math.round((resultDataUrl.length * 3) / 4 / 1024);
      }
      resolve(resultDataUrl);
    };
  });
};

const dataURLtoFileHelper = (dataurl, filename) => {
  let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
  bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type:mime});
};

export default function WriteBlogPage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);
  
  // ফর্ম স্টেট
  const [title, setTitle] = useState("");
  const [coverImage, setCoverImage] = useState(null); 
  const [previewImg, setPreviewImg] = useState(null);

  // অরিজিনাল কুইলের জন্য Ref 
  const editorRef = useRef(null);
  const quillInstance = useRef(null);

  // তোমার সংরক্ষিত ImgBB API Key
  const IMGBB_API_KEY = "C8e142b508f46f59807dbb6a3a2ccb23";

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 });
    checkAuth();

    // 🔴 ভ্যানিলা কুইল ইনিশিয়ালাইজেশন (SSR এরর এবং মেমোরি ক্র্যাশ ঠেকাতে)
    if (typeof window !== "undefined" && !quillInstance.current && editorRef.current) {
      import("quill").then((QuillModule) => {
        const Quill = QuillModule.default;

        // ইনলাইন ইমেজের কাস্টম হ্যান্ডলার
        const imageHandler = () => {
          const input = document.createElement("input");
          input.setAttribute("type", "file");
          input.setAttribute("accept", "image/*");
          input.click();

          input.onchange = async () => {
            const file = input.files[0];
            if (file) {
              const quill = quillInstance.current;
              const range = quill.getSelection(true);
              quill.insertText(range.index, " (Uploading Image...) ", "user");

              try {
                const reader = new FileReader();
                reader.onload = async () => {
                  // ইনলাইন ছবি কম্প্রেস করা হচ্ছে
                  const compressedDataUrl = await compressImageHelper(reader.result, 100);
                  const finalFile = dataURLtoFileHelper(compressedDataUrl, "inline-image.jpg");

                  const formData = new FormData();
                  formData.append("image", finalFile);

                  // ImgBB তে সরাসরি আপলোড
                  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: "POST",
                    body: formData,
                  });
                  const data = await response.json();

                  quill.deleteText(range.index, 22);
                  if (data.success) {
                    quill.insertEmbed(range.index, "image", data.data.url);
                    quill.setSelection(range.index + 1);
                  } else {
                    alert("Image Upload Failed!");
                  }
                };
                reader.readAsDataURL(file);
              } catch (error) {
                quill.deleteText(range.index, 22);
                alert("Error: " + error.message);
              }
            }
          };
        };

        // কুইল সেটআপ
        quillInstance.current = new Quill(editorRef.current, {
          theme: "snow",
          placeholder: "আপনার অ্যাডভেঞ্চারের রোমাঞ্চকর অভিজ্ঞতা এখানে লিখুন...",
          modules: {
            toolbar: {
              container: [
                [{ 'header': [3, 4, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link', 'image'],
                ['clean']
              ],
              handlers: {
                image: imageHandler
              }
            }
          }
        });
      });
    }
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

  const handleCoverSelect = (e) => {
    e.preventDefault();
    const files = e.target.files;
    
    if (files && files.length > 0) {
      setImageProcessing(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const compressedDataUrl = await compressImageHelper(reader.result, 100);
        setPreviewImg(compressedDataUrl);
        const finalFile = dataURLtoFileHelper(compressedDataUrl, "cover-image.jpg");
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
    
    // ভ্যানিলা কুইল থেকে সরাসরি কনটেন্ট নেওয়া হচ্ছে (রিঅ্যাক্ট স্টেটের দরকার নেই!)
    const content = quillInstance.current ? quillInstance.current.root.innerHTML : "";
    
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
          alert("কভার ছবি আপলোডে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
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
      <i className="fa-solid fa-compass fa-spin text-4xl text-[#e76f51]"></i>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto glass-panel rounded-[2rem] p-6 sm:p-10 border border-white/10 relative overflow-hidden" data-aos="fade-up">
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#e76f51]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6 relative z-10">
          <Link href="/stories" className="text-gray-400 hover:text-white transition-colors w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-[#e76f51]/20">
            <i className="fa-solid fa-arrow-left"></i>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">আপনার অ্যাডভেঞ্চার শেয়ার করুন</h1>
            <p className="text-sm text-gray-400 mt-1">
              লেখক: <span className="text-[#e76f51] font-bold">{userProfile.full_name}</span> ({userProfile.department} - {userProfile.batch})
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          
          {/* Cover Photo */}
          <div data-aos="fade-up" data-aos-delay="100">
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">কভার ছবি (ঐচ্ছিক)</label>
            <div className="relative border-2 border-dashed border-white/20 hover:border-[#e76f51]/50 rounded-2xl overflow-hidden bg-black/40 transition-colors group cursor-pointer">
              {imageProcessing ? (
                <div className="w-full h-32 flex flex-col items-center justify-center text-[#e76f51]">
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
                <div className="w-full h-32 flex flex-col items-center justify-center text-gray-500 group-hover:text-[#e76f51] transition-colors">
                  <i className="fa-solid fa-image text-3xl mb-2"></i>
                  <span className="text-sm font-bold">ক্লিক করে কভার ছবি আপলোড করুন</span>
                  <span className="text-[10px] mt-1 text-gray-500">স্বয়ংক্রিয়ভাবে ১০০ কেবির নিচে অপটিমাইজ হয়ে যাবে</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleCoverSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
          </div>

          {/* Title */}
          <div data-aos="fade-up" data-aos-delay="200">
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">গল্পের শিরোনাম *</label>
            <input 
              type="text" 
              required 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="রোমাঞ্চকর কোনো শিরোনাম দিন..." 
              className="w-full text-lg sm:text-xl font-bold rounded-xl p-4 bg-black/40 border border-white/10 text-white focus:border-[#e76f51] outline-none transition-colors"
            />
          </div>

          {/* Vanilla Quill Editor Container */}
          <div data-aos="fade-up" data-aos-delay="300" className="write-blog-editor">
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">মূল গল্প (মাঝে ছবি দিতে Image আইকনে ক্লিক করুন) *</label>
            <div className="bg-black/40 rounded-xl border border-white/10 overflow-hidden relative">
              <div ref={editorRef} className="text-gray-200"></div>
            </div>
            
            <style jsx global>{`
              .write-blog-editor .ql-toolbar {
                background: rgba(255, 255, 255, 0.05);
                border: none;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                border-top-left-radius: 0.75rem;
                border-top-right-radius: 0.75rem;
              }
              .write-blog-editor .ql-container {
                border: none;
                min-height: 350px;
                font-size: 1.1rem;
                font-family: inherit;
              }
              .write-blog-editor .ql-editor {
                padding: 1.5rem;
              }
              .write-blog-editor .ql-editor p {
                margin-bottom: 1rem;
                line-height: 1.8;
              }
              .write-blog-editor .ql-editor img {
                border-radius: 12px;
                margin: 1.5rem auto;
                max-width: 100%;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                display: block;
              }
              .write-blog-editor .ql-stroke {
                stroke: #9ca3af;
              }
              .write-blog-editor .ql-fill {
                fill: #9ca3af;
              }
              .write-blog-editor .ql-toolbar button:hover .ql-stroke {
                stroke: #e76f51;
              }
              .write-blog-editor .ql-picker {
                color: #9ca3af;
              }
            `}</style>
          </div>

          <div className="pt-6 border-t border-white/10 flex justify-end" data-aos="fade-up" data-aos-delay="400">
            <button 
              type="submit" 
              disabled={loading || imageProcessing} 
              className="bg-[#e76f51] hover:bg-orange-600 text-white font-black text-lg py-4 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(231,111,81,0.4)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
              <span>{loading ? 'সাবমিট হচ্ছে...' : 'গল্পটি সাবমিট করুন'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
