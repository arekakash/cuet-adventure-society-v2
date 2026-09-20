"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // 🔴 নতুন: কার্ট স্টেট এবং স্লাইড-আউট কন্ট্রোল
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cart, setCart] = useState([]); // (বি.দ্র: বাস্তবে এটি Context বা Redux থেকে আসবে)
  
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsProfileOpen(false);
    router.push('/login');
    router.refresh();
  };

  // 🔴 কার্টের মোট হিসাব
  const cartTotal = cart.reduce((total, item) => total + (item.current_price * item.qty * (item.rentDays || 1)), 0);

  const isLoggedIn = !!session;
  const isAdmin = userProfile?.role === 'admin';
  const avatarUrl = userProfile?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.full_name || 'User')}&background=e76f51&color=fff`;

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="fixed w-full z-40 glass-dark transition-all duration-300 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className="text-white text-xl sm:text-2xl hover:text-[#e76f51] transition-colors focus:outline-none">
              <i className="fa-solid fa-bars-staggered"></i>
            </button>
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-[#e76f51] rounded-lg blur opacity-75 group-hover:opacity-100 animate-pulse transition duration-500"></div>
                <div className="relative bg-[#0a1c13] px-2 py-0.5 rounded-lg border border-white/10">
                  <span className="font-black text-xl sm:text-2xl tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-[#e76f51] to-red-500">
                    CAS
                  </span>
                </div>
              </div>
              <span className="font-black text-lg sm:text-xl tracking-widest text-white drop-shadow-md hidden sm:block">CUET AS</span>
            </Link>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 relative">
            
            {/* 🔴 Cart Icon on Navbar */}
            <button onClick={() => setIsCartOpen(true)} className="relative text-gray-300 hover:text-white transition-colors focus:outline-none group mt-1">
              <i className="fa-solid fa-cart-shopping text-xl sm:text-2xl group-hover:scale-110 transition-transform"></i>
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#e76f51] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0a1c13] animate-pulse">
                  {cart.length}
                </span>
              )}
            </button>

            {!isLoggedIn ? (
              <div className="flex items-center gap-4 border-l border-white/10 pl-4 sm:pl-6">
                <Link href="/login" className="hidden sm:block text-sm font-bold text-gray-300 hover:text-white transition-colors border-b border-transparent hover:border-white pb-0.5">লগইন</Link>
                <Link href="/signup" className="inline-flex items-center gap-2 bg-[#e76f51] hover:bg-orange-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm tracking-wide shadow-[0_0_15px_rgba(231,111,81,0.4)] transition-all hover:scale-105">
                  <i className="fa-solid fa-fire"></i> <span>অ্যাকাউন্ট খুলুন</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3 sm:gap-4 border-l border-white/10 pl-4 sm:pl-6">
                <div className="text-right hidden md:block pr-4 border-r border-white/10">
                  <p className="text-xs font-bold text-gray-200">{userProfile?.full_name || 'Explorer'}</p>
                  <p className={`text-[10px] uppercase tracking-widest ${isAdmin ? 'text-emerald-400 font-bold' : 'text-[#e76f51]'}`}>
                    {userProfile?.role || 'User'}
                  </p>
                </div>
                <div className="relative">
                  <button onClick={() => setIsProfileOpen(!isProfileOpen)} className={`block w-10 h-10 rounded-full border-2 p-0.5 overflow-hidden focus:outline-none transition-colors shadow-glow ${isAdmin ? 'border-emerald-500 hover:border-white bg-emerald-500/10' : 'border-[#e76f51] hover:border-white bg-white/5'}`}>
                    <img src={avatarUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                  </button>
                  
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-[#0a1c13] border border-white/10 rounded-2xl shadow-2xl py-2 z-50 text-gray-300">
                      <Link href="/dashboard" onClick={() => setIsProfileOpen(false)} className="block px-4 py-3 text-sm hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3">
                        <i className="fa-solid fa-user w-5 text-center text-[#e76f51]"></i> <span>আমার প্রোফাইল</span>
                      </Link>
                      
                      {isAdmin && (
                        <Link href="/admin" onClick={() => setIsProfileOpen(false)} className="block px-4 py-3 text-sm hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3 text-emerald-400 font-bold">
                          <i className="fa-solid fa-shield-halved w-5 text-center"></i> <span>অ্যাডমিন প্যানেল</span>
                        </Link>
                      )}

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

      {/* 🔴 Slide-out Cart Panel */}
      <div className={`fixed inset-y-0 right-0 z-[70] w-full sm:w-96 bg-[#0a1c13] border-l border-white/10 shadow-2xl transform transition-transform duration-500 ease-in-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
          <h2 className="text-xl font-black text-white flex items-center gap-2"><i className="fa-solid fa-cart-shopping text-[#e76f51]"></i> আপনার কার্ট</h2>
          <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-white transition-colors text-2xl"><i className="fa-solid fa-xmark"></i></button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-32 text-gray-500">
              <i className="fa-solid fa-basket-shopping text-6xl mb-4 opacity-50"></i>
              <p className="text-sm font-bold">আপনার কার্ট ফাঁকা!</p>
              <Link href="/store" onClick={() => setIsCartOpen(false)} className="inline-block mt-4 text-[#e76f51] hover:text-white border border-[#e76f51] hover:bg-[#e76f51] px-4 py-2 rounded-full text-xs font-bold transition-colors">স্টোর ভিজিট করুন</Link>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.cartItemId} className="bg-white/5 border border-white/10 p-3 rounded-xl flex gap-3 hover:bg-white/10 transition-colors">
                <img src={item.gallery?.[0]?.url || item.image_url} alt={item.name} className="w-16 h-16 object-contain bg-black/40 rounded-lg p-1 border border-white/5" />
                <div className="flex-grow">
                  <h4 className="text-sm font-bold text-white truncate pr-4">{item.name}</h4>
                  <div className="text-[10px] text-gray-400 flex gap-2 my-1">
                    {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                    {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                    {item.orderType === 'rent' && <span className="text-emerald-400 font-bold border border-emerald-500/30 px-1 rounded">Rent: {item.rentDays} Days</span>}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-white text-sm">৳{item.current_price * item.qty * (item.rentDays || 1)}</span>
                    <div className="flex items-center gap-3 bg-black/50 rounded-lg px-2 py-1 border border-white/5">
                      <span className="text-xs text-gray-400 font-bold">Qty: {item.qty}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-white/10 bg-black/50">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-400 font-bold text-sm">সর্বমোট:</span>
            <span className="text-2xl font-black text-[#e76f51]">৳{cartTotal}</span>
          </div>
          <button 
            disabled={cart.length === 0} 
            onClick={() => { setIsCartOpen(false); router.push('/store'); }}
            className={`w-full py-4 rounded-xl font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${cart.length > 0 ? 'bg-[#e76f51] hover:bg-orange-600 text-white shadow-glow' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
          >
            চেকআউট করুন <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] transition-opacity"></div>
      )}

      {/* Sidebar Navigation */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-500 ease-in-out z-[50] w-72 sm:w-80 bg-[#0a1c13] border-r border-white/5 shadow-2xl flex flex-col h-full overflow-y-auto`}>
        <div className="p-6 flex justify-between items-center border-b border-white/5 bg-black/20">
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

          {/* 🔴 নতুন অপশন: CAS ব্লাডব্যাংক */}
          <Link href="/bloodbank" onClick={() => setIsSidebarOpen(false)} className="block py-3 px-4 rounded-xl hover:bg-white/5 hover:text-white transition-all group flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform"><i className="fa-solid fa-droplet"></i></div>
            <span className="font-bold text-sm">CAS ব্লাডব্যাংক</span>
          </Link>

          <Link href="/behind-the-scenes" onClick={() => setIsSidebarOpen(false)} className="block py-3 px-4 rounded-xl hover:bg-white/5 hover:text-white transition-all group flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform"><i className="fa-solid fa-users"></i></div>
            <span className="font-bold text-sm">নেপথ্যে যারা</span>
          </Link>

          {isAdmin && (
            <>
              <div className="border-t border-white/5 my-4"></div>
              <p className="text-[10px] font-black tracking-widest text-emerald-500 uppercase mb-4">অ্যাডমিন কন্ট্রোল</p>
              <Link href="/admin" onClick={() => setIsSidebarOpen(false)} className="block py-3 px-4 rounded-xl hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 transition-all group flex items-center gap-4 border border-transparent hover:border-emerald-500/30">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform"><i className="fa-solid fa-shield-halved"></i></div>
                <span className="font-bold text-sm">অ্যাডমিন প্যানেল</span>
              </Link>
            </>
          )}

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

      {/* Settings Modal (অসম্পূর্ণ অংশ সম্পূর্ণ করা হয়েছে) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-8 max-w-sm w-full relative z-10 shadow-2xl">
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
                  <p className="font-bold text-white text-sm">ডার্ক মোড</p>
                  <p className="text-xs text-gray-400 mt-1">অ্যাপের থিম পরিবর্তন করুন</p>
                </div>
                {/* Toggle Button Placeholder */}
                <button className="w-12 h-6 bg-[#e76f51] rounded-full relative transition-colors focus:outline-none">
                  <span className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full shadow transition-transform"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
