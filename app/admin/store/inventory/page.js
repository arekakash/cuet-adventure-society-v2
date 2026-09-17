'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import AOS from 'aos'
import 'aos/dist/aos.css'

export default function StoreInventory() {
  // গ্লোবাল ImgBB API Key
  const IMGBB_API_KEY = 'c8e142b508f46f59807dbb6a3a2ccb23';

  // ফর্ম স্টেট (sizesInput নামে নতুন স্ট্রিং যুক্ত করা হয়েছে)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'merch', 
    sale_price: '',
    rent_price: '',
    stock_quantity: '',
    sizesInput: '' // 🔴 ডায়নামিক সাইজ ইনপুট
  })
  
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  // ইনভেন্টরি লিস্ট স্টেট
  const [inventoryList, setInventoryList] = useState([])
  const [loadingList, setLoadingList] = useState(true)

  useEffect(() => {
    AOS.init({ once: true })
    fetchInventory()
  }, [])

  // ডেটাবেস থেকে বর্তমান স্টক ফেচ করা
  const fetchInventory = async () => {
    setLoadingList(true)
    const { data, error } = await supabase
      .from('store_products')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setInventoryList(data)
    setLoadingList(false)
  }

  // ইনপুট হ্যান্ডলার
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // ছবি সিলেক্ট ও প্রিভিউ লজিক
  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  // Canvas API দিয়ে ক্লায়েন্ট সাইড ইমেজ কম্প্রেশন
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target.result
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 800
          const scaleSize = MAX_WIDTH / img.width
          canvas.width = MAX_WIDTH
          canvas.height = img.height * scaleSize
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          canvas.toBlob((blob) => {
            resolve(blob)
          }, 'image/jpeg', 0.8)
        }
      }
    })
  }

  // প্রোডাক্ট সেভ করার মাস্টার ফাংশন
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitMessage('ছবি প্রসেসিং এবং আপলোড হচ্ছে...')

    try {
      let finalImageUrl = null

      // ১. ছবি আপলোড (ImgBB)
      if (imageFile) {
        const compressedBlob = await compressImage(imageFile)
        const uploadData = new FormData()
        uploadData.append('image', compressedBlob)

        const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: uploadData
        })
        const imgbbResult = await imgbbRes.json()
        if (imgbbResult.success) {
          finalImageUrl = imgbbResult.data.url
        } else {
          throw new Error('Image upload failed')
        }
      }

      setSubmitMessage('ডেটাবেসে সেভ হচ্ছে...')

      // 🔴 কমা দিয়ে লেখা সাইজগুলোকে Array তে কনভার্ট করা
      const parsedSizes = formData.sizesInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== '')

      // ২. সুপাবেস ডেটাবেসে ইনসার্ট
      const productData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : 0,
        rent_price: formData.category === 'gear' && formData.rent_price ? parseFloat(formData.rent_price) : 0,
        stock_quantity: parseInt(formData.stock_quantity),
        image_url: finalImageUrl,
        sizes: parsedSizes // 🔴 কনভার্ট করা Array এখানে সেভ হবে
      }

      const { error } = await supabase.from('store_products').insert([productData])

      if (error) throw error

      setSubmitMessage('✅ সফলভাবে স্টকে যুক্ত হয়েছে!')
      
      // ফর্ম রিসেট ও স্টক রিফ্রেশ
      setTimeout(() => {
        setFormData({ name: '', description: '', category: 'merch', sale_price: '', rent_price: '', stock_quantity: '', sizesInput: '' })
        setImageFile(null)
        setImagePreview(null)
        setSubmitMessage('')
        fetchInventory() // রিফ্রেশ লিস্ট
      }, 2000)

    } catch (error) {
      console.error(error)
      setSubmitMessage('❌ আপলোড ফেইল হয়েছে। আবার চেষ্টা করুন।')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 relative">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="glass-panel rounded-3xl p-6 mb-8 flex justify-between items-center bg-[#0a1c13] border border-white/10" data-aos="fade-down">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <i className="fa-solid fa-boxes-stacked text-purple-400"></i> ইনভেন্টরি ম্যানেজমেন্ট
            </h1>
            <p className="text-sm text-gray-400 mt-1">স্টোরে নতুন আইটেম যুক্ত করুন এবং বর্তমান স্টক মনিটর করুন।</p>
          </div>
          <Link href="/admin" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2">
            <i className="fa-solid fa-arrow-left"></i> অ্যাডমিন হাব
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT SIDE: UPLOAD FORM */}
          <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative" data-aos="fade-right">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full pointer-events-none"></div>
            
            <h2 className="text-xl font-black text-white mb-6 uppercase tracking-wider border-b border-white/10 pb-4">
              <i className="fa-solid fa-cloud-arrow-up text-[#e76f51] mr-2"></i> নতুন আইটেম আপলোড
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Category Toggle */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">ক্যাটাগরি সিলেক্ট করুন</label>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                  <button type="button" onClick={() => setFormData({...formData, category: 'merch'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.category === 'merch' ? 'bg-[#e76f51] text-white shadow-glow' : 'text-gray-400 hover:text-white'}`}>
                    <i className="fa-solid fa-shirt mr-1"></i> মার্চেন্ডাইজ
                  </button>
                  <button type="button" onClick={() => setFormData({...formData, category: 'gear'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.category === 'gear' ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-gray-400 hover:text-white'}`}>
                    <i className="fa-solid fa-campground mr-1"></i> অ্যাডভেঞ্চার গিয়ার
                  </button>
                </div>
              </div>

              {/* Name & Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 mb-2">আইটেমের নাম *</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#e76f51] transition-colors" placeholder="যেমন: CAS Official T-Shirt" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-400 mb-2">স্টক সংখ্যা (Quantity) *</label>
                  <input required type="number" min="1" name="stock_quantity" value={formData.stock_quantity} onChange={handleInputChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors" placeholder="0" />
                </div>
              </div>

              {/* Dynamic Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div className={formData.category === 'gear' ? 'col-span-1' : 'col-span-2'}>
                  <label className="block text-xs font-bold text-gray-400 mb-2">বিক্রয় মূল্য (৳) {formData.category === 'merch' && '*'}</label>
                  <input required={formData.category === 'merch'} type="number" name="sale_price" value={formData.sale_price} onChange={handleInputChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#e76f51] transition-colors" placeholder="0.00" />
                </div>
                {formData.category === 'gear' && (
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-gray-400 mb-2">ভাড়ার মূল্য / দিন (৳)</label>
                    <input type="number" name="rent_price" value={formData.rent_price} onChange={handleInputChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors" placeholder="0.00" />
                  </div>
                )}
              </div>

              {/* 🔴 Dynamic Sizes/Variants (Universal for both Merch & Gear) */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2">সাইজ বা ভ্যারিয়েশন (ঐচ্ছিক)</label>
                <input 
                  type="text" 
                  name="sizesInput" 
                  value={formData.sizesInput} 
                  onChange={handleInputChange} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#e76f51] transition-colors" 
                  placeholder="যেমন: M, L, XL অথবা 39, 40, 42 অথবা 40L, 60L" 
                />
                <p className="text-[10px] text-gray-500 mt-1"><i className="fa-solid fa-circle-info mr-1"></i>একাধিক সাইজ থাকলে কমা (,) দিয়ে লিখুন। সাইজ না থাকলে ফাঁকা রাখুন।</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2">বিস্তারিত বিবরণ</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#e76f51] transition-colors resize-none" placeholder="পণ্যটি সম্পর্কে লিখুন..."></textarea>
              </div>

              {/* Image Upload Area */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2">হাই-রেজোলিউশন ছবি *</label>
                <div className="relative w-full h-40 bg-white/5 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center hover:border-[#e76f51] transition-colors overflow-hidden group">
                  <input required type="file" accept="image/*" onChange={handleImageSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-contain p-2 z-10" />
                  ) : (
                    <div className="text-center z-10 pointer-events-none">
                      <i className="fa-solid fa-cloud-arrow-up text-3xl text-gray-400 group-hover:text-[#e76f51] transition-colors mb-2"></i>
                      <p className="text-sm font-bold text-gray-400">ছবি সিলেক্ট করতে ক্লিক করুন</p>
                      <p className="text-[10px] text-gray-500 mt-1">অটোমেটিক কম্প্রেস করা হবে</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button & Messages */}
              <button disabled={isSubmitting} type="submit" className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-xl flex justify-center items-center gap-3 ${isSubmitting ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]'}`}>
                {isSubmitting ? <><i className="fa-solid fa-spinner fa-spin"></i> প্রসেসিং হচ্ছে...</> : <><i className="fa-solid fa-upload"></i> ইনভেন্টরিতে যুক্ত করুন</>}
              </button>
              
              {submitMessage && (
                <div className={`p-3 rounded-lg text-center text-sm font-bold border ${submitMessage.includes('✅') ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : (submitMessage.includes('❌') ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400')}`}>
                  {submitMessage}
                </div>
              )}
            </form>
          </div>

          {/* RIGHT SIDE: CURRENT INVENTORY LIST */}
          <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col h-full" data-aos="fade-left">
            <h2 className="text-xl font-black text-white mb-6 uppercase tracking-wider border-b border-white/10 pb-4">
              <i className="fa-solid fa-warehouse text-emerald-400 mr-2"></i> বর্তমান স্টক
            </h2>

            <div className="flex-grow overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {loadingList ? (
                <div className="flex justify-center items-center py-20">
                  <i className="fa-solid fa-circle-notch fa-spin text-3xl text-emerald-400"></i>
                </div>
              ) : inventoryList.length > 0 ? (
                inventoryList.map(item => (
                  <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 flex items-center gap-4 hover:bg-white/10 transition-colors group">
                    <div className="w-16 h-16 bg-black/40 rounded-lg flex-shrink-0 p-1 flex items-center justify-center">
                      <img src={item.image_url} alt={item.name} className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-sm font-bold text-white truncate pr-2 group-hover:text-[#e76f51] transition-colors">{item.name}</h4>
                        <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-black tracking-widest flex-shrink-0 ${item.category === 'merch' ? 'bg-[#e76f51]/20 text-[#e76f51] border border-[#e76f51]/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                          {item.category}
                        </span>
                      </div>
                      
                      {/* 🔴 ডায়নামিক সাইজ রেন্ডারিং */}
                      {item.sizes && item.sizes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 mb-1">
                          {item.sizes.map((size, idx) => (
                            <span key={idx} className="text-[8px] font-bold bg-white/10 text-gray-300 px-1.5 py-0.5 rounded">
                              {size}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className="text-gray-400"><i className="fa-solid fa-boxes-stacked mr-1"></i> স্টক: <strong className={item.stock_quantity > 0 ? 'text-white' : 'text-red-400'}>{item.stock_quantity}</strong></span>
                        {item.sale_price > 0 && <span className="text-gray-400"><i className="fa-solid fa-tag mr-1"></i> ৳{item.sale_price}</span>}
                        {item.rent_price > 0 && <span className="text-emerald-400"><i className="fa-solid fa-clock mr-1"></i> ৳{item.rent_price}/দিন</span>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 opacity-50">
                  <i className="fa-solid fa-box-open text-5xl mb-4 text-gray-500"></i>
                  <p className="text-sm text-gray-400">ইনভেন্টরিতে কোনো আইটেম নেই।</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  )
}
