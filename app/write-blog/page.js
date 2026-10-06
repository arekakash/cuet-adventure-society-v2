// app/write-blog/page.js
"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import AOS from "aos";
import "aos/dist/aos.css";

// হেল্পার ফাংশন (কম্প্রেস এবং ফাইল কনভার্ট)
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
  
  const [title, setTitle] = useState("");
  const [coverImage, setCoverImage] = useState(null); 
  const [previewImg, setPreviewImg] = useState(null);

  const quillInstance = useRef(null);

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

  const initQuill = () => {
    if (window.Quill && !quillInstance.current) {
      
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
                const compressedDataUrl = await compressImageHelper(reader.result, 100);
                const finalFile = dataURLtoFileHelper(compressedDataUrl, "inline-image.jpg");

                const formData = new FormData();
                formData.append("image", finalFile);

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

      quillInstance.current = new window.Quill('#editor-container', {
        theme: 'snow',
        placeholder: 'আপনার অ্যাডভেঞ্চারের রোমাঞ্চকর অভিজ্ঞতা এখানে লিখুন...',
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
    }
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
    <div className="min-h-screen flex justify-center items-center bg-pastel-bg dark:bg-darkForest transition-colors duration-500">
      <i className="fa-solid fa-compass fa-spin text-4xl text-campfire"></i>
    </div>
  );

  return (
    <div className="min-h-screen bg-pastel-bg dark:bg-darkForest pt-24 pb-12 px-4 sm:px-6 lg:px-8 transition-colors duration-500">
      
      <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet" />
      <Script 
        src="https://cdn.quilljs.com/1.3.6/quill.min.js" 
        strategy="afterInteractive" 
        onLoad={initQuill} 
      />

      <div className="max-w-4xl mx-auto bg-white/90 dark:bg-black/40 backdrop-blur-xl rounded-[2rem] p-6 sm:p-10 border border-gray-200 dark:border-white/10 relative overflow-hidden shadow-soft dark:shadow-2xl transition-colors duration-500" data-aos="fade-up">
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-100 dark:bg-campfire/10 rounded-full blur-3xl pointer-events-none transition-colors"></div>

        <div className="flex items-center gap-4 mb-8 border-b border-gray-200 dark:border-white/10 pb-6 relative z-10 transition-colors">
          <Link href="/stories" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 hover:bg-orange-50 dark:hover:bg-campfire/20 shadow-sm dark:shadow-none">
            <i className="fa-solid fa-arrow-left"></i>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white transition-colors">আপনার অ্যাডভেঞ্চার শেয়ার করুন</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors">
              লেখক: <span className="text-campfire font-bold">{userProfile.full_name}</span> ({userProfile.department} - {userProfile.batch})
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          
          <div data-aos="fade-up" data-aos-delay="100">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider transition-colors">কভার ছবি (ঐচ্ছিক)</label>
            <div className="relative border-2 border-dashed border-gray-300 dark:border-white/20 hover:border-campfire/50 dark:hover:border-campfire/50 rounded-2xl overflow-hidden bg-gray-50 dark:bg-black/40 transition-colors group cursor-pointer shadow-inner dark:shadow-none">
              {imageProcessing ? (
                <div className="w-full h-32 flex flex-col items-center justify-center text-campfire">
                  <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-2"></i>
                  <span className="text-sm font-bold">ছবি অপটিমাইজ হচ্ছে...</span>
                </div>
              ) : previewImg ? (
                <>
                  <img src={previewImg} alt="Cover Preview" className="w-full h-48 sm:h-64 object-cover opacity-90 dark:opacity-80 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 dark:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white font-bold bg-black/50 dark:bg-black/60 px-4 py-2 rounded-lg backdrop-blur-sm shadow-md"><i className="fa-solid fa-camera mr-2"></i> ছবি পরিবর্তন করুন</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-32 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 group-hover:text-campfire transition-colors">
                  <i className="fa-solid fa-image text-3xl mb-2"></i>
                  <span className="text-sm font-bold">ক্লিক করে কভার ছবি আপলোড করুন</span>
                  <span className="text-[10px] mt-1 text-gray-500">স্বয়ংক্রিয়ভাবে ১০০ কেবির নিচে অপটিমাইজ হয়ে যাবে</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleCoverSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
          </div>

          <div data-aos="fade-up" data-aos-delay="200">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider transition-colors">গল্পের শিরোনাম *</label>
            <input 
              type="text" 
              required 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="রোমাঞ্চকর কোনো শিরোনাম দিন..." 
              className="w-full text-lg sm:text-xl font-bold rounded-xl p-4 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:border-campfire outline-none transition-colors shadow-inner dark:shadow-none"
            />
          </div>

          <div data-aos="fade-up" data-aos-delay="300" className="write-blog-editor">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider transition-colors">মূল গল্প (মাঝে ছবি দিতে Image আইকনে ক্লিক করুন) *</label>
            
            <div className="bg-gray-50 dark:bg-black/40 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden relative transition-colors shadow-inner dark:shadow-none">
              <div id="editor-container" className="text-gray-800 dark:text-gray-200 transition-colors"></div>
            </div>
            
            {/* 🔴 Quill Editor Light/Dark Mode Supported CSS */}
            <style jsx global>{`
              .write-blog-editor .ql-toolbar {
                background: rgba(0, 0, 0, 0.03);
                border: none;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                border-top-left-radius: 0.75rem;
                border-top-right-radius: 0.75rem;
                transition: background-color 0.5s ease, border-color 0.5s ease;
              }
              .dark .write-blog-editor .ql-toolbar {
                background: rgba(255, 255, 255, 0.05);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                display: block;
                transition: box-shadow 0.5s ease;
              }
              .dark .write-blog-editor .ql-editor img {
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
              }
              
              /* Toolbar Icons Coloring */
              .write-blog-editor .ql-stroke {
                stroke: #4b5563; /* Light mode text-gray-600 */
                transition: stroke 0.3s ease;
              }
              .dark .write-blog-editor .ql-stroke {
                stroke: #9ca3af; /* Dark mode text-gray-400 */
              }
              
              .write-blog-editor .ql-fill {
                fill: #4b5563;
                transition: fill 0.3s ease;
              }
              .dark .write-blog-editor .ql-fill {
                fill: #9ca3af;
              }
              
              /* Hover state for icons */
              .write-blog-editor .ql-toolbar button:hover .ql-stroke,
              .write-blog-editor .ql-toolbar button.ql-active .ql-stroke {
                stroke: #e76f51; /* Brand color */
              }
              .write-blog-editor .ql-toolbar button:hover .ql-fill,
              .write-blog-editor .ql-toolbar button.ql-active .ql-fill {
                fill: #e76f51;
              }
              
              .write-blog-editor .ql-picker {
                color: #4b5563;
                transition: color 0.3s ease;
              }
              .dark .write-blog-editor .ql-picker {
                color: #9ca3af;
              }
            `}</style>
          </div>

          <div className="pt-6 border-t border-gray-200 dark:border-white/10 flex justify-end transition-colors" data-aos="fade-up" data-aos-delay="400">
            <button 
              type="submit" 
              disabled={loading || imageProcessing} 
              className="bg-campfire hover:bg-orange-600 text-white font-black text-lg py-4 px-8 rounded-xl transition-all shadow-md dark:shadow-glow flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto hover:-translate-y-1"
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
