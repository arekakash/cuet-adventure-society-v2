'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import AOS from 'aos'
import 'aos/dist/aos.css'
import Cropper from 'react-easy-crop'

// --- Helper function for Cropping ---
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => { resolve(blob) }, 'image/jpeg', 0.8)
  })
}

// --- Bank List ---
const BD_BANKS = [
  "DBBL (Dutch-Bangla Bank)", "BRAC Bank", "City Bank", "Islami Bank", 
  "EBL (Eastern Bank)", "Prime Bank", "Pubali Bank", "Mutual Trust Bank (MTB)", 
  "Southeast Bank", "Trust Bank", "NCC Bank", "UCBL", "Bank Asia", 
  "AB Bank", "National Bank", "Mercantile Bank", "IFIC Bank", "Jamuna Bank", 
  "Shahjalal Islami Bank", "Exim Bank", "Al-Arafah Islami Bank", "Premier Bank", 
  "Dhaka Bank", "Standard Chartered", "HSBC", "Sonali Bank", "Janata Bank", 
  "Agrani Bank", "Rupali Bank"
]

export default function StoreInventory() {
  const IMGBB_API_KEY = 'c8e142b508f46f59807dbb6a3a2ccb23';

  // ফর্ম স্টেট 
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'merch', 
    sale_price: '',
    rent_price: '',
    stock_quantity: '',
    sizesInput: '',
    colorsInput: '' 
  })
  
  const [paymentMethods, setPaymentMethods] = useState([])
  const [gallery, setGallery] = useState([]) 
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [currentImageSrc, setCurrentImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)

  const [variantStocks, setVariantStocks] = useState({})
  
  // 🔴 নতুন: ভিউ মোড এবং সিলেক্টেড আইটেম স্টেট
  const [viewMode, setViewMode] = useState('list') // 'list' or 'grid'
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [inventoryList, setInventoryList] = useState([])
  const [loadingList, setLoadingList] = useState(true)

  const availableColors = formData.colorsInput
    .split(',')
    .map(c => c.trim())
    .filter(c => c !== '')

  useEffect(() => {
    AOS.init({ once: true })
    fetchInventory()
  }, [])

  // ভ্যারিয়েশন ইনপুট দিলে ডায়নামিকভাবে স্টক ফিল্ড তৈরি করার লজিক
  useEffect(() => {
    const sizes = formData.sizesInput.split(',').map(s => s.trim()).filter(Boolean);
    const colors = formData.colorsInput.split(',').map(c => c.trim()).filter(Boolean);
    
    let combinations = [];
    if (sizes.length > 0 && colors.length > 0) {
      sizes.forEach(s => {
        colors.forEach(c => combinations.push(`${s} - ${c}`));
      });
    } else if (sizes.length > 0) {
      combinations = sizes;
    } else if (colors.length > 0) {
      combinations = colors;
    }

    if (combinations.length > 0) {
      setVariantStocks(prev => {
        const newStocks = {};
        let total = 0;
        combinations.forEach(combo => {
          newStocks[combo] = prev[combo] || 0;
          total += parseInt(newStocks[combo] || 0);
        });
        
        setFormData(f => ({ ...f, stock_quantity: total }));
        return newStocks;
      });
    } else {
      setVariantStocks({});
    }
  }, [formData.sizesInput, formData.colorsInput]);

  const fetchInventory = async () => {
    setLoadingList(true)
    const { data, error } = await supabase
      .from('store_products')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setInventoryList(data)
    setLoadingList(false)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (name === 'stock_quantity' && Object.keys(variantStocks).length > 0) return; 
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleVariantStockChange = (combo, value) => {
    const numValue = parseInt(value) || 0;
    setVariantStocks(prev => {
      const updated = { ...prev, [combo]: numValue };
      const total = Object.values(updated).reduce((acc, curr) => acc + (parseInt(curr) || 0), 0);
      setFormData(f => ({ ...f, stock_quantity: total }));
      return updated;
    });
  }

  // --- Payment Method Handlers ---
  const addPaymentMethod = () => {
    setPaymentMethods([...paymentMethods, { 
      id: Date.now(), 
      provider: 'bkash', 
      bankName: '', 
      accNo: '', 
      type: 'payment' 
    }])
  }

  const updatePaymentMethod = (id, field, value) => {
    setPaymentMethods(paymentMethods.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ))
  }

  const removePaymentMethod = (id) => {
    setPaymentMethods(paymentMethods.filter(p => p.id !== id))
  }

  // --- Image Selection & Cropping ---
  const onFileSelect = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const imageDataUrl = await readFile(file)
      setCurrentImageSrc(imageDataUrl)
      setCropModalOpen(true)
      e.target.value = '' 
    }
  }

  const readFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.addEventListener('load', () => resolve(reader.result), false)
      reader.readAsDataURL(file)
    })
  }

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCropSave = async () => {
    try {
      const croppedBlob = await getCroppedImg(currentImageSrc, croppedAreaPixels)
      const previewUrl = URL.createObjectURL(croppedBlob)
      
      setGallery([...gallery, { 
        id: Date.now(), 
        blob: croppedBlob, 
        preview: previewUrl, 
        color: '' 
      }])
      
      setCropModalOpen(false)
      setCurrentImageSrc(null)
    } catch (e) {
      console.error(e)
    }
  }

  const updateGalleryColor = (id, color) => {
    setGallery(gallery.map(img => img.id === id ? { ...img, color } : img))
  }

  const removeGalleryImage = (id) => {
    setGallery(gallery.filter(img => img.id !== id))
  }

  // --- Submit Handler ---
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (gallery.length === 0) {
      alert("কমপক্ষে একটি ছবি আপলোড করুন!")
      return
    }

    setIsSubmitting(true)
    setSubmitMessage('ছবিগুলো আপলোড হচ্ছে...')

    try {
      const uploadedImages = await Promise.all(gallery.map(async (img) => {
        const uploadData = new FormData()
        uploadData.append('image', img.blob)
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: uploadData
        })
        const result = await res.json()
        if (result.success) {
          return { url: result.data.url, color: img.color }
        }
        throw new Error('Image upload failed')
      }))

      setSubmitMessage('ডেটাবেসে সেভ হচ্ছে...')

      const parsedSizes = formData.sizesInput.split(',').map(s => s.trim()).filter(s => s !== '')
      const parsedColors = formData.colorsInput.split(',').map(s => s.trim()).filter(s => s !== '')

      const productData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : 0,
        rent_price: formData.category === 'gear' && formData.rent_price ? parseFloat(formData.rent_price) : 0,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        image_url: uploadedImages[0].url, 
        gallery: uploadedImages,          
        sizes: parsedSizes,               
        colors: parsedColors,             
        payment_methods: paymentMethods,  
        variant_stock: variantStocks      
      }

      const { error } = await supabase.from('store_products').insert([productData])
      if (error) throw error

      setSubmitMessage('✅ সফলভাবে স্টকে যুক্ত হয়েছে!')
      
      setTimeout(() => {
        setFormData({ name: '', description: '', category: 'merch', sale_price: '', rent_price: '', stock_quantity: '', sizesInput: '', colorsInput: '' })
        setPaymentMethods([])
        setGallery([])
        setVariantStocks({}) 
        setSubmitMessage('')
        fetchInventory() 
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT SIDE: UPLOAD FORM */}
          <div className="lg:col-span-7 bg-[#0a1c13] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative" data-aos="fade-right">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full pointer-events-none"></div>
            
            <h2 className="text-xl font-black text-white mb-6 uppercase tracking-wider border-b border-white/10 pb-4">
              <i className="fa-solid fa-cloud-arrow-up text-[#e76f51] mr-2"></i> নতুন আইটেম আপলোড
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Category Toggle */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">ক্যাটাগরি</label>
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
                  <label className="block text-xs font-bold text-gray-400 mb-2">
                    স্টক সংখ্যা {Object.keys(variantStocks).length > 0 ? '(Auto Total)' : '*'}
                  </label>
                  <input 
                    required 
                    type="number" 
                    min={Object.keys(variantStocks).length > 0 ? "0" : "1"} 
                    readOnly={Object.keys(variantStocks).length > 0}
                    name="stock_quantity" 
                    value={formData.stock_quantity} 
                    onChange={handleInputChange} 
                    className={`w-full border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors ${Object.keys(variantStocks).length > 0 ? 'bg-black/40 border-white/5 text-gray-400 cursor-not-allowed' : 'bg-white/5 border-white/10 focus:border-purple-500'}`} 
                    placeholder="0" 
                  />
                </div>
              </div>

              {/* Pricing */}
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

              {/* Sizes, Colors & Dynamic Variant Stocks */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-400 mb-2">সাইজ ভ্যারিয়েশন</label>
                    <input type="text" name="sizesInput" value={formData.sizesInput} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#e76f51] transition-colors text-sm" placeholder="M, L, XL, 40L" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-gray-400 mb-2">কালার ভ্যারিয়েশন</label>
                    <input type="text" name="colorsInput" value={formData.colorsInput} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors text-sm" placeholder="Black, Olive, Navy Blue" />
                  </div>
                  <p className="col-span-2 text-[10px] text-gray-500"><i className="fa-solid fa-circle-info mr-1"></i>একাধিক ভ্যারিয়েশন থাকলে কমা (,) দিয়ে লিখুন। না থাকলে ফাঁকা রাখুন।</p>
                </div>

                {Object.keys(variantStocks).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <label className="block text-xs font-bold text-[#e76f51] mb-3 uppercase tracking-widest"><i className="fa-solid fa-layer-group"></i> ভ্যারিয়েশন অনুযায়ী স্টক নির্ধারণ করুন</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.keys(variantStocks).map(combo => (
                        <div key={combo} className="bg-black/30 p-2 rounded-lg border border-white/5">
                          <label className="block text-[10px] text-gray-300 font-bold mb-1 truncate" title={combo}>{combo}</label>
                          <input 
                            type="number" 
                            min="0" 
                            required
                            value={variantStocks[combo]} 
                            onChange={(e) => handleVariantStockChange(combo, e.target.value)} 
                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white focus:outline-none focus:border-purple-500 transition-colors text-xs" 
                            placeholder="0" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Multiple Images & Color Mapping */}
              <div className="border border-white/10 rounded-2xl p-4 bg-black/20">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">পণ্যের ছবিসমূহ *</label>
                  <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                    <i className="fa-solid fa-plus mr-1"></i> ছবি যুক্ত করুন
                    <input type="file" accept="image/*" onChange={onFileSelect} className="hidden" />
                  </label>
                </div>
                
                {gallery.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {gallery.map(img => (
                      <div key={img.id} className="bg-white/5 rounded-xl p-2 border border-white/10 relative group">
                        <button type="button" onClick={() => removeGalleryImage(img.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg">
                          <i className="fa-solid fa-times"></i>
                        </button>
                        <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-black/50">
                          <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
                        </div>
                        {availableColors.length > 0 && (
                          <select 
                            value={img.color} 
                            onChange={(e) => updateGalleryColor(img.id, e.target.value)}
                            className="w-full bg-black/60 border border-white/20 text-white text-[10px] rounded p-1 outline-none focus:border-[#e76f51]"
                          >
                            <option value="">(কালার সিলেক্ট)</option>
                            {availableColors.map((c, i) => <option key={i} value={c}>{c}</option>)}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 opacity-50 border-2 border-dashed border-white/10 rounded-xl">
                    <i className="fa-regular fa-images text-3xl mb-2"></i>
                    <p className="text-xs">কোনো ছবি আপলোড করা হয়নি</p>
                  </div>
                )}
              </div>

              {/* Advanced Payment Methods Integration */}
              <div className="border border-white/10 rounded-2xl p-5 bg-gradient-to-br from-white/5 to-transparent">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><i className="fa-solid fa-wallet text-emerald-400"></i> পেমেন্ট মেথড</h3>
                    <p className="text-[10px] text-gray-400 mt-1">ইউজাররা কীভাবে পেমেন্ট করবে তা নির্ধারণ করুন</p>
                  </div>
                  <button type="button" onClick={addPaymentMethod} className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-emerald-500/30">
                    <i className="fa-solid fa-plus mr-1"></i> মেথড যুক্ত করুন
                  </button>
                </div>

                {paymentMethods.length > 0 ? (
                  <div className="space-y-3">
                    {paymentMethods.map((pm, index) => (
                      <div key={pm.id} className="bg-black/40 border border-white/10 rounded-xl p-3 sm:p-4 relative flex flex-col gap-3">
                        <button type="button" onClick={() => removePaymentMethod(pm.id)} className="absolute top-3 right-3 text-red-400 hover:text-red-300 transition-colors">
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                          <div>
                            <label className="block text-[10px] text-gray-400 mb-1">প্লাটফর্ম</label>
                            <select value={pm.provider} onChange={(e) => updatePaymentMethod(pm.id, 'provider', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-xs outline-none">
                              <option value="bkash">বিকাশ (bKash)</option>
                              <option value="nagad">নগদ (Nagad)</option>
                              <option value="rocket">রকেট (Rocket)</option>
                              <option value="bank">ব্যাংক ট্রান্সফার</option>
                            </select>
                          </div>
                          
                          {pm.provider === 'bank' && (
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">ব্যাংক সিলেক্ট করুন</label>
                              <select value={pm.bankName} onChange={(e) => updatePaymentMethod(pm.id, 'bankName', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-xs outline-none">
                                <option value="">ব্যাংক নির্বাচন করুন...</option>
                                {BD_BANKS.map((b, i) => <option key={i} value={b}>{b}</option>)}
                              </select>
                            </div>
                          )}

                          <div className={pm.provider !== 'bank' ? 'sm:col-span-1' : 'sm:col-span-2'}>
                            <label className="block text-[10px] text-gray-400 mb-1">অ্যাকাউন্ট নম্বর / বিবরণ</label>
                            <input type="text" value={pm.accNo} onChange={(e) => updatePaymentMethod(pm.id, 'accNo', e.target.value)} placeholder="017XXXXXXX / Acc No." className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-xs outline-none" />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-gray-400 mb-1">ট্রানজেকশন টাইপ</label>
                            <div className="flex gap-4">
                              <label className="text-xs text-gray-300 flex items-center gap-1.5 cursor-pointer">
                                <input type="radio" checked={pm.type === 'send_money'} onChange={() => updatePaymentMethod(pm.id, 'type', 'send_money')} className="accent-[#e76f51]" /> Send Money
                              </label>
                              <label className="text-xs text-gray-300 flex items-center gap-1.5 cursor-pointer">
                                <input type="radio" checked={pm.type === 'payment'} onChange={() => updatePaymentMethod(pm.id, 'type', 'payment')} className="accent-[#e76f51]" /> Payment / Transfer
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic text-center py-2">কোনো পেমেন্ট মেথড যুক্ত করা হয়নি।</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2">বিস্তারিত বিবরণ</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#e76f51] transition-colors resize-none" placeholder="পণ্যটি সম্পর্কে বিস্তারিত লিখুন..."></textarea>
              </div>

              {/* Submit Button */}
              <button disabled={isSubmitting} type="submit" className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-xl flex justify-center items-center gap-3 ${isSubmitting ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-[#e76f51] hover:bg-orange-600 text-white hover:shadow-[0_0_20px_rgba(231,111,81,0.4)]'}`}>
                {isSubmitting ? <><i className="fa-solid fa-spinner fa-spin"></i> প্রসেসিং হচ্ছে...</> : <><i className="fa-solid fa-upload"></i> ইনভেন্টরিতে যুক্ত করুন</>}
              </button>
              
              {submitMessage && (
                <div className={`p-3 rounded-lg text-center text-sm font-bold border ${submitMessage.includes('✅') ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  {submitMessage}
                </div>
              )}
            </form>
          </div>

          {/* RIGHT SIDE: CURRENT INVENTORY LIST */}
          <div className="lg:col-span-5 bg-[#0a1c13] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col h-[800px] lg:sticky lg:top-24" data-aos="fade-left">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-xl font-black text-white uppercase tracking-wider">
                <i className="fa-solid fa-warehouse text-emerald-400 mr-2"></i> বর্তমান স্টক
              </h2>
              {/* 🔴 নতুন: List/Grid View Toggle */}
              <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>
                  <i className="fa-solid fa-list"></i>
                </button>
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>
                  <i className="fa-solid fa-grid-2"></i>
                </button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
              {loadingList ? (
                <div className="flex justify-center items-center py-20">
                  <i className="fa-solid fa-circle-notch fa-spin text-3xl text-emerald-400"></i>
                </div>
              ) : inventoryList.length > 0 ? (
                <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-4" : "space-y-4"}>
                  {inventoryList.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedInventoryItem(item)}
                      className={`bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 hover:bg-white/10 transition-colors group cursor-pointer ${viewMode === 'grid' ? 'flex flex-col' : 'flex items-start gap-4'}`}
                    >
                      <div className={`bg-black/40 rounded-lg p-1 flex items-center justify-center border border-white/5 shrink-0 ${viewMode === 'grid' ? 'w-full h-32 mb-3' : 'w-16 h-16'}`}>
                        <img src={item.image_url} alt={item.name} className="max-w-full max-h-full object-contain rounded" />
                      </div>
                      <div className={`flex-grow min-w-0 ${viewMode === 'grid' ? 'w-full' : ''}`}>
                        <div className={`flex justify-between items-start mb-1 ${viewMode === 'grid' ? 'flex-col gap-1' : ''}`}>
                          <h4 className="text-sm font-bold text-white truncate pr-2 group-hover:text-[#e76f51] transition-colors">{item.name}</h4>
                          <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-black tracking-widest flex-shrink-0 ${item.category === 'merch' ? 'bg-[#e76f51]/20 text-[#e76f51] border border-[#e76f51]/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                            {item.category}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-1.5">
                          {item.sizes && item.sizes.length > 0 && (
                            <div className="text-[10px] text-gray-400">
                              <i className="fa-solid fa-ruler mr-1"></i> {item.sizes.join(', ')}
                            </div>
                          )}
                          {item.colors && item.colors.length > 0 && (
                            <div className="text-[10px] text-gray-400">
                              <i className="fa-solid fa-palette mr-1"></i> {item.colors.join(', ')}
                            </div>
                          )}
                        </div>

                        <div className={`flex items-center gap-3 mt-2 pt-2 border-t border-white/5 text-xs ${viewMode === 'grid' ? 'justify-between' : ''}`}>
                          <span className="text-gray-400"><i className="fa-solid fa-boxes-stacked mr-1"></i> স্টক: <strong className={item.stock_quantity > 0 ? 'text-white' : 'text-red-400'}>{item.stock_quantity}</strong></span>
                          {item.sale_price > 0 && <span className="text-gray-400"><i className="fa-solid fa-tag mr-1"></i> ৳{item.sale_price}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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

      {/* 🔴 নতুন: Selected Item / Variant Stock Details Modal */}
      {selectedInventoryItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedInventoryItem(null)}></div>
          <div className="bg-[#0a1c13] rounded-3xl w-full max-w-md overflow-hidden border border-[#e76f51]/30 shadow-2xl flex flex-col relative z-10 animate-[zoomIn_0.2s_ease-out]">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
              <h3 className="text-white font-bold truncate pr-4">{selectedInventoryItem.name}</h3>
              <button onClick={() => setSelectedInventoryItem(null)} className="text-gray-400 hover:text-white transition-colors">
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-24 h-24 bg-black/40 rounded-xl p-2 border border-white/5 flex items-center justify-center shrink-0">
                  <img src={selectedInventoryItem.image_url} alt="" className="max-w-full max-h-full object-contain" />
                </div>
                <div>
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-black tracking-widest ${selectedInventoryItem.category === 'merch' ? 'bg-[#e76f51]/20 text-[#e76f51] border border-[#e76f51]/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                    {selectedInventoryItem.category}
                  </span>
                  <p className="text-white font-black mt-2 text-xl">মোট স্টক: {selectedInventoryItem.stock_quantity}</p>
                </div>
              </div>

              <h4 className="text-xs font-bold text-[#e76f51] mb-3 uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-layer-group"></i> ভ্যারিয়েশন অনুযায়ী স্টক
              </h4>
              
              {selectedInventoryItem.variant_stock && Object.keys(selectedInventoryItem.variant_stock).length > 0 ? (
                <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {Object.entries(selectedInventoryItem.variant_stock).map(([variant, stock]) => (
                    <div key={variant} className={`p-3 rounded-lg border ${stock > 0 ? 'bg-white/5 border-white/10' : 'bg-red-500/5 border-red-500/20 opacity-60'}`}>
                      <p className="text-[10px] text-gray-400 font-bold mb-1 truncate" title={variant}>{variant}</p>
                      <p className={`text-lg font-black ${stock > 0 ? 'text-white' : 'text-red-400'}`}>{stock}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-black/20 rounded-xl border border-white/5">
                  <i className="fa-solid fa-box-open text-2xl text-gray-600 mb-2"></i>
                  <p className="text-sm text-gray-500">এই আইটেমে কোনো নির্দিষ্ট ভ্যারিয়েশন সেট করা নেই।</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      {cropModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <div className="bg-[#0a1c13] rounded-3xl w-full max-w-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col h-[80vh] max-h-[600px] relative z-10">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
              <h3 className="text-white font-bold"><i className="fa-solid fa-crop-simple mr-2"></i> ছবি ক্রপ করুন</h3>
              <button onClick={() => {setCropModalOpen(false); setCurrentImageSrc(null)}} className="text-gray-400 hover:text-white transition-colors">
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="relative flex-grow bg-black">
              <Cropper
                image={currentImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1} // 1:1 Square aspect ratio
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="p-4 bg-black/40 border-t border-white/10 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="w-full sm:w-1/2 flex items-center gap-2">
                <i className="fa-solid fa-magnifying-glass-minus text-gray-400"></i>
                <input 
                  type="range" min={1} max={3} step={0.1} value={zoom} 
                  onChange={(e) => setZoom(e.target.value)} 
                  className="w-full accent-[#e76f51]"
                />
                <i className="fa-solid fa-magnifying-glass-plus text-gray-400"></i>
              </div>
              <button onClick={handleCropSave} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-xl font-bold transition-colors">
                <i className="fa-solid fa-check mr-2"></i> ক্রপ সেভ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  )
}
