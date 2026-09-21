"use client";
import { useState, useEffect } from "react";

// 🔴 Auto-Slideshow Component
const ProductSlider = ({ images, altText }) => {
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (!images || images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % images.length);
    }, 3000); 
    return () => clearInterval(interval);
  }, [images]);

  if (!images || images.length === 0) return null;
  
  return (
    <img 
      src={images[currentIdx].url || images[currentIdx]} 
      alt={altText} 
      className="w-full h-full object-contain transition-opacity duration-1000 ease-in-out" 
    />
  );
};

export default function ProductCard({ product, viewMode, activeTab, isAdmin, onProductClick, onAction, onAdminAction }) {
  // ইমেজ গ্যালারি সেটআপ
  const images = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image_url];
  
  // ডিসকাউন্ট ক্যালকুলেশন
  const hasDiscount = product.discount_price > 0 && product.discount_price < product.sale_price;
  const discountPercent = hasDiscount ? Math.round(((product.sale_price - product.discount_price) / product.sale_price) * 100) : 0;
  const discountAmount = hasDiscount ? (product.sale_price - product.discount_price) : 0;
  
  // আউট অফ স্টক লজিক
  const isOutOfStock = product.stock_quantity <= 0;
  const isClickable = !isOutOfStock || isAdmin;

  return (
    <div 
      onClick={() => { if (isClickable) onProductClick(product); }}
      className={`bg-[#0a1c13]/80 border border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all relative group flex
        ${!isClickable ? 'opacity-50 grayscale pointer-events-none' : 'hover:border-[#e76f51]/50 cursor-pointer'} 
        ${viewMode === 'list' ? 'flex-row items-stretch h-36 sm:h-48' : 'flex-col h-[320px] sm:h-[400px]'}`} /* 🔴 কার্ডের হাইট ফিক্সড করে লম্বা করা হয়েছে */
    >
      
      {/* 🔴 Admin Controls */}
      {isAdmin && (
        <div className={`absolute z-30 flex opacity-90 group-hover:opacity-100 transition-opacity 
          ${viewMode === 'list' ? 'bottom-2 right-2 flex-row gap-1.5' : 'top-2 left-2 flex-row sm:flex-col gap-1.5'}`}>
          <button onClick={(e) => onAdminAction(e, product, 'edit')} className="bg-purple-500/90 hover:bg-purple-500 text-white p-2 rounded-lg text-[10px] sm:text-xs backdrop-blur-sm shadow-lg" title="এডিট"><i className="fa-solid fa-pen"></i></button>
          <button onClick={(e) => onAdminAction(e, product, 'discount')} className="bg-blue-500/90 hover:bg-blue-500 text-white p-2 rounded-lg text-[10px] sm:text-xs backdrop-blur-sm shadow-lg" title="ডিসকাউন্ট"><i className="fa-solid fa-tag"></i></button>
          <button onClick={(e) => onAdminAction(e, product, 'delete')} className="bg-red-500/90 hover:bg-red-500 text-white p-2 rounded-lg text-[10px] sm:text-xs backdrop-blur-sm shadow-lg" title="ডিলিট"><i className="fa-solid fa-trash"></i></button>
        </div>
      )}

      {/* 🔴 ডিসকাউন্ট ব্যাজ */}
      {hasDiscount && !isOutOfStock && (
        <div className={`absolute z-20 bg-red-500 text-white font-black uppercase shadow-lg animate-pulse flex flex-col items-center justify-center
          ${viewMode === 'list' ? 'top-2 right-2 px-2 py-1 text-[9px] rounded' : 'top-3 right-3 px-3 py-1.5 text-xs rounded-full rotate-3'}`}>
          <span>{discountPercent}% OFF</span>
          <span className="text-[8px] sm:text-[9px] font-medium tracking-widest block mt-0.5">(Save ৳{discountAmount})</span>
        </div>
      )}

      {/* 🔴 আউট অফ স্টক ব্যাজ */}
      {isOutOfStock && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex items-center justify-center pointer-events-none">
          <span className="bg-gray-800 border border-gray-600 text-white text-xs sm:text-lg font-black uppercase px-4 py-2 rounded-full -rotate-12 shadow-2xl tracking-widest">
            Out of Stock
          </span>
        </div>
      )}

      {/* 🔴 ইমেজ কন্টেইনার (হাইট বাড়ানো হয়েছে) */}
      <div className={`relative overflow-hidden bg-white/5 flex items-center justify-center p-3 shrink-0 
        ${viewMode === 'list' ? 'w-32 sm:w-48 border-r border-white/5' : 'h-40 sm:h-56 w-full'}`}>
        <ProductSlider images={images} altText={product.name} />
      </div>

      {/* 🔴 কন্টেন্ট এরিয়া (টেক্সট বড় করা হয়েছে) */}
      <div className={`p-3 sm:p-5 flex-grow flex flex-col justify-between z-10 bg-gradient-to-t from-black via-black/80 to-transparent overflow-hidden ${viewMode === 'list' ? 'w-full' : ''}`}>
        
        <div className="overflow-hidden">
          {/* 🔴 প্রোডাক্টের নাম (২ লাইন পর্যন্ত অ্যালাও করা হয়েছে, ফন্ট বড় করা হয়েছে) */}
          <h3 className={`font-black text-white leading-tight mb-1.5 line-clamp-2 ${viewMode === 'list' ? 'text-sm sm:text-xl' : 'text-sm sm:text-lg'}`}>
            {product.name}
          </h3>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-3">
            {activeTab === 'merch' || product.sale_price > 0 ? (
              <div className="flex items-end gap-1.5">
                <span className={`font-black text-[#e76f51] ${viewMode === 'list' ? 'text-lg sm:text-2xl' : 'text-base sm:text-xl'}`}>
                  ৳{hasDiscount ? product.discount_price : product.sale_price}
                </span>
                {hasDiscount && (
                  <span className="text-[10px] sm:text-xs text-gray-500 line-through font-bold mb-0.5">৳{product.sale_price}</span>
                )}
              </div>
            ) : null}
            
            {product.rent_price > 0 && (
              <span className="text-emerald-400 font-black text-xs sm:text-sm bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 w-fit">
                ৳{product.rent_price}/দিন
              </span>
            )}
          </div>
        </div>

        {/* 🔴 বাটন এরিয়া (আইকনের নিচে স্পষ্ট লেখা) */}
        <div className="flex gap-2 mt-auto">
          {activeTab === 'merch' ? (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); onAction(e, product, 'add_cart'); }} 
                disabled={isOutOfStock && !isAdmin} 
                className="flex-1 flex flex-col items-center justify-center py-2 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/5"
              >
                <i className="fa-solid fa-cart-plus text-sm sm:text-base mb-1"></i>
                <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase">কার্টে নিন</span>
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); onAction(e, product, 'buy_now'); }} 
                disabled={isOutOfStock && !isAdmin} 
                className="flex-1 flex flex-col items-center justify-center py-2 sm:py-2.5 rounded-xl bg-[#e76f51] hover:bg-orange-600 text-white shadow-glow border border-[#e76f51]/50 transition-colors"
              >
                <i className="fa-solid fa-bolt text-sm sm:text-base mb-1"></i>
                <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase">কিনুন</span>
              </button>
            </>
          ) : (
            <>
              {product.rent_price > 0 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onAction(e, product, 'rent'); }} 
                  disabled={isOutOfStock && !isAdmin} 
                  className="flex-1 flex flex-col items-center justify-center py-2 sm:py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-400/50 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  <i className="fa-solid fa-calendar-check text-sm sm:text-base mb-1"></i>
                  <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase">ভাড়া নিন</span>
                </button>
              )}
              {product.sale_price > 0 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onAction(e, product, 'buy_now'); }} 
                  disabled={isOutOfStock && !isAdmin} 
                  className="flex-1 flex flex-col items-center justify-center py-2 sm:py-2.5 rounded-xl bg-[#e76f51] hover:bg-orange-600 text-white shadow-glow border border-[#e76f51]/50 transition-colors"
                >
                  <i className="fa-solid fa-bag-shopping text-sm sm:text-base mb-1"></i>
                  <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase">কিনুন</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
