'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AdminStories() {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)

  const fetchStories = async () => {
    try {
      // cover_photo এর বদলে cover_image এবং profiles এর রিলেশন ঠিক করা হলো
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id, title, cover_image,
          profiles!inner(id, full_name)
        `)
        .eq('status', 'pending')
        
      if (error) throw error
      setStories(data || [])
    } catch (error) {
      console.error('Error fetching stories:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStories()
  }, [])

  const handleApprove = async (storyId) => {
    if (!window.confirm("গল্পটি পাবলিশ করবেন?")) return
    setProcessingId(storyId)

    try {
      const { error } = await supabase
        .from('stories')
        .update({ status: 'approved' })
        .eq('id', storyId)

      if (error) throw error
      alert("গল্পটি সফলভাবে পাবলিশ হয়েছে!")
      fetchStories()
    } catch (error) {
      alert("অ্যাপ্রুভ করতে সমস্যা হয়েছে: " + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (storyId) => {
    if (!window.confirm("গল্পটি ডিলিট করবেন?")) return
    setProcessingId(storyId)

    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId)

      if (error) throw error
      alert("গল্পটি ডিলিট করা হয়েছে।")
      fetchStories()
    } catch (error) {
      alert("ডিলিট করতে সমস্যা হয়েছে: " + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b08] flex items-center justify-center">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-yellow-500"></i>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 relative text-gray-300">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
          <Link href="/admin" className="text-gray-400 hover:text-white bg-white/5 p-3 rounded-xl transition-colors">
              <i className="fa-solid fa-arrow-left"></i>
          </Link>
          <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                  <i className="fa-solid fa-hourglass-half text-yellow-500"></i> পেন্ডিং গল্পসমূহ
              </h1>
          </div>
        </div>

        {stories.length === 0 ? (
          <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-10 text-center">
            <i className="fa-solid fa-check-circle text-5xl text-emerald-500 mb-4 opacity-50"></i>
            <p className="text-gray-400 font-bold text-lg">অ্যাপ্রুভ করার মতো নতুন কোনো গল্প নেই!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stories.map((story) => (
              <div key={story.id} className="bg-[#0a1c13] border border-white/10 p-5 rounded-2xl flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                  {/* cover_photo এর বদলে cover_image ব্যবহার করা হয়েছে */}
                  <img src={story.cover_image || 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80&w=600'} className="w-full sm:w-32 h-24 object-cover rounded-xl" alt="Cover" />
                  
                  <div className="flex-grow">
                      <h3 className="text-lg font-bold text-white mb-1">{story.title}</h3>
                      <p className="text-xs text-gray-400 mb-2">
                          লেখক: <span className="font-bold text-gray-300">{story.profiles?.full_name || 'Unknown Author'}</span>
                      </p>
                      <Link href={`/story-reader?id=${story.id}`} target="_blank" className="text-xs text-blue-400 hover:underline">
                          <i className="fa-solid fa-eye"></i> বিস্তারিত পড়ে দেখুন
                      </Link>
                  </div>
                  <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0">
                      <button 
                        onClick={() => handleApprove(story.id)}
                        disabled={processingId === story.id} 
                        className="flex-1 sm:flex-none bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                      >
                          Approve
                      </button>
                      <button 
                        onClick={() => handleReject(story.id)}
                        disabled={processingId === story.id} 
                        className="flex-1 sm:flex-none bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                      >
                          Reject
                      </button>
                  </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
