"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // ডায়নামিক স্টেট
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (isMounted) setSession(session);
      
      if (session) {
        fetchUserProfile(session.user.id);
      }
    };

    initializeAuth();

    // রিয়েল-টাইম লগইন/লগআউট ডিটেকশন
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) {
        setSession(session);
        if (session) {
          fetchUserProfile(session.user.id);
        } else {
          setUserProfile(null);
        }
      }
    });

    return () => {
      isMounted = false;
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const fetchUserProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, photo_url, role')
      .eq('id', userId)
      .single();
      
    if (!error && data) {
      setUserProfile(data);
    }
  };

  // লগ-আউট ফাংশন
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsProfileOpen(false);
    router.push('/login');
    router.refresh();
  };

  const isLoggedIn = !!session;
  const avatarUrl = userProfile?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.full_name || 'User')}&background=e76f51&color=fff`;

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="fixed w-full z-40 glass-dark transition-all duration-300 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className="text-white text-xl sm:text-2xl hover:text-campfire transition-colors focus:outline-none">
              <i className="fa-solid fa-bars-staggered"></i>
            </button>
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              <i className="fa-solid fa-compass text-campfire text-2xl sm:text-3xl group-hover:rotate-45 transition-transform duration-500"></i>
              <span className="font-black text-lg sm:text-xl tracking-widest text-white drop-shadow-md hidden sm:block">CUET AS</span>
            </Link>
          </div>

          <div className="flex items-center gap-4 relative">
            {!isLoggedIn ? (
              <div className="flex items-center gap-4">
                <Link href="/login" className="hidden sm:block text-sm font-bold text-gray-300 hover:text-white transition-colors border-b border-transparent hover:border-white pb-0.5">লগইন</Link>
                <Link href="/signup" className="inline-flex items-center gap-2 bg-campfire hover:bg-orange-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm tracking-wide shadow-glow transition-all hover:scale-105">
                  <i className="fa-solid fa-fire"></i> <span>অ্যাকাউন্ট খুলুন</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="text-right hidden md:block pr-4 border-r border-white/10">
                  <p className="text-xs font-bold text-gray-200">{userProfile?.full_name || 'Explorer'}</p>
                  <p className="text-[10px] text-campfire uppercase tracking-widest">{userProfile?.role || 'User'}</p>
                </div>
                <div className="relative">
                  <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="block w-10 h-10 rounded-full border-2 border-campfire p-0.5 overflow-hidden bg-white/5 focus:outline-none hover:border-white transition-colors shadow-glow">
                    <img src={avatarUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                  </button>
                  
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-[#0a1c13] border border-white/10 rounded-2xl shadow-2xl py-2 z-50 text-gray-300">
                      <Link href="/dashboard" onClick={() => setIsProfileOpen(false)} className="block px-4 py-3 text-sm hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3">
                        <i className="fa-solid fa-user w-5 text-center text-[#e76f51]"></i> <span>আমার প্রোফাইল</span>
                      </Link>
                      <button onClick={() => { setIsSettingsOpen(true); setIsProfileOpen(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3">
                        <i className="fa-solid fa-gear w-5 text-center text-blue-400"></i> <span>সেটিংস</span>
                      </button>
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
        <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"></div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-500 ease-in-out z-50 w-72 sm:w-80 bg-[#0a1c13] border-r border-white/5 shadow-2xl flex flex-col h-full overflow-y-auto`}>
        <div className="p-6 flex justify-between items-center border-b border-white/5">
          <span className="font-black text-xl tracking-widest text-white"><span className="text-[#e76f51]">C</span>UET <span className="text-[#e76f51]">A</span>S</span>
          <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white text-2xl transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="px-6 py-8 flex-grow space-y-2 text-gray-300">
          <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase mb-4">আমাদের কার্যক্রম</p>
          
          <Link href="/events" onClick={() => setIsSidebarOpen(false)} className="block py-3 px-4 rounded-xl hover:bg-white/5 hover:text-white transition-all group flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#e76f51] group-hover:scale-110 transition-transform"><i className="fa-solid fa-calendar-day"></i></div>
            <span className="font-bold text-sm">আপকামিং ইভেন্ট</span>
          </Link>
          <Link href="/past-events" onClick={() => setIsSidebarOpen(false)} className="block py-3 px-4 rounded-xl hover:bg-white/5 hover:text-white transition-all group flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:scale-110 transition-transform"><i className="fa-solid fa-clock-rotate-left"></i></div>
            <span className="font-bold text-sm">পূর্ববর্তী ইভেন্ট</span>
          </Link>
          <Link href="/stories" onClick={() => setIsSidebarOpen(false)} className="block py-3 px-4 rounded-xl hover:bg-white/5 hover:text-white transition-all group flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform"><i className="fa-solid fa-book-open-reader"></i></div>
            <span className="font-bold text-sm">অ্যাডভেঞ্চারের গল্প</span>
          </Link>
          
          <Link href="/leaderboard" onClick={() => setIsSidebarOpen(false)} className="block py-3 px-4 rounded-xl hover:bg-white/5 hover:text-white transition-all group flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform"><i className="fa-solid fa-trophy"></i></div>
            <span className="font-bold text-sm">লিডারবোর্ড</span>
          </Link>
          
          <Link href="/store" onClick={() => setIsSidebarOpen(false)} className="block py-3 px-4 rounded-xl hover:bg-white/5 hover:text-white transition-all group flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform"><i className="fa-solid fa-store"></i></div>
            <span className="font-bold text-sm">অ্যাডভেঞ্চার স্টোর</span>
          </Link>
          <Link href="/beginners-guide" onClick={() => setIsSidebarOpen(false)} className="block py-3 px-4 rounded-xl hover:bg-white/5 hover:text-white transition-all group flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform"><i className="fa-solid fa-map"></i></div>
            <span className="font-bold text-sm">বিগিনার গাইড</span>
          </Link>

          <div className="border-t border-white/5 my-4"></div>
          <button onClick={() => { setIsSettingsOpen(true); setIsSidebarOpen(false); }} className="w-full text-left py-3 px-4 rounded-xl hover:bg-white/5 hover:text-white transition-all group flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform"><i className="fa-solid fa-gear"></i></div>
            <span className="font-bold text-sm">সেটিংস</span>
          </button>
        </div>

        {!isLoggedIn && (
          <div className="p-6 border-t border-white/5 glass-dark space-y-3">
            <Link href="/signup" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center justify-center gap-2 bg-[#e76f51] hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-all shadow-glow">
              <i className="fa-solid fa-user-astronaut"></i> <span>অ্যাকাউন্ট খুলুন</span>
            </Link>
            <Link href="/login" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center justify-center gap-2 border border-white/10 text-gray-300 hover:bg-white/5 py-3 rounded-xl font-bold transition-all">
              <i className="fa-solid fa-right-to-bracket"></i> <span>লগইন করুন</span>
            </Link>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-8 max-w-sm w-full mx-4 relative z-10 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <i className="fa-solid fa-sliders text-[#e76f51]"></i> <span>সেটিংস</span>
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-sm">থিম (Theme)</p>
                  <p className="text-xs text-gray-500">ডার্ক ফরেস্ট বা মিস্ট মোড</p>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none">
                  <input type="checkbox" className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer z-10"/>
                  <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-600 cursor-pointer"></label>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-xl transition-all">
                সম্পন্ন
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
