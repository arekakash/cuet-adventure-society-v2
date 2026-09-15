'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function TrashBin() {
  const [trashedEvents, setTrashedEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrashedEvents()
  }, [])

  const fetchTrashedEvents = async () => {
    setLoading(true)
    try {
      // শুধুমাত্র সেই ইভেন্টগুলো আনবে যেগুলোর deleted_at কলামে ডেটা আছে
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

      if (error) throw error
      setTrashedEvents(data || [])
    } catch (error) {
      console.error(error)
      alert("ট্র্যাশ ডেটা লোড করতে সমস্যা হয়েছে: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  // ইভেন্ট রিস্টোর করার ফাংশন
  const handleRestore = async (id) => {
    const confirmRestore = window.confirm("আপনি কি নিশ্চিতভাবে এই ইভেন্টটি রিস্টোর করতে চান? এটি আবার পাবলিক ইভেন্ট লিস্টে দেখা যাবে।")
    if (!confirmRestore) return

    try {
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: null }) // deleted_at কলামটি আবার ফাঁকা করে দেওয়া হলো
        .eq('id', id)

      if (error) throw error
      alert("ইভেন্টটি সফলভাবে রিস্টোর করা হয়েছে!")
      fetchTrashedEvents() // লিস্ট রিফ্রেশ করা
    } catch (error) {
      alert("রিস্টোর করতে সমস্যা হয়েছে: " + error.message)
    }
  }

  // চিরতরে ডিলিট করার ফাংশন
  const handlePermanentDelete = async (id) => {
    const confirmDelete = window.confirm("চরম সতর্কতা! এটি ডেটাবেস থেকে চিরতরে মুছে যাবে এবং আর কখনোই উদ্ধার করা সম্ভব হবে না। আপনি কি নিশ্চিত?")
    if (!confirmDelete) return

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert("ইভেন্টটি চিরতরে মুছে ফেলা হয়েছে!")
      fetchTrashedEvents()
    } catch (error) {
      alert("ডিলিট করতে সমস্যা হয়েছে: " + error.message)
    }
  }

  // কত দিন বাকি আছে তা হিসাব করার ফাংশন
  const calculateDaysLeft = (deletedAtStr) => {
    const deletedDate = new Date(deletedAtStr)
    const expiryDate = new Date(deletedDate.setDate(deletedDate.getDate() + 30))
    const today = new Date()
    const diffTime = Math.abs(expiryDate - today)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="min-h-screen bg-[#050b08] pb-12 px-4 sm:px-6 relative text-gray-300 pt-24">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-400 hover:text-white bg-white/5 p-3 rounded-xl transition-colors">
              <i className="fa-solid fa-arrow-left"></i>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <i className="fa-solid fa-trash-can text-red-500"></i> ট্র্যাশ বিন (Trash Bin)
              </h1>
              <p className="text-sm text-gray-400 mt-1">ডিলিট হওয়া ইভেন্টগুলো ৩০ দিন পর স্বয়ংক্রিয়ভাবে মুছে যাবে</p>
            </div>
          </div>
          <Link href="/admin/events" className="bg-white/5 hover:bg-white/10 text-white font-bold py-2 px-4 rounded-lg transition-colors border border-white/10 text-sm">
            অ্যাক্টিভ ইভেন্ট ম্যানেজমেন্ট
          </Link>
        </div>

        {/* Content Section */}
        <div className="bg-[#0a1c13] border border-red-500/20 rounded-3xl p-6 sm:p-8 shadow-[0_0_30px_rgba(239,68,68,0.05)]">
          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <i className="fa-solid fa-circle-notch fa-spin text-4xl text-red-500"></i>
            </div>
          ) : trashedEvents.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center">
              <i className="fa-solid fa-box-open text-6xl text-gray-600 mb-4"></i>
              <h3 className="text-xl font-bold text-gray-400">ট্র্যাশ বিন সম্পূর্ণ ফাঁকা</h3>
              <p className="text-sm text-gray-500 mt-2">বর্তমানে কোনো ডিলিট হওয়া ইভেন্ট নেই।</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {trashedEvents.map(event => (
                <div key={event.id} className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:border-red-500/30 transition-colors">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-white leading-tight">{event.title}</h3>
                      <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border border-red-500/20 whitespace-nowrap">
                        {calculateDaysLeft(event.deleted_at)} days left
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4"><i className="fa-solid fa-location-dot text-gray-400 mr-1"></i> {event.destination}</p>
                    
                    <div className="bg-white/5 p-3 rounded-xl mb-6">
                      <p className="text-xs text-gray-400"><span className="font-bold text-gray-300">ডিলিট করা হয়েছে:</span> {new Date(event.deleted_at).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleRestore(event.id)}
                      className="w-1/2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/30 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-rotate-left"></i> রিস্টোর
                    </button>
                    <button 
                      onClick={() => handlePermanentDelete(event.id)}
                      className="w-1/2 bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-fire"></i> ধ্বংস করুন
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
