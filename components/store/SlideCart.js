"use client";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/app/store/useCartStore";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function SlideCart({
  isCartOpen,
  setIsCartOpen,
  cart,
  updateCartQty,
  cartTotal,
  openCheckoutModal
}) {
  const setCart = useCartStore((state) => state.setCart);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClearCart = () => {
    if (window.confirm("আপনি কি নিশ্চিত যে কার্টের সমস্ত আইটেম মুছে ফেলতে চান?")) {
      setCart([]);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Permanent Floating Cart Button */}
      {cart.length > 0 && (
        <button 
          onClick={() => setIsCartOpen(true)} 
          className="fixed bottom-24 right-6 z-[9990] bg-campfire text-white p-4 rounded-full shadow-md dark:shadow-glow hover:scale-110 transition-transform animate-bounce focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 dark:focus-visible:ring-offset-moss"
        >
          <i className="fa-solid fa-cart-shopping text-xl"></i>
          {/* Hardcoded hex removed, dynamic dark:bg-moss applied */}
          <span className="absolute -top-2 -right-2 bg-white dark:bg-moss text-campfire text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-campfire shadow-sm">
            {cart.length}
          </span>
        </button>
      )}

      {/* Slide-out Cart Panel with Backdrop Click-to-Close */}
      {isCartOpen && (
        <div 
          className="fixed inset-0 z-[9995] bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity" 
          onClick={() => setIsCartOpen(false)}
        ></div>
      )}

      {/* Slide Cart Panel (Transition conflict resolved, dark:bg-moss applied) */}
      <div className={`fixed inset-y-0 right-0 z-[9999] w-full sm:w-96 bg-white dark:bg-moss border-l border-gray-200 dark:border-white/10 shadow-2xl transform flex flex-col transition-all duration-500 ease-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-black/40 shrink-0 transition-colors">
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 transition-colors">
            <i className="fa-solid fa-cart-shopping text-campfire"></i> 
            আপনার কার্ট <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({cart.length}টি)</span>
          </h2>
          <button 
            onClick={() => setIsCartOpen(false)} 
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm dark:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campfire"
          >
            বন্ধ করুন <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
        
        {/* Clear Cart Button */}
        {cart.length > 0 && (
          <div className="px-4 pt-4 pb-2 flex justify-end shrink-0">
            <button 
              onClick={handleClearCart} 
              className="text-[11px] text-red-600 dark:text-red-400 hover:text-white bg-red-50 dark:bg-red-500/10 hover:bg-red-600 dark:hover:bg-red-500/30 border border-red-200 dark:border-red-500/20 px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-colors shadow-sm dark:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <i className="fa-solid fa-trash-can"></i> পুরো কার্ট মুছুন
            </button>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-32 text-gray-400 dark:text-gray-500 transition-colors">
              {/* Opacity conflict resolved, better visual balance */}
              <i className="fa-solid fa-basket-shopping text-6xl mb-4 text-gray-300 dark:text-gray-600"></i>
              <p className="text-sm font-bold text-gray-600 dark:text-gray-400">আপনার কার্ট সম্পূর্ণ ফাঁকা!</p>
              <Link href="/store" onClick={() => setIsCartOpen(false)} className="inline-block mt-4 text-campfire border border-campfire hover:bg-campfire hover:text-white px-5 py-2 rounded-full text-xs font-bold transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campfire focus-visible:ring-offset-2 dark:focus-visible:ring-offset-moss">
                স্টোরে ফিরে যান
              </Link>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.cartItemId} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-xl flex gap-3 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group shadow-sm dark:shadow-none">
                
                <Link href="/store" onClick={() => setIsCartOpen(false)} className="shrink-0 relative h-16 w-16 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campfire rounded-lg">
                  <Image 
                    src={item.gallery?.[0]?.url || item.image_url} 
                    alt={item.name} 
                    fill 
                    className="object-contain bg-white dark:bg-black/40 rounded-lg p-1 border border-gray-200 dark:border-white/5 group-hover:border-campfire/50 transition-colors shadow-sm dark:shadow-none" 
                    unoptimized 
                  />
                </Link>

                <div className="flex-grow min-w-0">
                  <Link href="/store" onClick={() => setIsCartOpen(false)} className="block truncate pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campfire rounded">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white hover:text-campfire transition-colors truncate">{item.name}</h4>
                  </Link>

                  <div className="text-[10px] text-gray-500 dark:text-gray-400 flex flex-wrap gap-2 my-1 transition-colors">
                    {item.selectedSize && <span className="bg-gray-200 dark:bg-white/5 px-1.5 rounded font-medium">Size: {item.selectedSize}</span>}
                    {item.selectedColor && <span className="bg-gray-200 dark:bg-white/5 px-1.5 rounded font-medium">Color: {item.selectedColor}</span>}
                    {item.orderType === 'rent' && <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 rounded font-bold">Rent: {item.rentDays} Days</span>}
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-gray-900 dark:text-white text-sm transition-colors">৳{item.current_price * item.qty * (item.rentDays || 1)}</span>
                    
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => updateCartQty(item.cartItemId, -item.qty, item.stock_quantity)} 
                        className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded" 
                        title="কার্ট থেকে মুছে ফেলুন"
                      >
                        <i className="fa-solid fa-trash text-sm"></i>
                      </button>

                      <div className="flex items-center gap-3 bg-white dark:bg-black/50 rounded-lg px-2 py-1 border border-gray-200 dark:border-white/5 shadow-inner dark:shadow-none transition-colors">
                        <button 
                          onClick={() => updateCartQty(item.cartItemId, -1, item.stock_quantity)} 
                          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campfire rounded"
                        >
                          <i className="fa-solid fa-minus text-[10px]"></i>
                        </button>
                        <span className="text-xs font-bold text-gray-900 dark:text-white w-3 text-center transition-colors">{item.qty}</span>
                        <button 
                          disabled={item.qty >= item.stock_quantity}
                          onClick={() => updateCartQty(item.cartItemId, 1, item.stock_quantity)} 
                          className={`p-1 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-campfire ${item.qty >= item.stock_quantity ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                          title={item.qty >= item.stock_quantity ? 'স্টক লিমিট শেষ' : 'আইটেম বাড়ান'}
                        >
                          <i className="fa-solid fa-plus text-[10px]"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 space-y-3 shrink-0 transition-colors">
          <div className="flex justify-between items-center mb-1 text-xl">
            <span className="text-gray-500 dark:text-gray-400 font-bold text-sm transition-colors">সর্বমোট:</span>
            <span className="font-black text-campfire transition-colors">৳{cartTotal}</span>
          </div>
          
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center pb-2 transition-colors">শিপিং এবং ট্যাক্স চেকআউটের সময় হিসাব করা হবে</p>

          {/* Hover logic fixed: hover:bg-[#d96247] ensures brand identity is maintained */}
          <button 
            disabled={cart.length === 0} 
            onClick={openCheckoutModal} 
            className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-moss focus-visible:ring-campfire ${cart.length > 0 ? 'bg-campfire hover:bg-[#d96247] text-white dark:shadow-glow hover:-translate-y-0.5' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
          >
            চেকআউট করুন
          </button>
        </div>

      </div>
    </>,
    document.body
  );
}
