'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AOS from 'aos'
import 'aos/dist/aos.css'

export default function BloodBankPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [donors, setDonors] = useState([])
  const [bloodCounts, setBloodCounts] = useState({})
  
  // States for Tabs (Knowledge Hub)
  const [activeTab, setActiveTab] = useState('why')

  // Search & Filter States
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL')
  const [onlyAvailable, setOnlyAvailable] = useState(false)

  // Emotional Blackmail Modal State for Toggle
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Emergency SOS Modal State
  const [showSosModal, setShowSosModal] = useState(false)
  const [sosData, setSosData] = useState({ bloodGroup: 'A+', hospital: '', details: '' })
  const [isSendingSos, setIsSendingSos] = useState(false)

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

  useEffect(() => {
    AOS.init({ once: true, offset: 50 })
    fetchBloodBankData()
  }, [])

  const fetchBloodBankData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, blood_group, is_donor, last_donation_date')
          .eq('id', session.user.id)
          .single()
        setCurrentUser(profile)
      }

      // Fetch all donors (is_donor = true)
      const { data: donorList, error } = await supabase
        .from('profiles')
        .select('id, full_name, batch, department, blood_group, is_donor, last_donation_date, total_donations, phone')
        .eq('is_donor', true)

      if (error) throw error

      setDonors(donorList || [])

      // Calculate counts per blood group
      const counts = {}
      bloodGroups.forEach(bg => {
        counts[bg] = (donorList || []).filter(d => d.blood_group === bg && isEligible(d.last_donation_date)).length
      })
      setBloodCounts(counts)

    } catch (err) {
      console.error("Blood bank fetch error:", err.message)
    } finally {
      setLoading(false)
    }
  }

  // Helper: 120 Days (4 months) eligibility check
  const isEligible = (lastDate) => {
    if (!lastDate) return true
    const diffTime = Math.abs(new Date() - new Date(lastDate))
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays >= 120
  }

  // Handle User's Donor Status Toggle with "Emotional Blackmail"
  const handleToggleAttempt = (currentStatus) => {
    if (currentStatus === true) {
      // If currently TRUE and trying to turn OFF -> Trigger Emotional Warning Modal
      setShowWarningModal(true)
    } else {
      // If turning ON -> Direct update
      updateDonorStatus(true)
    }
  }

  const updateDonorStatus = async (status) => {
    if (!currentUser) return
    setIsUpdatingStatus(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_donor: status })
        .eq('id', currentUser.id)

      if (error) throw error

      setCurrentUser(prev => ({ ...prev, is_donor: status }))
      setShowWarningModal(false)
      fetchBloodBankData()
      alert(status ? "🎉 ধন্যবাদ! আপনি আবার আমাদের সুপারহিরো ডোনার লিস্টে যুক্ত হলেন।" : "স্ট্যাটাস পরিবর্তন করা হয়েছে।");
    } catch (err) {
      alert("স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Handle Direct Peer-to-Peer Message via Global Inbox
  const handleStartChatWithDonor = async (donor) => {
    if (!currentUser) {
      alert("মেসেজ পাঠানোর জন্য অনুগ্রহ করে লগইন করুন!");
      router.push('/login');
      return;
    }
    if (currentUser.id === donor.id) {
      alert("এটি আপনার নিজের প্রোফাইল!");
      return;
    }

    try {
      // Insert an automated inquiry message to create/open the chat room in cas_messages
      const { error } = await supabase.from('cas_messages').insert([{
        sender_id: currentUser.id,
        receiver_id: donor.id,
        content: `আসসালামু আলাইকুম! জরুরি রক্তের প্রয়োজনে আপনার সাথে যোগাযোগ করছি।`,
        message_type: 'text'
      }])

      if (error) throw error;
      router.push('/dashboard/inbox');
    } catch (err) {
      alert("চ্যাট শুরু করতে সমস্যা হয়েছে: " + err.message);
    }
  }

  // Handle Emergency SOS Broadcast to all eligible donors of that group
  const handleSendSos = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert("ઇমার্জেন্সি রিকোয়েস্ট পাঠাতে লগইন করুন!");
      router.push('/login');
      return;
    }

    setIsSendingSos(true);
    try {
      // Find all eligible donors for the requested blood group
      const targetDonors = donors.filter(d => d.blood_group === sosData.bloodGroup && isEligible(d.last_donation_date) && d.id !== currentUser.id);

      if (targetDonors.length === 0) {
        alert("দুঃখিত, এই মুহূর্তে এই গ্রুপের কোনো সক্রিয় ডোনার পাওয়া যায়নি!");
        setIsSendingSos(false);
        return;
      }

      const sosMessage = `🚨 জরুরী রক্তের আবেদন! 🚨\nগ্রুপ: ${sosData.bloodGroup}\nহাসপাতাল/লোকেশন: ${sosData.hospital}\nবিস্তারিত: ${sosData.details}\nদয়া করে দ্রুত যোগাযোগ করুন।`;

      const messagesToInsert = targetDonors.map(donor => ({
        sender_id: currentUser.id,
        receiver_id: donor.id,
        content: sosMessage,
        message_type: 'broadcast',
        metadata: { is_sos: true }
      }));

      const { error } = await supabase.from('cas_messages').insert(messagesToInsert);
      if (error) throw error;

      alert(`✅ সফল! ${targetDonors.length} জন যোগ্য ডোনারের ইনবক্সে ইমার্জেন্সি অ্যালার্ট পাঠানো হয়েছে।`);
      setShowSosModal(false);
      setSosData({ bloodGroup: 'A+', hospital: '', details: '' });
    } catch (err) {
      alert("এসওএস পাঠাতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setIsSendingSos(false);
    }
  }

  // Filtered Donors List
  const filteredDonors = donors.filter(d => {
    if (selectedGroupFilter !== 'ALL' && d.blood_group !== selectedGroupFilter) return false;
    if (onlyAvailable && !isEligible(d.last_donation_date)) return false;
    return true;
  });

  if (loading) {
    return <div className="min-h-screen bg-[#050b08] flex items-center justify-center"><i className="fa-solid fa-droplet fa-spin text-4xl text-red-500"></i></div>
  }

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 relative text-gray-300">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* HEADER & EMERGENCY SOS BANNER */}
        <div className="text-center bg-gradient-to-b from-red-950/40 to-[#0a1c13] border border-red-500/30 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden" data-aos="fade-down">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent pointer-events-none"></div>
          
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4 border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            <i className="fa-solid fa-droplet text-3xl text-red-500 animate-pulse"></i>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight">
            সিএএস <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-400">ব্লাড ব্যাংক</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            চুয়েটিয়ানদের নিয়ে গঠিত আমাদের নিরাপদ ও নির্ভরযোগ্য রক্তের বন্ধন। আপনার এক ফোঁটা রক্ত ফিরিয়ে দিতে পারে একটি অমূল্য জীবন।
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => setShowSosModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(220,38,38,0.5)] flex items-center gap-3 hover:scale-105"
            >
              <i className="fa-solid fa-bullhorn animate-bounce"></i> ইমার্জেন্সি ব্লাড রিকোয়েস্ট (SOS)
            </button>
          </div>
        </div>

        {/* 1. TOP SECTION: LIVE INVENTORY & COMFORT ZONE */}
        <div className="space-y-6" data-aos="fade-up">
          <div className="flex justify-between items-end border-b border-white/10 pb-3">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <i className="fa-solid fa-chart-pie text-emerald-400"></i> লাইভ ব্লাড স্টক প্রিভিউ
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">বর্তমানে যারা রক্ত দেওয়ার জন্য সম্পূর্ণ প্রস্তুত (১২০ দিন অতিক্রমকারী)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {bloodGroups.map(bg => (
              <div 
                key={bg} 
                onClick={() => setSelectedGroupFilter(selectedGroupFilter === bg ? 'ALL' : bg)}
                className={`bg-[#0a1c13] border p-4 rounded-2xl text-center cursor-pointer transition-all hover:-translate-y-1 ${selectedGroupFilter === bg ? 'border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-white/10 hover:border-white/30'}`}
              >
                <span className="text-xl font-black text-white block mb-1">{bg}</span>
                <span className="text-2xl font-black text-emerald-400">{bloodCounts[bg] || 0}</span>
                <span className="text-[9px] text-gray-500 uppercase tracking-widest block mt-1">জন প্রস্তুত</span>
              </div>
            ))}
          </div>
        </div>

        {/* USER DONOR STATUS TOGGLE BAR (OPT-OUT STRATEGY) */}
        {currentUser && (
          <div className="bg-[#0a1c13] border border-white/10 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl" data-aos="fade-up">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${currentUser.is_donor ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-red-500/20 border-red-500/50 text-red-400'}`}>
                <i className={`fa-solid ${currentUser.is_donor ? 'fa-shield-heart text-xl' : 'fa-triangle-exclamation text-xl'}`}></i>
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">আপনার ডোনার স্ট্যাটাস: <span className={currentUser.is_donor ? 'text-emerald-400' : 'text-red-400'}>{currentUser.is_donor ? 'সক্রিয় (সুপারহিরো)' : 'নিষ্ক্রিয়'}</span></h4>
                <p className="text-xs text-gray-400 mt-0.5">আপনি ডিফল্টভাবে আমাদের ডোনার তালিকায় যুক্ত আছেন।</p>
              </div>
            </div>

            <button 
              disabled={isUpdatingStatus}
              onClick={() => handleToggleAttempt(currentUser.is_donor)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${currentUser.is_donor ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg'}`}
            >
              {isUpdatingStatus ? <i className="fa-solid fa-spinner fa-spin"></i> : (currentUser.is_donor ? 'স্ট্যাটাস বন্ধ করতে চান?' : 'ডোনার হিসেবে যুক্ত হোন')}
            </button>
          </div>
        )}

        {/* 2. MIDDLE SECTION: KNOWLEDGE HUB (3 MOTIVATIONAL TABS) */}
        <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl" data-aos="fade-up">
          <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
            <i className="fa-solid fa-book-medical text-[#e76f51]"></i> রক্তদান জ্ঞান ও অনুপ্রেরণা
          </h3>

          {/* 3 Interactive Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <button 
              onClick={() => setActiveTab('why')}
              className={`p-4 rounded-2xl font-bold text-xs sm:text-sm text-left transition-all border ${activeTab === 'why' ? 'bg-[#e76f51]/20 border-[#e76f51] text-white shadow-glow' : 'bg-black/40 border-white/5 text-gray-400 hover:bg-white/5'}`}
            >
              <i className="fa-solid fa-heart-pulse text-[#e76f51] mr-2 text-base"></i> ১. কেন রক্ত দেব? (মাহাত্ম্য)
            </button>

            <button 
              onClick={() => setActiveTab('eligibility')}
              className={`p-4 rounded-2xl font-bold text-xs sm:text-sm text-left transition-all border ${activeTab === 'eligibility' ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-black/40 border-white/5 text-gray-400 hover:bg-white/5'}`}
            >
              <i className="fa-solid fa-user-check text-emerald-400 mr-2 text-base"></i> ২. আমার যোগ্যতা (প্রস্তুত?)
            </button>

            <button 
              onClick={() => setActiveTab('restrictions')}
              className={`p-4 rounded-2xl font-bold text-xs sm:text-sm text-left transition-all border ${activeTab === 'restrictions' ? 'bg-blue-500/20 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-black/40 border-white/5 text-gray-400 hover:bg-white/5'}`}
            >
              <i className="fa-solid fa-circle-pause text-blue-400 mr-2 text-base"></i> ৩. সাময়িক বিরতি (সতর্কতা)
            </button>
          </div>

          {/* Tab Content Display */}
          <div className="bg-black/40 border border-white/5 p-6 rounded-2xl text-sm leading-relaxed text-gray-300 space-y-4">
            {activeTab === 'why' && (
              <>
                <h4 className="font-bold text-base text-white">রক্তদান—একটি জীবন বাঁচানোর সর্বশ্রেষ্ঠ ইবাদত ও মানবিক দায়িত্ব</h4>
                <p>পৃথিবীতে এমন কোনো কৃত্রিম আবিষ্কার নেই যা মানুষের রক্তের বিকল্প হতে পারে। একমাত্র মানুষের রক্তই মানুষের প্রাণ বাঁচাতে পারে। আপনি যখন রক্তদান করেন, তখন:</p>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  <li>একজন মৃত্যুর মুখোমুখি হওয়া রোগীকে আপনি নতুন জীবন ফিরিয়ে দেন।</li>
                  <li>আপনার শরীরের অতিরিক্ত আয়রন দূর হয়, যা হার্ট অ্যাটাকের ঝুঁকি উল্লেখযোগ্যভাবে কমিয়ে দেয়।</li>
                  <li>নিয়মিত রক্তদান শরীরের নতুন রক্ত কণিকা তৈরিতে (Bone Marrow Stimulation) সাহায্য করে।</li>
                </ul>
                <p className="text-emerald-400 font-bold">সুপারহিরো হওয়ার জন্য কেপ বা মুখোশের প্রয়োজন হয় না, একটি রক্তই যথেষ্ট!</p>
              </>
            )}

            {activeTab === 'eligibility' && (
              <>
                <h4 className="font-bold text-base text-white">আমি কি রক্ত দেওয়ার উপযুক্ত?</h4>
                <p>খুব সাধারণ কিছু শর্ত পূরণ করলেই আপনি একজন গর্বিত রক্তদাতা হতে পারেন:</p>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  <li><strong>বয়স:</strong> ১৮ থেকে ৬০ বছরের মধ্যে যে কেউ।</li>
                  <li><strong>ওজন:</strong> ন্যূনতম ৫০ কেজি বা তার বেশি।</li>
                  <li><strong>স্বাস্থ্য:</strong> শরীর সম্পূর্ণ সুস্থ ও সবল থাকতে হবে, কোনো সংক্রামক ব্যাধি থাকা চলবে না।</li>
                  <li><strong>বিরতি:</strong> পুরুষদের ক্ষেত্রে প্রতি ৩ মাস (১২০ দিন) পর এবং নারীদের ক্ষেত্রে ৪ মাস পর পুনরায় রক্ত দেওয়া যায়।</li>
                </ul>
                <p className="text-emerald-400 font-bold">যদি আপনার এই সাধারণ গুণগুলো থাকে, তবে আপনি আজই একজন জীবনরক্ষাকারী!</p>
              </>
            )}

            {activeTab === 'restrictions' && (
              <>
                <h4 className="font-bold text-base text-white">কখন সাময়িকভাবে রক্ত দেওয়া থেকে বিরত থাকা উচিত?</h4>
                <p>রোগী ও আপনার নিজের নিরাপত্তার স্বার্থে কিছু নির্দিষ্ট সময়ে রক্তদান থেকে সাময়িক বিরতি নিতে হয়:</p>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  <li>যদি শরীরে বর্তমানে কোনো ধরনের অ্যান্টিবায়োটিক বা ভারী কোর্স medication চলতে থাকে।</li>
                  <li>সম্প্রতি কোনো বড় অপারেশন বা সার্জারি হয়ে থাকলে।</li>
                  <li>গত ৪ মাসের মধ্যে ট্যাটু (Tattoo) বা বডি পিয়ার্সিং করানো হয়ে থাকলে।</li>
                  <li>জ্বর, সর্দি বা কাশির মতো সাময়িক অসুস্থতায় আক্রান্ত থাকলে সম্পূর্ণ সুস্থ হওয়ার পর।</li>
                </ul>
                <p className="text-blue-400 font-bold">এই ছোট সতর্কাতাগুলো আমাদের ব্লাড ব্যাংককে শতভাগ নিরাপদ রাখে।</p>
              </>
            )}
          </div>
        </div>

        {/* 3. BOTTOM SECTION: PRIVACY-FOCUSED DONOR DIRECTORY */}
        <div className="space-y-6" data-aos="fade-up">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <i className="fa-solid fa-users-line text-[#e76f51]"></i> ডোনার কমিউনিটি ডিরেক্টরি
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">প্রাইভেসি সুরক্ষার জন্য ফোন নম্বর গোপন রাখা হয়েছে। সরাসরি ইনবক্সে যোগাযোগ করুন।</p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select 
                value={selectedGroupFilter} 
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#e76f51]"
              >
                <option value="ALL">সকল ব্লাড গ্রুপ</option>
                {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>

              <button 
                onClick={() => setOnlyAvailable(!onlyAvailable)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${onlyAvailable ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-black/50 border-white/10 text-gray-400'}`}
              >
                <i className="fa-solid fa-check mr-1"></i> শুধু প্রস্তুত ডোনার
              </button>
            </div>
          </div>

          {/* Donors Grid */}
          {filteredDonors.length === 0 ? (
            <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-12 text-center text-gray-500">
              <i className="fa-solid fa-ghost text-5xl mb-3 opacity-40"></i>
              <p className="text-sm font-bold">কোনো ডোনার পাওয়া যায়নি!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDonors.map(donor => {
                const eligible = isEligible(donor.last_donation_date);
                return (
                  <div key={donor.id} className="bg-[#0a1c13] border border-white/10 hover:border-[#e76f51]/40 p-5 rounded-2xl flex flex-col justify-between transition-all shadow-xl">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-white text-base">{donor.full_name}</h4>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">Batch: {donor.batch || 'N/A'} | {donor.department || 'N/A'}</p>
                        </div>
                        <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-xl text-sm font-black">
                          {donor.blood_group || 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 my-4">
                        <span className={`w-2.5 h-2.5 rounded-full ${eligible ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                        <span className={`text-xs font-bold ${eligible ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {eligible ? 'রক্ত দেওয়ার জন্য প্রস্তুত (Available)' : 'বিশ্রামে আছে (On Rest)'}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleStartChatWithDonor(donor)}
                      className="w-full bg-white/5 hover:bg-[#e76f51] text-gray-300 hover:text-white border border-white/10 hover:border-[#e76f51] py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <i className="fa-regular fa-paper-plane"></i> ইনবক্সে মেসেজ পাঠান
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 🔴 EMOTIONAL BLACKMAIL WARNING MODAL FOR TOGGLE */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#0a1c13] border border-red-500/40 p-6 sm:p-8 rounded-3xl w-full max-w-md relative z-10 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/40 text-red-500 text-2xl">
              <i className="fa-solid fa-heart-crack animate-pulse"></i>
            </div>

            <h3 className="text-xl font-black text-white mb-2">আপনি কি সত্যিই নিশ্চিত?</h3>
            <p className="text-sm text-gray-300 leading-relaxed mb-6">
              আপনার একটি রক্তকণিকা হয়তো এই মুহূর্তে হাসপাতালের বেডে থাকা কোনো মুমূর্ষু রোগীর শেষ ভরসা হতে পারে। আপনি নিজেকে নিষ্ক্রিয় করে ফেললে একজন অসহায় মানুষ হয়তো রক্তের জন্য বড় বিপদে পড়তে পারে। সুপারহিরো হওয়ার এই মহৎ সুযোগটি কি আসলেই হাতছাড়া করতে চান?
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setShowWarningModal(false)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              >
                <i className="fa-solid fa-shield-heart mr-2"></i> না, আমি সুপারহিরোই থাকতে চাই!
              </button>
              
              <button 
                onClick={() => updateDonorStatus(false)}
                className="w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-red-400 py-2.5 rounded-xl text-xs font-bold transition-colors border border-white/5"
              >
                হ্যাঁ, তবুও সাময়িকভাবে বন্ধ রাখুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 EMERGENCY SOS BROADCAST MODAL */}
      {showSosModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a1c13] border border-red-500/40 p-6 sm:p-8 rounded-3xl w-full max-w-lg relative z-10 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <i className="fa-solid fa-bullhorn text-red-500"></i> ইমার্জেন্সি ব্লাড রিকোয়েস্ট (SOS)
              </h3>
              <button onClick={() => setShowSosModal(false)} className="text-gray-400 hover:text-white"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>

            <form onSubmit={handleSendSos} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">কোন রক্তের গ্রুপ প্রয়োজন? *</label>
                <select 
                  value={sosData.bloodGroup} 
                  onChange={(e) => setSosData({...sosData, bloodGroup: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 font-bold"
                >
                  {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">হাসপাতাল বা লোকেশন *</label>
                <input 
                  required
                  type="text" 
                  value={sosData.hospital} 
                  onChange={(e) => setSosData({...sosData, hospital: e.target.value})}
                  placeholder="যেমন: সিএমসিএইচ, চট্টগ্রাম" 
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">রোগীর বিবরণ ও যোগাযোগের ফোন নম্বর *</label>
                <textarea 
                  required
                  rows="3"
                  value={sosData.details} 
                  onChange={(e) => setSosData({...sosData, details: e.target.value})}
                  placeholder="বিস্তারিত লিখুন এবং আপনার ফোন নম্বর দিন..." 
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 resize-none" 
                />
              </div>

              <button 
                disabled={isSendingSos}
                type="submit" 
                className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center justify-center gap-2 mt-4"
              >
                {isSendingSos ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
                {isSendingSos ? 'ডোনারদের কাছে পাঠানো হচ্ছে...' : 'সকল যোগ্য ডোনারকে অ্যালার্ট পাঠান'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
