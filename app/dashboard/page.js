'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [bookings, setBookings] = useState([])
  const [rank, setRank] = useState('-')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      // ১. প্রোফাইল ডেটা ফেচ করা
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      setProfile(profileData)

      // ২. বুকিংস ডেটা ফেচ করা
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*, events(title)')
        .eq('user_id', session.user.id)
      
      setBookings(bookingsData || [])

      // ৩. র‍্যাংক ক্যালকুলেশন (যাদের ট্রেইল ১ এর বেশি)
      if (profileData?.total_treks > 0) {
        const { data: allUsers } = await supabase
          .from('profiles')
          .select('id, total_treks, total_distance')
          .gt('total_treks', 0)
        
        if (allUsers) {
          allUsers.sort((a, b) => {
            if (b.total_treks !== a.total_treks) return b.total_treks - a.total_treks
            return b.total_distance - a.total_distance
          })
          const userRank = allUsers.findIndex(u => u.id === session.user.id) + 1
          setRank(userRank)
        }
      }

      setLoading(false)
    }

    fetchDashboardData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050b08]">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#e76f51]"></i>
      </div>
    )
  }

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || "User")}&background=0a1c13&color=fff&size=128`

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 text-gray-300">
      
      {/* LEFT COLUMN: Profile & Tactical Data */}
      <div className="space-y-6">
        
        {/* Profile Card */}
        <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-white/5 rounded-2xl shadow-xl overflow-hidden relative">
          <div className="h-24 bg-gradient-to-r from-[#0a1c13] via-[#2d6a4f]/40 to-[#0a1c13] border-b border-white/5"></div>
          <div className="px-6 pb-6 relative pt-12"> 
            <div className="w-20 h-20 rounded-2xl border-2 border-[#050b08] overflow-hidden bg-[#0a1c13] absolute -top-10 left-6 shadow-lg">
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-black text-white drop-shadow-md leading-tight">
                {profile?.full_name || "Explorer"}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs font-bold text-[#2d6a4f] bg-[#2d6a4f]/10 px-2.5 py-1 rounded-lg border border-[#2d6a4f]/20">
                  {profile?.department || ''} {profile?.batch ? `'${String(profile.batch).slice(-2)}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-400 font-medium">
                <i className="fa-solid fa-building-user text-[#2d6a4f]"></i> <span>{profile?.hall || "N/A"}</span>
              </div>
              <div className="mt-5 pt-4 border-t border-white/10 flex gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                  <i className="fa-solid fa-shield-check"></i> <span>Identity Verified</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Data */}
        <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-white/5 rounded-2xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-3">
            <h3 className="text-xs font-bold tracking-widest text-gray-500 uppercase flex items-center gap-2">
              <i className="fa-solid fa-microchip text-[#e76f51]"></i> <span>ট্যাকটিক্যাল ডেটা</span>
            </h3>
            <Link href="/edit-profile" className="text-xs font-bold text-[#2d6a4f] hover:text-white transition-colors">এডিট করুন</Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Blood Group</p>
              <p className="font-black text-red-500 text-lg flex items-center gap-2"><i className="fa-solid fa-droplet"></i> <span>{profile?.blood_group || "N/A"}</span></p>
            </div>
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Combat Gear</p>
              <p className="font-black text-[#2d6a4f] text-lg flex items-center gap-2"><i className="fa-solid fa-shirt"></i> <span>{profile?.tshirtSize || "N/A"}</span></p>
            </div>
            <div className="p-3 bg-black/40 border border-white/5 rounded-xl col-span-2">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Experience</p>
              <p className="font-black text-purple-400 text-base flex items-center gap-2"><i className="fa-solid fa-award"></i> <span>{profile?.experienceLevel || "N/A"}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Stats & Bookings */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Gamification Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0a1c13]/70 backdrop-blur-md p-5 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center border border-yellow-500/30">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center text-lg mb-2"><i className="fa-solid fa-crown"></i></div>
            <p className="text-3xl font-black text-white drop-shadow-md">#{rank}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Current Rank</p>
          </div>

          <div className="bg-[#0a1c13]/70 backdrop-blur-md p-5 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-[#2d6a4f]/20 text-[#2d6a4f] flex items-center justify-center text-lg mb-2"><i className="fa-solid fa-route"></i></div>
            <p className="text-3xl font-black text-white drop-shadow-md">{profile?.total_treks || 0}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Total Treks</p>
          </div>
          
          <div className="bg-[#0a1c13]/70 backdrop-blur-md p-5 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg mb-2"><i className="fa-solid fa-shoe-prints"></i></div>
            <p className="text-3xl font-black text-white drop-shadow-md"><span>{profile?.total_distance || 0}</span><span className="text-sm font-medium text-gray-500">km</span></p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Distance</p>
          </div>

          <div className="bg-[#0a1c13]/70 backdrop-blur-md border border-emerald-500/30 p-5 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg mb-2"><i className="fa-solid fa-brain"></i></div>
            <p className="text-3xl font-black text-emerald-400 mt-1 drop-shadow-md">{profile?.iq_points || 0}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Survival IQ</p>
          </div>
        </div>

        {/* My Bookings */}
        <div className="bg-[#0a1c13]/70 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/5">
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
            <h3 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2">
              <i className="fa-solid fa-ticket text-[#e76f51]"></i> <span>আমার বুকিংস</span>
            </h3>
          </div>
          
          <div className="p-6">
            {bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="bg-black/30 border border-white/10 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white text-sm mb-1">{booking.events?.title || 'Unknown Event'}</h4>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">Status: {booking.status}</p>
                    </div>
                    <div>
                      {booking.status === 'approved' ? (
                        <span className="bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase"><i className="fa-solid fa-check mr-1"></i> Confirmed</span>
                      ) : (
                        <span className="bg-yellow-500/20 text-yellow-500 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase"><i className="fa-solid fa-clock mr-1"></i> Pending</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center flex flex-col items-center justify-center">
                <i className="fa-solid fa-ticket text-4xl text-gray-600 mb-4"></i>
                <p className="text-sm font-medium text-gray-400">আপনার কোনো রানিং বুকিং নেই।</p>
                <Link href="/events" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#e76f51] hover:text-orange-600 transition-colors">
                  নতুন ট্রেইল খুঁজুন <i className="fa-solid fa-arrow-right"></i>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Blog Write Section */}
        <div className="bg-[#0a1c13]/70 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/5">
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-center bg-[#e76f51]/5 border-l-4 border-[#e76f51]">
            <div className="text-center sm:text-left mb-4 sm:mb-0">
              <h3 className="font-black text-white text-xl mb-1">আপনার অ্যাডভেঞ্চার শেয়ার করুন!</h3>
              <p className="text-sm text-gray-400">ক্যাম্পাস বা ট্যুরের কোনো দারুণ অভিজ্ঞতা আছে? লিখে ফেলুন আমাদের কমিউনিটি ব্লগে।</p>
            </div>
            <Link href="/write-blog" className="w-full sm:w-auto text-center bg-[#e76f51] hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-[0_0_15px_rgba(231,111,81,0.4)] transition-transform">
              <i className="fa-solid fa-pen-nib mr-2"></i> <span>গল্প লিখুন</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
