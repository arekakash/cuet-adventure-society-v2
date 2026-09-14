'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function PublicEventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'upcoming')
          .order('created_at', { ascending: false })

        if (error) throw error
        setEvents(data || [])
      } catch (error) {
        console.error('Error fetching events:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchEvents()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b08] flex items-center justify-center">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#e76f51]"></i>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 relative z-10 text-gray-300">
      <div className="max-w-6xl mx-auto">
        
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-black text-white mb-4">আপকামিং <span className="text-[#e76f51]">অ্যাডভেঞ্চার</span></h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base">আমাদের পরবর্তী ইভেন্টগুলোতে যুক্ত হয়ে আপনার অ্যাডভেঞ্চার প্রোফাইল ভারী করুন এবং লিডারবোর্ডে এগিয়ে যান।</p>
        </div>

        {events.length === 0 ? (
          <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-10 text-center max-w-2xl mx-auto">
            <i className="fa-solid fa-campground text-5xl text-gray-600 mb-4 opacity-50"></i>
            <p className="text-gray-400 font-bold text-lg">আপাতত নতুন কোনো ইভেন্ট নেই। চোখ রাখুন আমাদের পেইজে!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(ev => (
              <div key={ev.id} className="bg-[#0a1c13] border border-white/10 rounded-2xl overflow-hidden hover:-translate-y-2 transition-transform duration-300 shadow-xl flex flex-col group">
                
                <div className="h-48 relative overflow-hidden">
                  <img src={ev.cover_photo || 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={ev.title} />
                  <div className="absolute top-4 left-4 bg-[#e76f51] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                    {ev.category}
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 leading-tight">{ev.title}</h3>
                  <div className="space-y-2 mb-6">
                    <p className="text-xs text-gray-400 flex items-center gap-2"><i className="fa-solid fa-map-location-dot text-[#e76f51] w-4"></i> <span>{ev.destination}</span></p>
                    <p className="text-xs text-gray-400 flex items-center gap-2"><i className="fa-solid fa-calendar text-blue-400 w-4"></i> <span>{new Date(ev.start_date).toLocaleDateString('en-GB')}</span></p>
                    <p className="text-xs text-gray-400 flex items-center gap-2"><i className="fa-solid fa-chair text-emerald-400 w-4"></i> <span>সিট ফাঁকা আছে: <span className="font-bold text-emerald-400">{Math.max(0, ev.total_seats - (ev.booked_seats || 0))} টি</span></span></p>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                    <p className="text-xl font-black text-white">৳ {ev.tour_fee}</p>
                    {/* এখানেই সেই জাদুকরী ডায়নামিক লিংকটি দেওয়া আছে */}
                    <Link href={`/event-details?id=${ev.id}`} className="bg-white/10 hover:bg-[#e76f51] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
                      বিস্তারিত দেখুন <i className="fa-solid fa-arrow-right"></i>
                    </Link>
                  </div>
                </div>
                
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
