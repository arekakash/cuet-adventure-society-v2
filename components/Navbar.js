"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/app/store/useCartStore";
import SlideCart from "@/components/store/SlideCart";

export default function Navbar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // থিম কন্ট্রোল স্টেট (ডিফল্ট লাইট/প্যাস্টেল)
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Zustand Global State
  const cart = useCartStore((state) => state.cart);
  const cartTotal = useCartStore((state) => state.getCartTotal());
  const setCart = useCartStore((state) => state.setCart); 
  
  // Dynamic State
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  
  const router = useRouter();
  const pathname = usePathname(); 
  const isActive = (path) => pathname === path;

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }

    let isMounted = true;

    const fetchUserProfile = async (userId) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, photo_url, role')
        .eq('id', userId)
        .single();
        
      if (isMounted) {
        if (error) {
          console.error("Profile fetch error:", error.message);
        } else if (data) {
          setUserProfile(data);
        }
      }
    };

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (isMounted) {
        setSession(session);
        if (session) fetchUserProfile(session.user.id);
      }
    };

    initializeAuth();

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

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsProfileOpen(false);
    router.refresh(); 
    router.push('/login');
  };

  const updateCartQty = (cartItemId, delta, stockLimit) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.qty + delta;
            if (newQty > 0 && newQty <= stockLimit) return { ...item, qty: newQty };
          }
          return item;
        })
        .filter((item) => item.qty > 0)
    );
  };

  const openCheckoutModal = () => {
    setIsCartOpen(false);
    router.push('/store/checkout');
  };

  const isLoggedIn = !!session;
  const isAdmin = userProfile?.role === 'admin';
  const avatarUrl = userProfile?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.full_name || 'User')}&background=e76f51&color=fff`;

  return (
    <>
      <nav className="fixed w-full z-40 bg-pastel-bg/80 dark:bg-moss/80 backdrop-blur-md transition-colors duration-500 shadow-soft dark:shadow-md border-b border-pastel-border dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className="text-pastel-text dark:text-white text-xl sm:text-2xl hover:text-campfire dark:hover:text-campfire transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campfire rounded-lg p-1">
              <i className="fa-solid fa-bars-staggered"></i>
            </button>
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              {/* 🔴 Premium Spinning Glow Orb (Tailwind Theme Integrated & Motion Reduced) */}
              <div className="relative inline-flex items-center justify-center p-1">
                <div className="absolute inset-[-25%] rounded-full opacity-60 dark:opacity-80 group-hover:opacity-100 animate-[spin_6s_linear_infinite] will-change-transform motion-reduce:animate-none bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0%,transparent_50%,theme(colors.rose.500)_60%,theme(colors.violet.500)_75%,theme(colors.campfire)_100%)]"></div>
                <div className="absolute inset-[-25%] rounded-full opacity-40 dark:opacity-60 blur-md animate-[spin_6s_linear_infinite] will-change-transform motion-reduce:animate-none bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0%,transparent_50%,theme(colors.rose.500)_60%,theme(colors.violet.500)_75%,theme(colors.campfire)_100%)]"></div>
                
                <div className="relative bg-white dark:bg-darkForest px-2.5 py-1 rounded-lg border border-pastel-border dark:border-white/10 shadow-sm z-10 transition-colors">
                  <span className="font-black text-xl sm:text-2xl tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-campfire to-red-500 dark:from-yellow-400 dark:via-campfire dark:to-red-500">
                    CAS
                  </span>
                </div>
              </div>
              <span className="font-black text-lg sm:text-xl tracking-widest text-pastel-text dark:text-white drop-shadow-sm dark:drop-shadow-md hidden sm:block transition-colors duration-500">CUET AS</span>
            </Link>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 relative">
            
            <button onClick={() => setIsCartOpen(true)} className="relative text-pastel-muted dark:text-gray-300 hover:text-campfire dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campfire rounded-lg p-1 group mt-1">
              <i className="fa-solid fa-cart-shopping text-xl sm:text-2xl group-hover:scale-110 transition-transform"></i>
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-campfire text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-moss animate-pulse transition-colors">
                  {cart.length}
                </span>
              )}
            </button>

            {!isLoggedIn ? (
              <div className="flex items-center gap-4 border-l border-pastel-border dark:border-white/10 pl-4 sm:pl-6 transition-colors duration-500">
                <Link href="/login" className="hidden sm:block text-sm font-bold text-pastel-muted dark:text-gray-300 hover:text-campfire dark:hover:text-white transition-colors border-b border-transparent hover:border-campfire dark:hover:border-white pb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campfire rounded">লগইন</Link>
                {/* 🔴 Account Khulun button hover color updated */}
                <Link href="/signup" className="inline-flex items-center gap-2 bg-campfire hover:bg-[#d96247] text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm tracking-wide shadow-md dark:shadow-glow transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campfire">
                  <i className="fa-solid fa-fire"></i> <span>অ্যাকাউন্ট খুলুন</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3 sm:gap-4 border-l border-pastel-border dark:border-white/10 pl-4 sm:pl-6 transition-colors duration-500">
                <div className="text-right hidden md:block pr-4 border-r border-pastel-border dark:border-white/10">
                  <p className="text-xs font-bold text-pastel-text dark:text-gray-200 transition-colors">{userProfile?.full_name || 'Explorer'}</p>
                  <p className={`text-[10px] uppercase tracking-widest transition-colors ${isAdmin ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-campfire'}`}>
                    {userProfile?.role || 'User'}
                  </p>
                </div>
                <div className="relative">
                  <button onClick={() => setIsProfileOpen(!isProfileOpen)} className={`block w-10 h-10 rounded-full border-2 p-0.5 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campfire transition-colors shadow-sm dark:shadow-glow ${isAdmin ? 'border-emerald-500 hover:border-emerald-600 dark:hover:border-white bg-emerald-50 dark:bg-emerald-500/10' : 'border-campfire hover:border-[#d96247] dark:hover:border-white bg-campfire/10 dark:bg-white/5'}`}>
                    <Image src={avatarUrl} alt="Profile" width={40} height={40} className="rounded-full object-cover" unoptimized={avatarUrl.includes('ui-avatars')} />
                  </button>
                  
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-darkForest border border-pastel-border dark:border-white/10 rounded-2xl shadow-lg dark:shadow-2xl py-2 z-50 text-pastel-text dark:text-gray-300 transition-colors duration-500 animate-[fadeIn_0.2s_ease-out]">
                      <Link href="/dashboard" onClick={() => setIsProfileOpen(false)} className="block px-4 py-3 text-sm hover:bg-pastel-bg dark:hover:bg-white/5 hover:text-pastel-text dark:hover:text-white transition-colors flex items-center gap-3">
                        <i className="fa-solid fa-user w-5 text-center text-campfire"></i> <span>আমার প্রোফাইল</span>
                      </Link>
                      
                      {isAdmin && (
                        <Link href="/admin" onClick={() => setIsProfileOpen(false)} className="block px-4 py-3 text-sm hover:bg-pastel-bg dark:hover:bg-white/5 hover:text-pastel-text dark:hover:text-white transition-colors flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold">
                          <i className="fa-solid fa-shield-halved w-5 text-center"></i> <span>অ্যাডমিন প্যানেল</span>
                        </Link>
                      )}

                      {/* 🔴 Missing Focus Rings Added */}
                      <button onClick={() => { setIsSettingsOpen(true); setIsProfileOpen(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-pastel-bg dark:hover:bg-white/5 hover:text-pastel-text dark:hover:text-white transition-colors flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campfire rounded">
                        <i className="fa-solid fa-gear w-5 text-center text-blue-500 dark:text-blue-400"></i> <span>সেটিংস</span>
                      </button>
                      <div className="border-t border-pastel-border dark:border-white/10 my-1 transition-colors"></div>
                      <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded">
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

      <SlideCart 
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        cart={cart}
        updateCartQty={updateCartQty}
        cartTotal={cartTotal}
        openCheckoutModal={openCheckoutModal}
      />

      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-[60] transition-opacity"></div>
      )}

      {/* Sidebar Navigation */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-500 ease-in-out z-[70] w-72 sm:w-80 bg-pastel-bg dark:bg-darkForest border-r border-pastel-border dark:border-white/5 shadow-soft dark:shadow-2xl flex flex-col h-full overflow-y-auto`}>
        {/* 🔴 Sidebar Header Visual Line Removed (Subtle Translucent Restored) */}
        <div className="p-6 flex justify-between items-center border-b border-pastel-border dark:border-white/5 bg-gray-50/50 dark:bg-black/20 shadow-sm dark:shadow-none transition-colors">
          <span className="font-black text-xl tracking-widest text-pastel-text dark:text-white"><span className="text-campfire">C</span>UET <span className="text-campfire">A</span>S</span>
          <button onClick={() => setIsSidebarOpen(false)} className="text-pastel-muted dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 text-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded p-1">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* 🔴 Sidebar Links (Consistent Active Background Hues) */}
        <div className="px-4 py-6 flex-grow space-y-3 text-pastel-muted dark:text-gray-300">
          <p className="text-[10px] font-black tracking-widest text-pastel-muted dark:text-gray-500 uppercase mb-2 px-2">আমাদের কার্যক্রম</p>
          
          <Link href="/events" onClick={() => setIsSidebarOpen(false)} 
            className={`block py-3 px-4 rounded-2xl transition-all group flex items-center gap-4 border ${isActive('/events') ? 'bg-campfire/10 text-pastel-text dark:text-white border-campfire/30 shadow-[0_0_15px_rgba(231,111,81,0.2)]' : 'bg-white dark:bg-white/5 border-pastel-border dark:border-transparent hover:border-campfire/30 hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(231,111,81,0.15)] hover:text-pastel-text dark:hover:text-white'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform shadow-sm dark:shadow-none ${isActive('/events') ? 'bg-campfire text-white' : 'bg-campfire/10 dark:bg-black/40 text-campfire group-hover:scale-110 group-hover:bg-campfire group-hover:text-white'}`}><i className="fa-solid fa-calendar-day"></i></div>
            <span className="font-bold text-sm">আপকামিং ইভেন্ট</span>
          </Link>
          
          <Link href="/past-events" onClick={() => setIsSidebarOpen(false)} 
            className={`block py-3 px-4 rounded-2xl transition-all group flex items-center gap-4 border ${isActive('/past-events') ? 'bg-gray-500/10 text-pastel-text dark:text-white border-gray-400/30 shadow-[0_0_15px_rgba(156,163,175,0.2)]' : 'bg-white dark:bg-white/5 border-pastel-border dark:border-transparent hover:border-gray-400/30 hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(156,163,175,0.15)] hover:text-pastel-text dark:hover:text-white'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform shadow-sm dark:shadow-none ${isActive('/past-events') ? 'bg-gray-500 text-white' : 'bg-gray-500/10 dark:bg-black/40 text-gray-500 group-hover:scale-110 group-hover:bg-gray-500 group-hover:text-white'}`}><i className="fa-solid fa-clock-rotate-left"></i></div>
            <span className="font-bold text-sm">পূর্ববর্তী ইভেন্ট</span>
          </Link>
          
          <Link href="/stories" onClick={() => setIsSidebarOpen(false)} 
            className={`block py-3 px-4 rounded-2xl transition-all group flex items-center gap-4 border ${isActive('/stories') ? 'bg-blue-500/10 text-pastel-text dark:text-white border-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-white dark:bg-white/5 border-pastel-border dark:border-transparent hover:border-blue-400/30 hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:text-pastel-text dark:hover:text-white'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform shadow-sm dark:shadow-none ${isActive('/stories') ? 'bg-blue-500 text-white' : 'bg-blue-500/10 dark:bg-black/40 text-blue-500 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white'}`}><i className="fa-solid fa-book-open-reader"></i></div>
            <span className="font-bold text-sm">অ্যাডভেঞ্চারের গল্প</span>
          </Link>
          
          <Link href="/leaderboard" onClick={() => setIsSidebarOpen(false)} 
            className={`block py-3 px-4 rounded-2xl transition-all group flex items-center gap-4 border ${isActive('/leaderboard') ? 'bg-yellow-500/10 text-pastel-text dark:text-white border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-white dark:bg-white/5 border-pastel-border dark:border-transparent hover:border-yellow-500/30 hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(234,179,8,0.15)] hover:text-pastel-text dark:hover:text-white'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform shadow-sm dark:shadow-none ${isActive('/leaderboard') ? 'bg-yellow-500 text-white' : 'bg-yellow-500/10 dark:bg-black/40 text-yellow-500 group-hover:scale-110 group-hover:bg-yellow-500 group-hover:text-white'}`}><i className="fa-solid fa-trophy"></i></div>
            <span className="font-bold text-sm">লিডারবোর্ড</span>
          </Link>
          
          <Link href="/store" onClick={() => setIsSidebarOpen(false)} 
            className={`block py-3 px-4 rounded-2xl transition-all group flex items-center gap-4 border ${isActive('/store') ? 'bg-orange-500/10 text-pastel-text dark:text-white border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'bg-white dark:bg-white/5 border-pastel-border dark:border-transparent hover:border-orange-500/30 hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(249,115,22,0.15)] hover:text-pastel-text dark:hover:text-white'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform shadow-sm dark:shadow-none ${isActive('/store') ? 'bg-orange-500 text-white' : 'bg-orange-500/10 dark:bg-black/40 text-orange-500 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white'}`}><i className="fa-solid fa-store"></i></div>
            <span className="font-bold text-sm">অ্যাডভেঞ্চার স্টোর</span>
          </Link>
          
          <Link href="/beginners-guide" onClick={() => setIsSidebarOpen(false)} 
            className={`block py-3 px-4 rounded-2xl transition-all group flex items-center gap-4 border ${isActive('/beginners-guide') ? 'bg-emerald-500/10 text-pastel-text dark:text-white border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-white dark:bg-white/5 border-pastel-border dark:border-transparent hover:border-emerald-500/30 hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:text-pastel-text dark:hover:text-white'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform shadow-sm dark:shadow-none ${isActive('/beginners-guide') ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 dark:bg-black/40 text-emerald-500 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white'}`}><i className="fa-solid fa-map"></i></div>
            <span className="font-bold text-sm">বিগিনার গাইড</span>
          </Link>
          
          <Link href="/event-calculator" onClick={() => setIsSidebarOpen(false)} 
            className={`block py-3 px-4 rounded-2xl transition-all group flex items-center gap-4 border ${isActive('/event-calculator') ? 'bg-purple-500/10 text-pastel-text dark:text-white border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-white dark:bg-white/5 border-pastel-border dark:border-transparent hover:border-purple-500/30 hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:text-pastel-text dark:hover:text-white'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform shadow-sm dark:shadow-none ${isActive('/event-calculator') ? 'bg-purple-600 text-white' : 'bg-purple-500/10 dark:bg-black/40 text-purple-600 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white'}`}><i className="fa-solid fa-calculator"></i></div>
            <span className="font-bold text-sm">ইভেন্ট ক্যালকুলেটর</span>
          </Link>
              
          <Link href="/bloodbank" onClick={() => setIsSidebarOpen(false)} 
            className={`block py-3 px-4 rounded-2xl transition-all group flex items-center gap-4 border ${isActive('/bloodbank') ? 'bg-red-500/10 text-pastel-text dark:text-white border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-white dark:bg-white/5 border-pastel-border dark:border-transparent hover:border-red-500/30 hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:text-pastel-text dark:hover:text-white'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform shadow-sm dark:shadow-none ${isActive('/bloodbank') ? 'bg-red-500 text-white' : 'bg-red-500/10 dark:bg-black/40 text-red-500 group-hover:scale-110 group-hover:bg-red-500 group-hover:text-white'}`}><i className="fa-solid fa-droplet"></i></div>
            <span className="font-bold text-sm">CAS ব্লাডব্যাংক</span>
          </Link>

          <Link href="/my-bangladesh" onClick={() => setIsSidebarOpen(false)} 
            className={`block py-3 px-4 rounded-2xl transition-all group flex items-center gap-4 border ${isActive('/my-bangladesh') ? 'bg-teal-500/10 text-pastel-text dark:text-white border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.2)]' : 'bg-white dark:bg-white/5 border-pastel-border dark:border-transparent hover:border-teal-500/30 hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(20,184,166,0.15)] hover:text-pastel-text dark:hover:text-white'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform shadow-sm dark:shadow-none ${isActive('/my-bangladesh') ? 'bg-teal-500 text-white' : 'bg-teal-500/10 dark:bg-black/40 text-teal-500 group-hover:scale-110 group-hover:bg-teal-500 group-hover:text-white'}`}>
              <i className="fa-solid fa-map-location-dot"></i>
            </div>
            <span className="font-bold text-sm">আমার বাংলাদেশ</span>
          </Link>

          <Link href="/behind-the-scenes" onClick={() => setIsSidebarOpen(false)} 
            className={`block py-3 px-4 rounded-2xl transition-all group flex items-center gap-4 border ${isActive('/behind-the-scenes') ? 'bg-pink-500/10 text-pastel-text dark:text-white border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.2)]' : 'bg-white dark:bg-white/5 border-pastel-border dark:border-transparent hover:border-pink-500/30 hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(236,72,153,0.15)] hover:text-pastel-text dark:hover:text-white'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform shadow-sm dark:shadow-none ${isActive('/behind-the-scenes') ? 'bg-pink-500 text-white' : 'bg-pink-500/10 dark:bg-black/40 text-pink-500 group-hover:scale-110 group-hover:bg-pink-500 group-hover:text-white'}`}><i className="fa-solid fa-users"></i></div>
            <span className="font-bold text-sm">নেপথ্যে যারা</span>
          </Link>

          {isAdmin && (
            <>
              <div className="border-t border-pastel-border dark:border-white/10 my-4 px-2"></div>
              <p className="text-[10px] font-black tracking-widest text-emerald-600 dark:text-emerald-500 uppercase mb-2 px-2">অ্যাডমিন কন্ট্রোল</p>
              <Link href="/admin" onClick={() => setIsSidebarOpen(false)} 
                className={`block py-3 px-4 rounded-2xl transition-all group flex items-center gap-4 border ${isActive('/admin') ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white dark:bg-white/5 border-pastel-border dark:border-transparent hover:border-emerald-500/40 hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform shadow-sm dark:shadow-none ${isActive('/admin') ? 'bg-emerald-600 text-white' : 'bg-emerald-500/10 dark:bg-black/40 text-emerald-500 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white'}`}><i className="fa-solid fa-shield-halved"></i></div>
                <span className="font-bold text-sm">অ্যাডমিন প্যানেল</span>
              </Link>
            </>
          )}

          <div className="border-t border-pastel-border dark:border-white/10 my-4 px-2"></div>
          
          <button onClick={() => { setIsSettingsOpen(true); setIsSidebarOpen(false); }} className="w-full text-left py-3 px-4 rounded-2xl transition-all group flex items-center gap-4 border bg-white dark:bg-white/5 border-pastel-border dark:border-transparent hover:border-gray-300 dark:hover:border-white/20 hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] text-pastel-muted dark:text-gray-400 hover:text-pastel-text dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campfire">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-black/40 shadow-sm dark:shadow-none flex items-center justify-center group-hover:scale-110 group-hover:bg-gray-800 group-hover:text-white transition-all"><i className="fa-solid fa-gear"></i></div>
            <span className="font-bold text-sm">সেটিংস</span>
          </button>
        </div>

        {!isLoggedIn && (
          <div className="p-6 border-t border-pastel-border dark:border-white/10 bg-white dark:bg-black/20 space-y-3 shrink-0">
            <Link href="/signup" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center justify-center gap-2 bg-campfire hover:bg-[#d96247] text-white py-3.5 rounded-xl font-bold transition-all shadow-md dark:shadow-glow hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campfire">
              <i className="fa-solid fa-user-astronaut"></i> <span>অ্যাকাউন্ট খুলুন</span>
            </Link>
            <Link href="/login" onClick={() => setIsSidebarOpen(false)} className="w-full flex items-center justify-center gap-2 border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 py-3.5 rounded-xl font-bold transition-all hover:-translate-y-0.5 shadow-sm dark:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campfire">
              <i className="fa-solid fa-right-to-bracket"></i> <span>লগইন করুন</span>
            </Link>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-sm z-[90]" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="bg-white dark:bg-moss border border-pastel-border dark:border-white/10 rounded-3xl p-8 max-w-sm w-full relative z-[100] shadow-soft dark:shadow-2xl transition-colors duration-500 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-center mb-6 border-b border-pastel-border dark:border-white/10 pb-4">
              <h3 className="text-xl font-black text-pastel-text dark:text-white flex items-center gap-2 transition-colors">
                <i className="fa-solid fa-sliders text-campfire"></i> <span>সেটিংস</span>
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-pastel-muted hover:text-pastel-text dark:text-gray-400 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campfire rounded p-1">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-pastel-text dark:text-white text-sm transition-colors">ডার্ক মোড</p>
                  <p className="text-xs text-pastel-muted dark:text-gray-400 mt-1 transition-colors">অ্যাপের থিম পরিবর্তন করুন</p>
                </div>
                
                <button 
                  onClick={toggleTheme}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-moss focus-visible:ring-campfire ${isDarkMode ? 'bg-campfire shadow-inner' : 'bg-gray-300 shadow-inner'}`}
                >
                  <span 
                    className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}
                  >
                    {isDarkMode ? <i className="fa-solid fa-moon text-[10px] text-campfire"></i> : <i className="fa-solid fa-sun text-[10px] text-yellow-500"></i>}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
