"use client";
import { useState, useEffect } from "react";

// 🔴 Auto-Slideshow Component (Transition and Blend Mode Fixed)
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
      className={`bg-white/90 dark:bg-moss/80 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-soft dark:shadow-xl transition-all duration-500 relative group flex
        ${!isClickable ? 'opacity-60 dark:opacity-50 grayscale pointer-events-none' : 'hover:border-campfire/50 hover:shadow-md cursor-pointer'} 
        ${viewMode === 'list' ? 'flex-row items-stretch h-36 sm:h-48' : 'flex-col h-[320px] sm:h-[400px]'}`} 
    >
      
      {/* Admin Controls */}
      {isAdmin && (
        <div className={`absolute z-30 flex opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity 
          ${viewMode === 'list' ? 'bottom-2 right-2 flex-row gap-1.5' : 'top-2 left-2 flex-row sm:flex-col gap-1.5'}`}>
          <button onClick={(e) => onAdminAction(e, product, 'edit')} className="bg-purple-500/90 hover:bg-purple-600 text-white p-2 rounded-lg text-[10px] sm:text-xs backdrop-blur-sm shadow-sm dark:shadow-lg transition-colors" title="এডিট"><i className="fa-solid fa-pen"></i></button>
          <button onClick={(e) => onAdminAction(e, product, 'discount')} className="bg-blue-500/90 hover:bg-blue-600 text-white p-2 rounded-lg text-[10px] sm:text-xs backdrop-blur-sm shadow-sm dark:shadow-lg transition-colors" title="ডিসকাউন্ট"><i className="fa-solid fa-tag"></i></button>
          <button onClick={(e) => onAdminAction(e, product, 'delete')} className="bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-lg text-[10px] sm:text-xs backdrop-blur-sm shadow-sm dark:shadow-lg transition-colors" title="ডিলিট"><i className="fa-solid fa-trash"></i></button>
        </div>
      )}

      {/* ডিসকাউন্ট ব্যাজ */}
      {hasDiscount && !isOutOfStock && (
        <div className={`absolute z-20 bg-red-500 text-white font-black uppercase shadow-sm dark:shadow-lg animate-pulse flex flex-col items-center justify-center transition-colors
          ${viewMode === 'list' ? 'top-2 right-2 px-2 py-1 text-[9px] rounded' : 'top-3 right-3 px-3 py-1.5 text-xs rounded-full rotate-3'}`}>
          <span>{discountPercent}% OFF</span>
          <span className="text-[8px] sm:text-[9px] font-medium tracking-widest block mt-0.5">(Save ৳{discountAmount})</span>
        </div>
      )}

      {/* 🔴 আউট অফ স্টক ব্যাজ (Contrast Improved) */}
      {isOutOfStock && (
        <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[2px] z-20 flex items-center justify-center pointer-events-none transition-colors">
          <span className="bg-gray-200 dark:bg-gray-800 border border-gray-400 dark:border-gray-600 text-gray-700 dark:text-white text-xs sm:text-lg font-black uppercase px-4 py-2 rounded-full -rotate-12 shadow-md dark:shadow-2xl tracking-widest transition-colors">
            Out of Stock
          </span>
        </div>
      )}

      {/* 🔴 ইমেজ কন্টেইনার (bg-white for seamless blending) */}
      <div className={`relative overflow-hidden bg-white dark:bg-white/5 flex items-center justify-center p-3 shrink-0 transition-colors duration-500
        ${viewMode === 'list' ? 'w-32 sm:w-48 border-r border-gray-200 dark:border-white/5' : 'h-40 sm:h-56 w-full'}`}>
        <ProductSlider images={images} altText={product.name} />
      </div>

      {/* 🔴 কন্টেন্ট এরিয়া (Smooth Gradient Transition Fixed) */}
      <div className={`p-3 sm:p-5 flex-grow flex flex-col justify-between z-10 bg-gradient-to-t from-white via-white to-white dark:from-black dark:via-black/80 dark:to-transparent overflow-hidden transition-all duration-500 ${viewMode === 'list' ? 'w-full' : ''}`}>
        
        <div className="overflow-hidden">
          <h3 className={`font-black text-gray-900 dark:text-white leading-tight mb-1.5 line-clamp-2 transition-colors ${viewMode === 'list' ? 'text-sm sm:text-xl' : 'text-sm sm:text-lg'}`}>
            {product.name}
          </h3>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-3">
            {activeTab === 'merch' || product.sale_price > 0 ? (
              <div className="flex items-end gap-1.5">
                <span className={`font-black text-campfire transition-colors ${viewMode === 'list' ? 'text-lg sm:text-2xl' : 'text-base sm:text-xl'}`}>
                  ৳{hasDiscount ? product.discount_price : product.sale_price}
                </span>
                {hasDiscount && (
                  <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 line-through font-bold mb-0.5 transition-colors">৳{product.sale_price}</span>
                )}
              </div>
            ) : null}
            
            {product.rent_price > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400 font-black text-xs sm:text-sm bg-emerald-50 dark:bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-400/20 w-fit transition-colors">
                ৳{product.rent_price}/দিন
              </span>
            )}
          </div>
        </div>

        {/* বাটন এরিয়া */}
        <div className="flex gap-2 mt-auto">
          {activeTab === 'merch' ? (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); onAction(e, product, 'add_cart'); }} 
                disabled={isOutOfStock && !isAdmin} 
                className="flex-1 flex flex-col items-center justify-center py-2 sm:py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-white transition-colors border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none"
              >
                <i className="fa-solid fa-cart-plus text-sm sm:text-base mb-1"></i>
                <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase">কার্টে নিন</span>
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); onAction(e, product, 'buy_now'); }} 
                disabled={isOutOfStock && !isAdmin} 
                className="flex-1 flex flex-col items-center justify-center py-2 sm:py-2.5 rounded-xl bg-campfire hover:bg-orange-600 text-white shadow-md dark:shadow-glow border border-transparent dark:border-campfire/50 transition-colors"
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
                  className="flex-1 flex flex-col items-center justify-center py-2 sm:py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white border border-transparent dark:border-emerald-400/50 transition-colors shadow-md dark:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  <i className="fa-solid fa-calendar-check text-sm sm:text-base mb-1"></i>
                  <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase">ভাড়া নিন</span>
                </button>
              )}
              {product.sale_price > 0 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onAction(e, product, 'buy_now'); }} 
                  disabled={isOutOfStock && !isAdmin} 
                  className="flex-1 flex flex-col items-center justify-center py-2 sm:py-2.5 rounded-xl bg-campfire hover:bg-orange-600 text-white shadow-md dark:shadow-glow border border-transparent dark:border-campfire/50 transition-colors"
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
