'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// SSR এরর এড়াতে ReactQuill কে ডায়নামিক ইমপোর্ট করা হলো
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

import Cropper from 'react-cropper'
import 'cropperjs/dist/cropper.css'

// তোমার ImgBB API Key এখানে বসাও
const IMGBB_API_KEY = 'c8e142b508f46f59807dbb6a3a2ccb23' 

export default function WriteBlog() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userProfile, setUserProfile] = useState(null)

  // ফর্ম স্টেট
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  
  // কভার ছবি ও ক্রপ স্টেট
  const [imageFile, setImageFile] = useState(null)
  const [cropperModal, setCropperModal] = useState(false)
  const [cropper, setCropper] = useState(null)
  const [finalCoverBase64, setFinalCoverBase64] = useState('')

  const quillRef = useRef(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        
      if (profile) {
        setUserProfile(profile)
      }
      setLoading(false)
    }
    fetchUser()
  }, [router])

  // =======================================
  // ইমেজ ক্রপিং এবং 100 KB তে কম্প্রেশন লজিক
  // =======================================
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setImageFile(reader.result)
        setCropperModal(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const compressImageTo100KB = (base64Str) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.src = base64Str
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)

        let quality = 0.9
        let compressedStr = canvas.toDataURL('image/jpeg', quality)
        
        // 100KB এর কাছাকাছি আনতে কোয়ালিটি কমানো (100KB = ~137000 Base64 length)
        while (compressedStr.length > 137000 && quality > 0.1) {
          quality -= 0.1
          compressedStr = canvas.toDataURL('image/jpeg', quality)
        }
        resolve(compressedStr)
      }
    })
  }

  const handleCrop = async () => {
    if (typeof cropper !== 'undefined' && cropper !== null) {
      // 1. ক্রপ করা ইমেজ Base64 হিসেবে নেওয়া
      const croppedDataUrl = cropper.getCroppedCanvas().toDataURL('image/jpeg', 0.9)
      
      // 2. সেটিকে 100 KB এর ভেতর কম্প্রেস করা
      const compressedImage = await compressImageTo100KB(croppedDataUrl)
      
      setFinalCoverBase64(compressedImage)
      setCropperModal(false)
    }
  }

  // =======================================
  // React Quill (Editor) ImgBB Upload Logic
  // =======================================
  const imageHandler = () => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    input.click()

    input.onchange = async () => {
      const file = input.files[0]
      if (file) {
        const quill = quillRef.current.getEditor()
        const range = quill.getSelection()
        quill.insertText(range.index, " (ছবি আপলোড হচ্ছে...) ", "user")

        try {
          const formData = new FormData()
          formData.append('image', file)
          
          const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
          })
          
          const data = await res.json()
          quill.deleteText(range.index, 21) // " (ছবি আপলোড হচ্ছে...) " মুছে ফেলা
          
          if (data.success) {
            quill.insertEmbed(range.index, 'image', data.data.url)
          } else {
            alert('ইমেজ আপলোড ফেইল করেছে!')
          }
        } catch (err) {
          quill.deleteText(range.index, 21)
          alert('সমস্যা হয়েছে: ' + err.message)
        }
      }
    }
  }

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: { image: imageHandler }
    }
  }), [])

  // =======================================
  // ফাইনাল সাবমিশন
  // =======================================
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!finalCoverBase64) {
      alert("অনুগ্রহ করে একটি কভার ছবি আপলোড করুন।")
      return
    }
    if (content.length < 20) {
      alert("গল্পের মূল লেখা খুব ছোট! দয়া করে বিস্তারিত লিখুন।")
      return
    }

    setSubmitting(true)
    try {
      // 1. প্রথমে কম্প্রেস করা কভার ছবি ImgBB তে আপলোড করা
      // (Base64 এর সামনের "data:image/jpeg;base64," অংশটুকু কেটে ফেলা)
      const base64Data = finalCoverBase64.split(',')[1] 
      const imgFormData = new FormData()
      imgFormData.append('image', base64Data)

      const imgRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: imgFormData
      })
      const imgData = await imgRes.json()
      if (!imgData.success) throw new Error("কভার ছবি আপলোড ফেইল করেছে!")
      
      const coverUrl = imgData.data.url

      // 2. অ্যাডমিন হলে সরাসরি পাবলিশ, সাধারণ ইউজার হলে পেন্ডিং
      const publishStatus = userProfile.role === 'admin' ? 'approved' : 'pending'
      const authorBatchStr = userProfile.department && userProfile.batch 
                             ? `${userProfile.department} '${String(userProfile.batch).slice(-2)}` 
                             : 'Explorer'

      const { error } = await supabase.from('stories').insert([{
        title: title,
        excerpt: excerpt,
        content: content,
        cover_photo: coverUrl,
        author_id: userProfile.id,
        author_name: userProfile.full_name,
        author_batch: authorBatchStr,
        author_photo: userProfile.photo_url,
        status: publishStatus
      }])

      if (error) throw error

      if (publishStatus === 'approved') {
        alert("অ্যাডমিন হিসেবে আপনার গল্প সরাসরি পাবলিশ হয়েছে!")
        router.push('/stories') // এই পেজটি আমরা নেক্সট ধাপে বানাবো
      } else {
        alert("গল্প সফলভাবে জমা হয়েছে! অ্যাডমিন অ্যাপ্রুভ করলে লাইভ হবে।")
        router.push('/dashboard')
      }

    } catch (err) {
      alert("সাবমিট করতে সমস্যা হয়েছে: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b08] flex items-center justify-center">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#e76f51]"></i>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 relative text-gray-300">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard" className="text-gray-400 hover:text-[#e76f51] bg-white/5 p-3 rounded-xl transition-colors flex items-center gap-2 text-sm font-bold">
            <i className="fa-solid fa-arrow-left"></i> ড্যাশবোর্ড
          </Link>
          <h2 className="font-black text-white text-xl flex items-center gap-2">
            <i className="fa-solid fa-pen-nib text-[#e76f51]"></i> নতুন গল্প লিখুন
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#0a1c13] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl">
            
          <div className="text-center mb-10 border-b border-white/10 pb-8">
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">আপনার অ্যাডভেঞ্চার শেয়ার করুন</h1>
              <p className="text-sm text-gray-400">লেখা জমা দেওয়ার পর অ্যাডমিন রিভিউ করে পাবলিশ করবে।</p>
          </div>

          <div className="space-y-8">
              
              {/* কভার ছবি */}
              <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">কভার ফটো (ফ্রি-সাইজ ক্রপিং) *</label>
                  <div className="relative w-full h-48 sm:h-64 rounded-2xl border-2 border-dashed border-gray-600 overflow-hidden group hover:border-[#e76f51] transition-colors cursor-pointer bg-black/20 flex items-center justify-center">
                      {finalCoverBase64 ? (
                        <img src={finalCoverBase64} className="absolute inset-0 w-full h-full object-cover" alt="Cover" />
                      ) : (
                        <div className="text-center p-6 relative z-10 pointer-events-none">
                            <i className="fa-solid fa-image text-4xl text-gray-500 mb-3 group-hover:text-[#e76f51] transition-colors"></i>
                            <p className="text-sm font-bold text-gray-400 group-hover:text-white">ক্লিক করে ছবি নির্বাচন করুন</p>
                        </div>
                      )}
                      <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                  </div>
              </div>

              {/* টাইটেল ও এক্সারপ্ট */}
              <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">গল্পের শিরোনাম *</label>
                  <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="যেমন: মেঘের দেশে তিন দিন..." className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-lg font-bold outline-none focus:border-[#e76f51] text-white" />
              </div>

              <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">ছোট্ট সারাংশ (Excerpt) *</label>
                  <textarea required value={excerpt} onChange={e => setExcerpt(e.target.value)} rows="2" maxLength="150" placeholder="গল্পের মূল আকর্ষণটুকু ১-২ লাইনে লিখুন..." className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm resize-none outline-none focus:border-[#e76f51] text-white"></textarea>
              </div>

              {/* রিচ টেক্সট এডিটর */}
              <div className="quill-dark-wrapper">
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">মূল গল্প (ছবি দিতে Image আইকনে ক্লিক করুন) *</label>
                  <div className="bg-black/30 border border-white/10 rounded-xl overflow-hidden">
                    <ReactQuill 
                      ref={quillRef}
                      theme="snow" 
                      value={content} 
                      onChange={setContent} 
                      modules={modules}
                      placeholder="আপনার চমৎকার অ্যাডভেঞ্চার এখানে লিখুন..."
                    />
                  </div>
              </div>

              {/* লেখকের তথ্য */}
              <div className="pt-6 border-t border-white/10">
                  <h3 className="text-sm font-black text-white mb-4 uppercase tracking-widest">লেখকের তথ্য (স্বয়ংক্রিয়ভাবে সংযুক্ত)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">আপনার নাম</label>
                          <input type="text" value={userProfile?.full_name || ''} readOnly className="w-full bg-black/20 border border-white/5 p-3 rounded-xl text-sm opacity-70 cursor-not-allowed text-white" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">ডিপার্টমেন্ট ও ব্যাচ</label>
                          <input type="text" value={`${userProfile?.department || ''} '${String(userProfile?.batch || '').slice(-2)}`} readOnly className="w-full bg-black/20 border border-white/5 p-3 rounded-xl text-sm opacity-70 cursor-not-allowed text-white" />
                      </div>
                  </div>
              </div>

              {/* সাবমিট বাটন */}
              <div className="pt-8">
                  <button type="submit" disabled={submitting} className="w-full bg-[#e76f51] hover:bg-orange-600 text-white font-black text-lg py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(231,111,81,0.4)] flex items-center justify-center gap-2 hover:-translate-y-1">
                      {submitting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
                      <span>{submitting ? 'আপলোড হচ্ছে...' : 'গল্পটি সাবমিট করুন'}</span>
                  </button>
              </div>
          </div>
        </form>

      </div>

      {/* কাস্টম ক্রপার মডাল */}
      {cropperModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setCropperModal(false)}></div>
          <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-6 w-full max-w-2xl relative z-10 shadow-2xl">
            <h3 className="text-xl font-black text-white mb-4">কভার ছবি ক্রপ করুন</h3>
            <div className="w-full bg-black overflow-hidden rounded-xl" style={{ maxHeight: '60vh' }}>
              <Cropper
                src={imageFile}
                style={{ height: 400, width: '100%' }}
                initialAspectRatio={NaN} // Free-size cropping (No strict aspect ratio)
                guides={true}
                viewMode={1}
                onInitialized={(instance) => setCropper(instance)}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setCropperModal(false)} className="px-6 py-2 rounded-xl text-gray-400 hover:text-white font-bold transition-colors">বাতিল</button>
              <button onClick={handleCrop} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-glow flex items-center gap-2">
                <i className="fa-solid fa-compress"></i> ক্রপ ও কম্প্রেস করুন (100KB)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quill Editor Dark Theme Overrides */}
      <style jsx global>{`
        .quill-dark-wrapper .ql-toolbar.ql-snow { border-color: rgba(255,255,255,0.1); background: rgba(0,0,0,0.5); border-top-left-radius: 0.75rem; border-top-right-radius: 0.75rem; }
        .quill-dark-wrapper .ql-container.ql-snow { border-color: rgba(255,255,255,0.1); background: transparent; border-bottom-left-radius: 0.75rem; border-bottom-right-radius: 0.75rem; min-height: 250px; color: #f3f4f6; font-size: 1rem;}
        .quill-dark-wrapper .ql-editor img { border-radius: 10px; margin: 10px auto; max-width: 100%; box-shadow: 0 5px 15px rgba(0,0,0,0.5); }
        .quill-dark-wrapper .ql-snow .ql-stroke { stroke: #e5e7eb; }
        .quill-dark-wrapper .ql-snow .ql-fill { fill: #e5e7eb; }
        .quill-dark-wrapper .ql-snow.ql-toolbar button:hover .ql-stroke { stroke: #e76f51; }
      `}</style>

    </div>
  )
}
