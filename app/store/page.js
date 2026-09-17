"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";
import { supabase } from "@/lib/supabase";

export default function AdventureStore() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("merch"); // 'merch' অথবা 'gear'

  useEffect(() => {
    AOS.init({ duration: 800, once: true });
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const filteredProducts = products.filter(item => item.category === activeTab);

  const handleAddToCart = (product, type) => {
    alert(`"${product.name}" ${type === 'rent' ? 'ভাড়া নেওয়ার' : 'কেনার'} সিস্টেমটি আমরা পরবর্তী ধাপে তৈরি করব!`);
  };

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Store Hero Section */}
        <div className="text-center mb-12 relative" data-aos="fade-down">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#e76f51]/10 rounded-full blur-3xl pointer-events-none"></div>
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 tracking-tight relative z-10 drop-shadow-lg uppercase">
            অ্যাডভেঞ্চার <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e76f51] to-yellow-500">স্টোর</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-lg relative z-10 max-w-2xl mx-auto">
            অফিসিয়াল মার্চেন্ডাইজ কিনুন অথবা আপনার পরবর্তী ট্যুরের জন্য প্রয়োজনীয় গিয়ার ভাড়া নিন সাশ্রয়ী মূল্যে।
          </p>
        </div>

        {/* Dual Tab Navigation */}
        <div className="flex justify-center items-center gap-4 mb-12 relative z-20" data-aos="fade-up">
          <button 
            onClick={() => setActiveTab("merch")}
            className={`px-6 py-3 rounded-full font-bold text-sm sm:text-base transition-all duration-300 flex items-center gap-2 ${activeTab === "merch" ? "bg-[#e76f51] text-white shadow-[0_0_20px_rgba(231,111,81,0.4)] scale-105" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"}`}
          >
            <i className="fa-solid fa-shirt"></i> মার্চেন্ডাইজ (Buy)
          </button>
          
          <button 
            onClick={() => setActiveTab("gear")}
            className={`px-6 py-3 rounded-full font-bold text-sm sm:text-base transition-all duration-300 flex items-center gap-2 ${activeTab === "gear" ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-105" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"}`}
          >
            <i className="fa-solid fa-campground"></i> গিয়ার (Rent / Buy)
          </button>
        </div>

        {/* Product Grid Area */}
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <i className="fa-solid fa-compass fa-spin text-5xl text-[#e76f51]"></i>
          </div>
        ) : (
          <>
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8 relative z-10">
                {filteredProducts.map((product, index) => (
                  <div 
                    key={product.id} 
                    className="glass-dark bg-[#0a1c13]/80 border border-white/10 rounded-3xl overflow-hidden shadow-xl hover:shadow-[0_0_30px_rgba(231,111,81,0.15)] hover:border-[#e76f51]/50 transition-all duration-500 group flex flex-col"
                    data-aos="fade-up"
                    data-aos-delay={index * 100}
                  >
                    {/* Product Image */}
                    <div className="relative h-56 w-full overflow-hidden bg-white/5 flex items-center justify-center p-4">
                      {product.stock_quantity <= 0 && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center">
                          <span className="bg-red-500 text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full rotate-12 shadow-lg">
                            Out of Stock
                          </span>
                        </div>
                      )}
                      <img 
                        src={product.image_url || "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&q=80&w=600"} 
                        alt={product.name} 
                        className={`w-full h-full object-contain transition-transform duration-700 group-hover:scale-110 ${product.stock_quantity <= 0 ? 'grayscale' : ''}`}
                      />
                      
                      {/* Dynamic Price Tag Badge */}
                      <div className="absolute top-4 right-4 bg-[#050b08]/80 backdrop-blur-md border border-white/10 text-white font-black px-3 py-1.5 rounded-xl text-sm shadow-lg z-10 flex flex-col items-end">
                        {activeTab === 'merch' ? (
                          <span>৳{product.sale_price}</span>
                        ) : (
                          <>
                            {product.rent_price > 0 && <span>৳{product.rent_price} <span className="text-[10px] text-gray-400 font-normal">/ দিন</span></span>}
                            {product.sale_price > 0 && <span className="text-[10px] text-[#e76f51] mt-0.5 border-t border-white/10 pt-0.5">কেনা: ৳{product.sale_price}</span>}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="p-5 flex-grow flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-black text-white mb-1 group-hover:text-[#e76f51] transition-colors line-clamp-1">{product.name}</h3>
                        <p className="text-xs text-gray-400 line-clamp-2 mb-3">{product.description || 'চমৎকার এই আইটেমটি আপনার অ্যাডভেঞ্চারকে আরও সহজ করে তুলবে।'}</p>
                        
                        {/* Sizes (If Merch) */}
                        {activeTab === 'merch' && product.sizes && product.sizes.length > 0 && (
                          <div className="flex gap-2 mb-4">
                            {product.sizes.map(size => (
                              <span key={size} className="text-[10px] font-bold text-gray-300 bg-white/5 border border-white/10 px-2 py-1 rounded-md">
                                {size}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Dynamic Buttons */}
                      <div className="flex gap-2 mt-4">
                        {activeTab === 'merch' ? (
                          <button 
                            onClick={() => handleAddToCart(product, 'buy')}
                            disabled={product.stock_quantity <= 0}
                            className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${product.stock_quantity > 0 ? 'bg-[#e76f51] hover:bg-orange-600 text-white shadow-glow' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
                          >
                            <i className="fa-solid fa-cart-plus"></i> কার্টে যোগ করুন
                          </button>
                        ) : (
                          <>
                            {product.rent_price > 0 && (
                              <button 
                                onClick={() => handleAddToCart(product, 'rent')}
                                disabled={product.stock_quantity <= 0}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${product.stock_quantity > 0 ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
                              >
                                <i className="fa-solid fa-calendar-check"></i> ভাড়া নিন
                              </button>
                            )}
                            {product.sale_price > 0 && (
                              <button 
                                onClick={() => handleAddToCart(product, 'buy')}
                                disabled={product.stock_quantity <= 0}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${product.stock_quantity > 0 ? 'bg-[#e76f51] hover:bg-orange-600 text-white shadow-glow' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
                              >
                                <i className="fa-solid fa-bag-shopping"></i> কিনে নিন
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 max-w-2xl mx-auto" data-aos="zoom-in">
                <i className={`fa-solid ${activeTab === 'merch' ? 'fa-box-open' : 'fa-campground'} text-6xl text-gray-600 mb-6 opacity-50`}></i>
                <h3 className="text-2xl font-black text-gray-300 mb-2 uppercase tracking-widest">স্টক আপডেট চলছে</h3>
                <p className="text-gray-500 text-sm">খুব শিগগিরই এখানে চমৎকার সব {activeTab === 'merch' ? 'মার্চেন্ডাইজ' : 'গিয়ার'} যুক্ত করা হবে। চোখ রাখুন!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
