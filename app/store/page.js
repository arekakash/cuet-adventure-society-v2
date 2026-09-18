"use client";
import { useState, useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/store/ProductCard";

export default function AdventureStore() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("merch"); 
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // লিস্ট এবং গ্রিড ভিউ স্টেট
  const [viewMode, setViewMode] = useState('grid'); 

  useEffect(() => {
    AOS.init({ duration: 800, once: true });
    fetchProducts();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      if (session.user.email === 'admin@cuet.ac.bd' || session.user?.user_metadata?.role === 'admin') {
        setIsAdmin(true);
      }
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('store_products').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data);
    setLoading(false);
  };

  const filteredProducts = products.filter(item => item.category === activeTab);

  // 🔴 প্লেসহোল্ডার ফাংশন (পরবর্তী ধাপে এগুলো কাজ করবে)
  const handleProductClick = (product) => {
    console.log("Open Product Details for:", product.name);
    // setActiveModal('details'); (পরবর্তী ধাপে আসবে)
  };

  const handleProductAction = (e, product, actionType) => {
    console.log(`Action triggered: ${actionType} for`, product.name);
    // কার্ট বাটন চাপলে যা হবে তা পরবর্তী ধাপে (Step 2) যুক্ত হবে
  };

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12 relative" data-aos="fade-down">
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 tracking-tight drop-shadow-lg uppercase">
            অ্যাডভেঞ্চার <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e76f51] to-yellow-500">স্টোর</span>
          </h1>
          {isAdmin && <span className="bg-emerald-500 text-white text-xs px-3 py-1 rounded-full animate-pulse">Admin Mode Active</span>}
        </div>

        {/* Tabs & View Mode Toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 sm:mb-12 relative z-20" data-aos="fade-up">
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <button onClick={() => setActiveTab("merch")} className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 rounded-full font-bold text-xs sm:text-sm transition-all ${activeTab === "merch" ? "bg-[#e76f51] text-white shadow-glow scale-105" : "bg-white/5 text-gray-400 hover:text-white"}`}>
              <i className="fa-solid fa-shirt mr-1 sm:mr-2"></i> মার্চেন্ডাইজ
            </button>
            <button onClick={() => setActiveTab("gear")} className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 rounded-full font-bold text-xs sm:text-sm transition-all ${activeTab === "gear" ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105" : "bg-white/5 text-gray-400 hover:text-white"}`}>
              <i className="fa-solid fa-campground mr-1 sm:mr-2"></i> গিয়ার
            </button>
          </div>
          
          <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 shrink-0 self-end sm:self-auto">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>
              <i className="fa-solid fa-grid-2"></i>
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>
              <i className="fa-solid fa-list"></i>
            </button>
          </div>
        </div>

        {/* Product Grid / List Container */}
        {loading ? (
          <div className="flex justify-center items-center py-32"><i className="fa-solid fa-compass fa-spin text-5xl text-[#e76f51]"></i></div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6" : "flex flex-col gap-4"}>
            {filteredProducts.map((product, index) => (
              <div key={product.id} data-aos="fade-up" data-aos-delay={index * 50}>
                <ProductCard 
                  product={product} 
                  viewMode={viewMode}
                  activeTab={activeTab}
                  isAdmin={isAdmin}
                  onProductClick={handleProductClick}
                  onAction={handleProductAction}
                />
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
