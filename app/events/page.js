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
          .order('start_date', { ascending: true })

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

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Trekking': return 'fa-solid fa-mountain'
      case 'Cycling': return 'fa-solid fa-bicycle'
      case 'Swimming': return 'fa-solid fa-person-swimming'
      case 'Camping': return 'fa-solid fa-campground'
      case 'Houseboat/Cruise': return 'fa-solid fa-ship'
      case 'Day Tour': return 'fa-solid fa-bus-simple'
      case 'Workshop': return 'fa-solid fa-chalkboard-user'
      case 'Expedition': return 'fa-solid fa-map-location-dot'
      default: return 'fa-solid fa-compass'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-bg dark:bg-darkForest flex items-center justify-center transition-colors duration-500">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-campfire"></i>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pastel-bg dark:bg-darkForest pt-24 pb-12 px-4 sm:px-6 relative z-10 text-gray-800 dark:text-gray-300 transition-colors duration-500">
      <div className="max-w-6xl mx-auto">
        
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 transition-colors">আপকামিং <span className="text-campfire">অ্যাডভেঞ্চার</span></h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-sm md:text-base transition-colors">আমাদের পরবর্তী ইভেন্টগুলোতে যুক্ত হয়ে আপনার অ্যাডভেঞ্চার প্রোফাইল ভারী করুন এবং লিডারবোর্ডে এগিয়ে যান।</p>
        </div>

        {events.length === 0 ? (
          <div className="bg-white dark:bg-moss border border-gray-200 dark:border-white/10 rounded-3xl p-10 text-center max-w-2xl mx-auto shadow-soft dark:shadow-2xl transition-colors duration-500">
            <i className="fa-solid fa-campground text-5xl text-gray-400 dark:text-gray-600 mb-4 opacity-50 transition-colors"></i>
            <p className="text-gray-500 dark:text-gray-400 font-bold text-lg transition-colors">আপাতত নতুন কোনো ইভেন্ট নেই। চোখ রাখুন আমাদের পেইজে!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(ev => {
              const isFull = (ev.booked_seats || 0) >= ev.total_seats;
              
              return (
                <div key={ev.id} className={`bg-white dark:bg-moss border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden hover:-translate-y-2 transition-all duration-300 shadow-soft dark:shadow-xl flex flex-col group ${isFull ? 'opacity-80 grayscale-[20%]' : ''}`}>
                  
                  <div className="h-48 relative overflow-hidden">
                    <img src={ev.cover_photo || 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={ev.title} />
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-white/90 dark:from-moss to-transparent opacity-80 transition-colors duration-500"></div>
                    
                    <div className="absolute top-4 left-4 bg-campfire/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md dark:shadow-lg border border-campfire/50 flex items-center gap-1.5 transition-colors">
                      <i className={getCategoryIcon(ev.category)}></i> {ev.category}
                    </div>

                    {isFull && (
                      <div className="absolute top-4 right-4 bg-red-100/90 dark:bg-red-500/90 backdrop-blur-sm text-red-600 dark:text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm dark:shadow-[0_0_15px_rgba(239,68,68,0.5)] border border-red-200 dark:border-red-500/50 flex items-center gap-1.5 animate-pulse transition-colors">
                        <i className="fa-solid fa-ban"></i> Seat Full
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 flex flex-col flex-grow relative z-10 -mt-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 leading-tight drop-shadow-sm dark:drop-shadow-md group-hover:text-campfire transition-colors">{ev.title}</h3>
                    <div className="space-y-2 mb-6">
                      <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 transition-colors"><i className="fa-solid fa-map-location-dot text-campfire w-4"></i> <span>{ev.destination}</span></p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 transition-colors"><i className="fa-solid fa-calendar text-blue-500 dark:text-blue-400 w-4"></i> <span>{new Date(ev.start_date).toLocaleDateString('en-GB')}</span></p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 transition-colors">
                        <i className="fa-solid fa-chair text-emerald-500 dark:text-emerald-400 w-4"></i> 
                        <span>সিট ফাঁকা আছে: <span className={`font-bold transition-colors ${isFull ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{Math.max(0, ev.total_seats - (ev.booked_seats || 0))} টি</span></span>
                      </p>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-gray-200 dark:border-white/5 flex items-center justify-between transition-colors">
                      <p className="text-xl font-black text-gray-900 dark:text-white transition-colors">৳ {ev.tour_fee}</p>
                      <Link href={`/event-details?id=${ev.id}`} className="bg-gray-100 dark:bg-white/10 hover:bg-campfire text-gray-700 dark:text-white hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm dark:shadow-none">
                        বিস্তারিত দেখুন <i className="fa-solid fa-arrow-right"></i>
                      </Link>
                    </div>
                  </div>
                  
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
