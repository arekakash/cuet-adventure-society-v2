'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// 🟢 Image Compression Helper (Max 80KB)
const compressImageTo80KB = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // রেজোলিউশন কমানো (Max Width/Height: 800px)
        let width = img.width;
        let height = img.height;
        const maxSize = 800;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        let quality = 0.8; // প্রাথমিক কোয়ালিটি
        
        // রিকার্সিভ ফাংশন: সাইজ ৮০ কেবির নিচে না আসা পর্যন্ত কোয়ালিটি কমাবে
        const compress = () => {
          canvas.toBlob((blob) => {
            if (blob.size <= 80000 || quality <= 0.1) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              quality -= 0.1;
              compress();
            }
          }, 'image/jpeg', quality);
        };
        compress();
      };
    };
  });
};

export default function BroadcastPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [admin, setAdmin] = useState(null)
  
  // All Users and Filtered Users
  const [allUsers, setAllUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])

  // Filters State
  const [filters, setFilters] = useState({
    batch: '',
    department: '',
    gender: '',
    blood_group: '',
    has_bicycle: '',
    swimming_skill: ''
  })

  // Message States
  const [message, setMessage] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [statusText, setStatusText] = useState('')

  useEffect(() => {
    const initAdminAndUsers = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Admin verification
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (profile?.role !== 'admin') {
        alert("Access Denied!")
        router.push('/dashboard')
        return
      }
      setAdmin(profile)

      // Fetch ALL users for frontend filtering
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, full_name, batch, department, gender, blood_group, has_bicycle, swimming_skill')
        .neq('id', profile.id) // নিজেকে বাদে
      
      if (!error && users) {
        setAllUsers(users)
        setFilteredUsers(users)
      }
      setLoading(false)
    }

    initAdminAndUsers()
  }, [router])

  // 🟢 Handle Filtering Dynamically
  useEffect(() => {
    let result = allUsers;

    if (filters.batch) result = result.filter(u => u.batch?.toString() === filters.batch);
    if (filters.department) result = result.filter(u => u.department?.toUpperCase() === filters.department.toUpperCase());
    if (filters.gender) result = result.filter(u => u.gender === filters.gender);
    if (filters.blood_group) result = result.filter(u => u.blood_group === filters.blood_group);
    if (filters.has_bicycle) result = result.filter(u => u.has_bicycle === filters.has_bicycle);
    if (filters.swimming_skill) result = result.filter(u => u.swimming_skill === filters.swimming_skill);

    setFilteredUsers(result);
  }, [filters, allUsers])

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value })
  }

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setStatusText('ছবি কম্প্রেস করা হচ্ছে (Max 80KB)...')
      const compressedFile = await compressImageTo80KB(file);
      setImageFile(compressedFile);
      setImagePreview(URL.createObjectURL(compressedFile));
      setStatusText(`কম্প্রেসড সাইজ: ${(compressedFile.size / 1024).toFixed(2)} KB`);
    }
  }

  // 🟢 Send Broadcast Message
  const handleSendBroadcast = async () => {
    if (!message.trim() && !imageFile) {
      alert("দয়া করে মেসেজ অথবা একটি ছবি যুক্ত করুন।");
      return;
    }
    if (filteredUsers.length === 0) {
      alert("মেসেজ পাঠানোর জন্য কোনো ইউজার পাওয়া যায়নি!");
      return;
    }

    setIsSending(true);
    try {
      let uploadedImageUrl = null;

      // ১. ImgBB তে ছবি আপলোড (যদি থাকে)
      if (imageFile) {
        setStatusText('ছবি সার্ভারে আপলোড হচ্ছে...');
        const formData = new FormData();
        formData.append('image', imageFile);
        
        // 🔴 Your ImgBB API Key
        const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=c8e142b508f46f59807dbb6a3a2ccb23`, {
          method: 'POST',
          body: formData
        });
        const imgbbData = await imgbbRes.json();
        
        if (imgbbData.success) {
          uploadedImageUrl = imgbbData.data.url;
        } else {
          throw new Error("ছবি আপলোড ব্যর্থ হয়েছে!");
        }
      }

      setStatusText(`মেসেজ পাঠানো হচ্ছে ${filteredUsers.length} জনের কাছে...`);

      // ২. সবার জন্য মেসেজ অবজেক্ট তৈরি
      const messagesToInsert = filteredUsers.map(user => ({
        sender_id: admin.id,
        receiver_id: user.id,
        content: message.trim(),
        message_type: 'broadcast', // 🔴 ব্রডকাস্ট টাইপ
        metadata: uploadedImageUrl ? { image_url: uploadedImageUrl, is_broadcast: true } : { is_broadcast: true },
        is_read: false
      }));

      // ৩. 500 করে চাঙ্ক (Chunk) করে ডেটাবেসে পুশ করা (লিমিট এড়াতে)
      const chunkSize = 500;
      for (let i = 0; i < messagesToInsert.length; i += chunkSize) {
        const chunk = messagesToInsert.slice(i, i + chunkSize);
        const { error } = await supabase.from('cas_messages').insert(chunk);
        if (error) throw error;
      }

      alert("✅ ব্রডকাস্ট মেসেজ সফলভাবে পাঠানো হয়েছে!");
      
      // ক্লিয়ার স্টেট
      setMessage('');
      setImageFile(null);
      setImagePreview(null);
      setStatusText('');
      
    } catch (error) {
      alert("❌ মেসেজ পাঠাতে সমস্যা হয়েছে: " + error.message);
    } finally {
      setIsSending(false);
    }
  }

  // Generate Dropdown Options
  const years = Array.from({ length: 2050 - 1968 + 1 }, (_, i) => 2050 - i)
  const departments = ['CE', 'EEE', 'ME', 'CSE', 'URP', 'ARCH', 'PME', 'ETE', 'MIE', 'WRE', 'BME', 'MSE']

  if (loading) {
    return <div className="min-h-screen bg-[#050b08] flex items-center justify-center"><i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#e76f51]"></i></div>
  }

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <i className="fa-solid fa-bullhorn text-pink-400"></i> ব্রডকাস্ট ও অ্যানাউন্সমেন্ট
            </h1>
            <p className="text-gray-400 text-sm mt-1">কাস্টম ফিল্টার ব্যবহার করে নির্দিষ্ট ইউজারদের কাছে মেসেজ বা ছবি পাঠান।</p>
          </div>
          <Link href="/admin" className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl transition-colors font-bold text-sm">
            <i className="fa-solid fa-arrow-left mr-2"></i>ড্যাশবোর্ড
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: Filters */}
          <div className="lg:col-span-1 bg-[#0a1c13] border border-white/10 rounded-3xl p-6 shadow-xl h-fit">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
              <i className="fa-solid fa-filter text-[#e76f51]"></i> টার্গেট অডিয়েন্স ফিল্টার
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">ডিপার্টমেন্ট</label>
                <select name="department" value={filters.department} onChange={handleFilterChange} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#e76f51]">
                  <option value="">সকল ডিপার্টমেন্ট</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">ব্যাচ</label>
                <select name="batch" value={filters.batch} onChange={handleFilterChange} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#e76f51]">
                  <option value="">সকল ব্যাচ</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">জেন্ডার</label>
                <select name="gender" value={filters.gender} onChange={handleFilterChange} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#e76f51]">
                  <option value="">উভয় (Male & Female)</option>
                  <option value="Male">শুধু ছাত্র (Male)</option>
                  <option value="Female">শুধু ছাত্রী (Female)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">রক্তের গ্রুপ</label>
                <select name="blood_group" value={filters.blood_group} onChange={handleFilterChange} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#e76f51]">
                  <option value="">সকল গ্রুপ</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">সাইকেল আছে?</label>
                <select name="has_bicycle" value={filters.has_bicycle} onChange={handleFilterChange} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#e76f51]">
                  <option value="">যেকোনো</option>
                  <option value="Yes">হ্যাঁ, আছে</option>
                  <option value="No">না, নেই</option>
                </select>
              </div>

              <div className="pt-2 border-t border-white/5 text-center">
                <button 
                  onClick={() => setFilters({ batch: '', department: '', gender: '', blood_group: '', has_bicycle: '', swimming_skill: '' })}
                  className="text-xs text-red-400 hover:text-white transition-colors"
                >
                  <i className="fa-solid fa-rotate-right mr-1"></i> ফিল্টার ক্লিয়ার করুন
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Message Composer */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Count Card */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-3xl p-6 shadow-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-300 font-bold uppercase tracking-widest mb-1">টার্গেটেড অডিয়েন্স</p>
                <h2 className="text-3xl font-black text-white">{filteredUsers.length} <span className="text-lg font-medium text-gray-400">জন ইউজার</span></h2>
                <p className="text-[10px] text-gray-400 mt-1">আপনার মেসেজটি ইনবক্সের মাধ্যমে এদের কাছে যাবে।</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50">
                <i className="fa-solid fa-users text-2xl text-blue-400"></i>
              </div>
            </div>

            {/* Composer Box */}
            <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-6 shadow-xl">
              
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-300 mb-2 block"><i className="fa-solid fa-pen-nib mr-1 text-[#e76f51]"></i> মেসেজ কনটেন্ট</label>
                <textarea 
                  rows="5" 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="এখানে আপনার অ্যানাউন্সমেন্ট লিখুন..." 
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-pink-500 transition-colors resize-none"
                ></textarea>
              </div>

              <div className="mb-6">
                <label className="text-xs font-bold text-gray-300 mb-2 block"><i className="fa-solid fa-image mr-1 text-emerald-400"></i> ছবি যুক্ত করুন (ঐচ্ছিক)</label>
                
                <div className="flex items-start gap-4">
                  <label className="cursor-pointer bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-xl px-4 py-6 flex flex-col items-center justify-center text-center transition-colors w-32 h-32 shrink-0">
                    <i className="fa-solid fa-cloud-arrow-up text-2xl text-gray-400 mb-2"></i>
                    <span className="text-[10px] font-bold text-gray-300">Upload Image</span>
                    <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  </label>

                  {imagePreview && (
                    <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-white/10 shrink-0">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button onClick={() => {setImageFile(null); setImagePreview(null); setStatusText('');}} className="absolute top-1 right-1 bg-black/60 text-white w-6 h-6 rounded-full text-xs hover:bg-red-500 transition-colors">
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col justify-center">
                    <p className="text-[10px] text-gray-400 max-w-xs leading-relaxed">
                      ছবি সিলেক্ট করলে সেটি অটোমেটিক কম্প্রেস হয়ে <strong className="text-white">৮০ কেবির</strong> নিচে চলে আসবে, যাতে ইউজারদের লোড হতে সুবিধা হয়।
                    </p>
                    {statusText && <p className="text-xs font-bold text-pink-400 mt-2 animate-pulse">{statusText}</p>}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSendBroadcast}
                disabled={isSending || filteredUsers.length === 0}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all flex justify-center items-center gap-2 ${isSending ? 'bg-gray-600 text-gray-400 cursor-wait' : 'bg-[#e76f51] hover:bg-orange-600 text-white shadow-glow'}`}
              >
                {isSending ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> প্রসেস হচ্ছে...</>
                ) : (
                  <><i className="fa-solid fa-paper-plane"></i> ব্রডকাস্ট মেসেজ পাঠান</>
                )}
              </button>

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
