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

export default function ProductCard({ product, viewMode, activeTab, isAdmin, onProductClick, onAction }) {
  // ইমেজ গ্যালারি সেটআপ
  const images = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image_url];
  
  // ডিসকাউন্ট ক্যালকুলেশন
  const hasDiscount = product.discount_price > 0 && product.discount_price < product.sale_price;
  const discountPercent = hasDiscount ? Math.round(((product.sale_price - product.discount_price) / product.sale_price) * 100) : 0;
  const discountAmount = hasDiscount ? (product.sale_price - product.discount_price) : 0;
  
  // আউট অফ স্টক লজিক
  const isOutOfStock = product.stock_quantity <= 0;
  
  // ইউজার/গেস্ট হলে আউট-অফ-স্টক প্রোডাক্টে ক্লিক করা যাবে না, কিন্তু অ্যাডমিন হলে যাবে
  const isClickable = !isOutOfStock || isAdmin;

  return (
    <div 
      onClick={() => { if (isClickable) onProductClick(product); }}
      className={`bg-[#0a1c13]/80 border border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all relative group 
        ${!isClickable ? 'opacity-50 grayscale pointer-events-none' : 'hover:border-[#e76f51]/50 cursor-pointer'} 
        ${viewMode === 'list' ? 'flex flex-row items-stretch h-32 sm:h-48' : 'flex flex-col h-full'}`}
    >
      
      {/* 🔴 ডিসকাউন্ট ব্যাজ */}
      {hasDiscount && !isOutOfStock && (
        <div className={`absolute z-20 bg-red-500 text-white font-black uppercase shadow-lg animate-pulse flex flex-col items-center justify-center
          ${viewMode === 'list' ? 'top-2 right-2 px-2 py-0.5 text-[9px] rounded-lg' : 'top-3 right-3 px-3 py-1 text-xs rounded-full rotate-3'}`}>
          <span>{discountPercent}% OFF</span>
          <span className="text-[8px] font-medium tracking-widest">(Save ৳{discountAmount})</span>
        </div>
      )}

      {/* 🔴 আউট অফ স্টক ব্যাজ */}
      {isOutOfStock && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex items-center justify-center pointer-events-none">
          <span className="bg-gray-800 border border-gray-600 text-white text-xs sm:text-sm font-bold uppercase px-4 sm:px-6 py-1.5 sm:py-2 rounded-full -rotate-12 shadow-2xl">
            Out of Stock
          </span>
        </div>
      )}

      {/* 🔴 ইমেজ কন্টেইনার */}
      <div className={`relative overflow-hidden bg-white/5 flex items-center justify-center p-2 shrink-0 
        ${viewMode === 'list' ? 'w-28 sm:w-40 border-r border-white/5' : 'h-48 sm:h-56 w-full'}`}>
        <ProductSlider images={images} altText={product.name} />
      </div>

      {/* 🔴 কন্টেন্ট এরিয়া */}
      <div className={`p-3 sm:p-5 flex-grow flex flex-col justify-between z-10 bg-gradient-to-t from-black/80 to-transparent overflow-hidden ${viewMode === 'list' ? 'w-full' : ''}`}>
        <div className="overflow-hidden">
          <h3 className={`font-black text-white mb-1 truncate ${viewMode === 'list' ? 'text-sm sm:text-lg' : 'text-base sm:text-lg'}`}>
            {product.name}
          </h3>
          
          <div className="flex flex-wrap items-end gap-1.5 sm:gap-2 mb-2">
            {activeTab === 'merch' || product.sale_price > 0 ? (
              <div className="flex items-center gap-2">
                <span className={`font-black text-[#e76f51] ${viewMode === 'list' ? 'text-sm sm:text-xl' : 'text-lg sm:text-xl'}`}>
                  ৳{hasDiscount ? product.discount_price : product.sale_price}
                </span>
                {hasDiscount && (
                  <span className="text-[10px] sm:text-xs text-gray-500 line-through">৳{product.sale_price}</span>
                )}
              </div>
            ) : null}
            {product.rent_price > 0 && (
              <span className="text-emerald-400 font-bold ml-auto text-[10px] sm:text-sm">৳{product.rent_price}/দিন</span>
            )}
          </div>
        </div>

        {/* 🔴 বাটন এরিয়া */}
        <div className="flex gap-1.5 sm:gap-2 mt-auto">
          {activeTab === 'merch' ? (
            <>
              <button onClick={(e) => { e.stopPropagation(); onAction(e, product, 'add_cart'); }} disabled={isOutOfStock && !isAdmin} className="flex-1 py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center gap-1"><i className="fa-solid fa-cart-plus"></i><span className="hidden sm:inline">কার্টে নিন</span></button>
              <button onClick={(e) => { e.stopPropagation(); onAction(e, product, 'buy_now'); }} disabled={isOutOfStock && !isAdmin} className="flex-1 py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs bg-[#e76f51] hover:bg-orange-600 text-white shadow-glow flex items-center justify-center gap-1"><i className="fa-solid fa-bolt"></i><span className="hidden sm:inline">কিনুন</span></button>
            </>
          ) : (
            <>
              {product.rent_price > 0 && <button onClick={(e) => { e.stopPropagation(); onAction(e, product, 'rent'); }} disabled={isOutOfStock && !isAdmin} className="flex-1 py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center gap-1"><i className="fa-solid fa-calendar-check"></i><span className="hidden sm:inline">ভাড়া নিন</span></button>}
              {product.sale_price > 0 && <button onClick={(e) => { e.stopPropagation(); onAction(e, product, 'buy_now'); }} disabled={isOutOfStock && !isAdmin} className="flex-1 py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs bg-[#e76f51] hover:bg-orange-600 text-white flex items-center justify-center gap-1"><i className="fa-solid fa-cart-plus"></i><span className="hidden sm:inline">কিনুন</span></button>}
            </>
          )}
        </div>
      </div>
      
      {/* 🔴 Admin Controls (Placeholder - will be added in Step 3) */}
      {isAdmin && (
        <div className="absolute top-2 left-2 z-30 flex gap-1">
          {/* <AdminControls product={product} /> */}
        </div>
      )}
    </div>
  );
}
