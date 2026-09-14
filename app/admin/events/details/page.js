'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function EventDashboardContent() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get('id')

  const [event, setEvent] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('approved') 

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single()

        if (eventError) throw eventError
        setEvent(eventData)

        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select(`*, profiles (full_name, phone, blood_group, emergency_contact, emergency_relation)`)
          .eq('event_id', eventId)

        if (bookingError) throw bookingError
        setBookings(bookingData || [])
      } catch (error) {
        console.error('Error fetching event details:', error)
      } finally {
        setLoading(false)
      }
    }

    if (eventId) fetchEventDetails()
  }, [eventId])

  const confirmedUsers = bookings.filter(b => b.status === 'approved')
  const pendingUsers = bookings.filter(b => b.status === 'pending')
  const freeBookingUsers = bookings.filter(b => b.status === 'free_booking')
  const interestedUsers = bookings.filter(b => b.status === 'interested')

  const totalCollection = confirmedUsers.length * (event?.tour_fee || 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b08] flex items-center justify-center">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#e76f51]"></i>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#050b08] flex items-center justify-center text-white">
        <p>ইভেন্ট পাওয়া যায়নি!</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 relative text-gray-300">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/events" className="text-gray-400 hover:text-white bg-white/5 p-3 rounded-xl transition-colors">
                <i className="fa-solid fa-arrow-left"></i>
            </Link>
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">{event.title}</h1>
                <p className="text-sm text-gray-400 mt-1"><i className="fa-solid fa-map-location-dot text-[#e76f51]"></i> {event.destination} | <i className="fa-regular fa-calendar text-blue-400"></i> {new Date(event.start_date).toLocaleDateString('en-GB')}</p>
            </div>
          </div>
          <div className="bg-[#e76f51]/10 border border-[#e76f51]/30 px-5 py-2 rounded-xl text-center">
             <p className="text-[10px] uppercase tracking-widest text-[#e76f51] font-bold">টোটাল কালেকশন</p>
             <p className="text-xl font-black text-white">৳ {totalCollection}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#0a1c13] border border-emerald-500/30 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                <p className="text-3xl font-black text-white">{confirmedUsers.length}</p>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1">কনফার্মড</p>
            </div>
            <div className="bg-[#0a1c13] border border-blue-500/30 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                <p className="text-3xl font-black text-white">{pendingUsers.length}</p>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">পেন্ডিং পেমেন্ট</p>
            </div>
            <div className="bg-[#0a1c13] border border-yellow-500/30 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                <p className="text-3xl font-black text-white">{freeBookingUsers.length}</p>
                <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mt-1">ফ্রি বুকিং</p>
            </div>
            <div className="bg-[#0a1c13] border border-purple-500/30 p-5 rounded-2xl flex flex-col items-center justify-center text-center">
                <p className="text-3xl font-black text-white">{interestedUsers.length}</p>
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mt-1">ইন্টারেস্টেড</p>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-6 custom-scrollbar pb-2">
            <button onClick={() => setActiveTab('approved')} className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-black/40 text-gray-400 border border-white/10 hover:bg-white/5'}`}>
                <i className="fa-solid fa-check-circle mr-2"></i> কনফার্মড ({confirmedUsers.length})
            </button>
            <button onClick={() => setActiveTab('pending')} className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'pending' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-black/40 text-gray-400 border border-white/10 hover:bg-white/5'}`}>
                <i className="fa-solid fa-clock mr-2"></i> পেন্ডিং ({pendingUsers.length})
            </button>
            <button onClick={() => setActiveTab('free_booking')} className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'free_booking' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' : 'bg-black/40 text-gray-400 border border-white/10 hover:bg-white/5'}`}>
                <i className="fa-solid fa-ticket mr-2"></i> ফ্রি বুকিং ({freeBookingUsers.length})
            </button>
            <button onClick={() => setActiveTab('interested')} className={`whitespace-nowrap px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'interested' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' : 'bg-black/40 text-gray-400 border border-white/10 hover:bg-white/5'}`}>
                <i className="fa-solid fa-heart mr-2"></i> ইন্টারেস্টেড ({interestedUsers.length})
            </button>
        </div>

        {/* Table */}
        <div className="bg-[#0a1c13] border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-black/40 text-gray-400 text-[11px] uppercase tracking-widest">
                        <tr>
                            <th className="px-6 py-4 font-bold">অ্যাডভেঞ্চারার</th>
                            <th className="px-6 py-4 font-bold">কন্টাক্ট ইনফো</th>
                            <th className="px-6 py-4 font-bold">মেডিকেল / ইমার্জেন্সি</th>
                            {activeTab === 'pending' || activeTab === 'approved' ? <th className="px-6 py-4 font-bold">পেমেন্ট স্ট্যাটাস</th> : null}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {activeTab === 'approved' && confirmedUsers.map(user => <UserRow key={user.id} user={user} showPayment={true} />)}
                        {activeTab === 'pending' && pendingUsers.map(user => <UserRow key={user.id} user={user} showPayment={true} />)}
                        {activeTab === 'free_booking' && freeBookingUsers.map(user => <UserRow key={user.id} user={user} showPayment={false} />)}
                        {activeTab === 'interested' && interestedUsers.map(user => <UserRow key={user.id} user={user} showPayment={false} />)}
                        
                        {((activeTab === 'approved' && confirmedUsers.length === 0) || 
                          (activeTab === 'pending' && pendingUsers.length === 0) || 
                          (activeTab === 'free_booking' && freeBookingUsers.length === 0) || 
                          (activeTab === 'interested' && interestedUsers.length === 0)) && (
                            <tr>
                                <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                                    <p>এই ক্যাটাগরিতে কোনো ডেটা নেই।</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  )
}

function UserRow({ user, showPayment }) {
    return (
        <tr className="hover:bg-white/5 transition-colors">
            <td className="px-6 py-4">
                <p className="font-bold text-white">{user.profiles?.full_name || 'Unknown'}</p>
                <p className="text-xs text-gray-500 mt-1">ID: {user.user_id?.substring(0, 8)}...</p>
            </td>
            <td className="px-6 py-4">
                <p className="text-gray-300"><i className="fa-solid fa-phone text-[#e76f51] mr-1"></i> {user.profiles?.phone || 'N/A'}</p>
            </td>
            <td className="px-6 py-4">
                <p className="text-gray-300 font-bold text-xs"><span className="text-red-500"><i className="fa-solid fa-droplet mr-1"></i> {user.profiles?.blood_group || '-'}</span></p>
                <p className="text-xs text-gray-500 mt-1">SOS: {user.profiles?.emergency_contact || '-'} ({user.profiles?.emergency_relation || '-'})</p>
            </td>
            {showPayment && (
                <td className="px-6 py-4">
                    {user.status === 'approved' ? (
                        <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border border-emerald-500/30">Paid & Confirmed</span>
                    ) : (
                        <div>
                            <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border border-blue-500/30 mb-1 inline-block">Verify Pending</span>
                            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Trx: <span className="text-white font-bold">{user.trx_id}</span></p>
                        </div>
                    )}
                </td>
            )}
        </tr>
    )
}

export default function EventDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050b08] flex items-center justify-center">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#e76f51]"></i>
      </div>
    }>
      <EventDashboardContent />
    </Suspense>
  )
}
