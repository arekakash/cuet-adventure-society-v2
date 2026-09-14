'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)

  // ইউজার লগইন আছে কিনা চেক করা
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        // ডাটাবেস থেকে ইউজারের বিস্তারিত তথ্য আনা
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(data)
      }
    }
    checkUser()

    // রিয়েল-টাইম লগইন স্টেট চেঞ্জ ডিটেক্ট করা
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(data)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.push('/')
  }

  // ইউজারের নামের প্রথম অংশ বের করা
  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : 'Explorer'
  // ডিফল্ট প্রোফাইল ছবি
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=e76f51&color=fff`

  return (
    <>
      <nav className="fixed w-full z-40 bg-[#0a1c13]/60 backdrop-blur-md border-b border-white/5 transition-all duration-300 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className="text-white text-xl sm:text-2xl hover:text-[#e76f51] transition-colors focus:outline-none">
              <i className="fa-solid fa-bars-staggered"></i>
            </button>
            
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              <i className="fa-solid fa-compass text-[#e76f51] text-2xl sm:text-3xl group-hover:rotate-45 transition-transform duration-500"></i>
              <span className="font-black text-lg sm:text-xl tracking-widest text-white drop-shadow-md hidden sm:block">CUET AS</span>
            </Link>
          </div>

          <div className="flex items-center gap-4 relative">
            {!user ? (
              // লগইন না থাকলে এই বাটনগুলো দেখাবে
              <div className="flex items-center gap-4">
                <Link href="/login" className="hidden sm:block text-sm font-bold text-gray-300 hover:text-white transition-colors">
                  লগইন
                </Link>
                <Link href="/signup" className="inline-flex items-center gap-2 bg-[#e76f51] hover:bg-orange-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm tracking-wide shadow-[0_0_15px_rgba(231,111,81,0.4)] transition-all hover:scale-105">
                  <i className="fa-solid fa-fire"></i> <span>অ্যাকাউন্ট খুলুন</span>
                </Link>
              </div>
            ) : (
              // লগইন থাকলে প্রোফাইল সেকশন দেখাবে
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="text-right hidden md:block pr-4 border-r border-white/10">
                  <p className="text-xs font-bold text-gray-200">{firstName}</p>
                  <p className="text-[10px] text-[#e76f51] uppercase tracking-widest">{profile?.role || 'Explorer'}</p>
                </div>
                
                <div className="relative">
                  <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="block w-10 h-10 rounded-full border-2 border-[#e76f51] p-0.5 overflow-hidden bg-white/5 focus:outline-none hover:border-white transition-colors">
                    <img src={avatarUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                  </button>

                  {/* Profile Dropdown */}
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-[#0a1c13] border border-white/10 rounded-2xl shadow-2xl py-2 z-50 text-gray-300">
                      <div className="px-4 py-3 border-b border-white/10 md:hidden">
                        <p className="text-sm font-bold text-white truncate">{firstName}</p>
                        <p className="text-[10px] text-[#e76f51] uppercase tracking-widest mt-0.5">{profile?.role || 'Explorer'}</p>
                      </div>
                      <Link href="/dashboard" className="block px-4 py-3 text-sm hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3">
                        <i className="fa-solid fa-user w-5 text-center text-[#2d6a4f]"></i> <span>আমার প্রোফাইল</span>
                      </Link>
                      <div className="border-t border-white/10 my-1"></div>
                      <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-400 font-bold hover:bg-red-500/10 transition-colors flex items-center gap-3">
                        <i className="fa-solid fa-right-from-bracket w-5 text-center"></i> <span>লগ-আউট</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setIsSidebarOpen(false)}></div>
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-500 ease-in-out z-50 w-72 sm:w-80 bg-[#0a1c13] border-r border-white/5 shadow-2xl flex flex-col h-full overflow-y-auto`}>
        <div className="p-6 flex justify-between items-center border-b border-white/5">
          <span className="font-black text-xl tracking-widest text-white"><span className="text-[#e76f51]">C</span>UET <span className="text-[#e76f51]">A</span>S</span>
          <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white text-2xl transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="px-6 py-8 flex-grow space-y-2 text-gray-300">
          <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase mb-4">আমাদের কার্যক্রম</p>
          
          <Link href="/events" className="block py-3 px-4 rounded-xl hover:bg-white/5 hover:text-white transition-all group flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#e76f51] group-hover:scale-110 transition-transform"><i className="fa-solid fa-calendar-day"></i></div>
            <span className="font-bold text-sm">আপকামিং ইভেন্ট</span>
          </Link>
          
          <Link href="/stories" className="block py-3 px-4 rounded-xl hover:bg-white/5 hover:text-white transition-all group flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform"><i className="fa-solid fa-book-open-reader"></i></div>
            <span className="font-bold text-sm">অ্যাডভেঞ্চারের গল্প</span>
          </Link>

          <Link href="/leaderboard" className="block py-3 px-4 rounded-xl hover:bg-white/5 hover:text-white transition-all group flex items-center gap-4 border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500 group-hover:bg-yellow-500 group-hover:text-black transition-colors"><i className="fa-solid fa-trophy"></i></div>
            <span className="font-bold text-sm">লিডারবোর্ড</span>
          </Link>
          
          <Link href="/beginner-guide" className="block py-3 px-4 rounded-xl hover:bg-white/5 hover:text-white transition-all group flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform"><i className="fa-solid fa-map"></i></div>
            <span className="font-bold text-sm">বিগিনার গাইড</span>
          </Link>

          {/* Admin Panel Link (Only visible if user is admin) */}
          {profile?.role === 'admin' && (
            <Link href="/admin" className="py-3 px-4 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/30 text-red-400 transition-all group flex items-center gap-4 mt-4">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform"><i className="fa-solid fa-shield-halved"></i></div>
              <span className="font-bold text-sm uppercase tracking-widest">Admin Panel</span>
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
