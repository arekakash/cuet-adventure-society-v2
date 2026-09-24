"use client";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/app/store/useCartStore";


export default function SlideCart({
  isCartOpen,
  setIsCartOpen,
  cart,
  updateCartQty,
  cartTotal,
  openCheckoutModal
}) {
  // গ্লোবাল স্টোর থেকে setCart নিয়ে আসা হলো "ক্লিয়ার কার্ট" ফিচারের জন্য
  const setCart = useCartStore((state) => state.setCart);

  const handleClearCart = () => {
    if (window.confirm("আপনি কি নিশ্চিত যে কার্টের সমস্ত আইটেম মুছে ফেলতে চান?")) {
      setCart([]);
    }
  };

  return (
    <>
      {/* 🔴 Permanent Floating Cart Button */}
      {cart.length > 0 && (
        <button 
          onClick={() => setIsCartOpen(true)} 
          className="fixed bottom-6 right-6 z-40 bg-[#e76f51] text-white p-4 rounded-full shadow-[0_0_30px_rgba(231,111,81,0.5)] hover:scale-110 transition-transform animate-bounce focus:outline-none"
        >
          <i className="fa-solid fa-cart-shopping text-xl"></i>
          <span className="absolute -top-2 -right-2 bg-white text-[#e76f51] text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#e76f51]">
            {cart.length}
          </span>
        </button>
      )}

      {/* 🔴 Slide-out Cart Panel with Backdrop Click-to-Close */}
      {isCartOpen && (
        <div 
          className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm transition-opacity" 
          onClick={() => setIsCartOpen(false)}
        ></div>
      )}

      <div className={`fixed inset-y-0 right-0 z-[70] w-full sm:w-96 bg-[#0a1c13] border-l border-white/10 shadow-2xl transform transition-transform duration-500 ease-out flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header - Item Count যুক্ত করা হয়েছে */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40 shrink-0">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <i className="fa-solid fa-cart-shopping text-[#e76f51]"></i> 
            আপনার কার্ট <span className="text-sm font-normal text-gray-400">({cart.length}টি)</span>
          </h2>
          <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 focus:outline-none">
            বন্ধ করুন <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
        
        {/* Clear Cart Button */}
        {cart.length > 0 && (
          <div className="px-4 pt-4 pb-2 flex justify-end shrink-0">
            <button 
              onClick={handleClearCart} 
              className="text-[11px] text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/30 border border-red-500/20 px-3 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition-colors focus:outline-none"
            >
              <i className="fa-solid fa-trash-can"></i> পুরো কার্ট মুছুন
            </button>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-32 opacity-50">
              <i className="fa-solid fa-basket-shopping text-6xl mb-4"></i>
              <p className="text-sm font-bold">আপনার কার্ট সম্পূর্ণ ফাঁকা!</p>
              <Link href="/store" onClick={() => setIsCartOpen(false)} className="inline-block mt-4 text-[#e76f51] border border-[#e76f51] hover:bg-[#e76f51] hover:text-white px-5 py-2 rounded-full text-xs font-bold transition-colors">
                স্টোরে ফিরে যান
              </Link>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.cartItemId} className="bg-white/5 border border-white/10 p-3 rounded-xl flex gap-3 hover:bg-white/10 transition-colors group">
                
                {/* Product Linking & Image Optimization */}
                <Link href="/store" onClick={() => setIsCartOpen(false)} className="shrink-0 relative h-16 w-16 block">
                  <Image 
                    src={item.gallery?.[0]?.url || item.image_url} 
                    alt={item.name} 
                    fill 
                    className="object-contain bg-black/40 rounded-lg p-1 border border-white/5 group-hover:border-[#e76f51]/50 transition-colors" 
                    unoptimized 
                  />
                </Link>

                <div className="flex-grow min-w-0">
                  <Link href="/store" onClick={() => setIsCartOpen(false)} className="block truncate pr-2">
                    <h4 className="text-sm font-bold text-white hover:text-[#e76f51] transition-colors truncate">{item.name}</h4>
                  </Link>

                  <div className="text-[10px] text-gray-400 flex flex-wrap gap-2 my-1">
                    {item.selectedSize && <span className="bg-white/5 px-1.5 rounded">Size: {item.selectedSize}</span>}
                    {item.selectedColor && <span className="bg-white/5 px-1.5 rounded">Color: {item.selectedColor}</span>}
                    {item.orderType === 'rent' && <span className="text-emerald-400 bg-emerald-500/10 px-1.5 rounded">Rent: {item.rentDays} Days</span>}
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-white text-sm">৳{item.current_price * item.qty * (item.rentDays || 1)}</span>
                    
                    <div className="flex items-center gap-3">
                      {/* 🔴 Dedicated Delete Button */}
                      <button 
                        onClick={() => updateCartQty(item.cartItemId, -item.qty, item.stock_quantity)} 
                        className="text-gray-500 hover:text-red-400 transition-colors focus:outline-none" 
                        title="কার্ট থেকে মুছে ফেলুন"
                      >
                        <i className="fa-solid fa-trash text-sm"></i>
                      </button>

                      {/* Qty Controls with Stock Limit Feedback */}
                      <div className="flex items-center gap-3 bg-black/50 rounded-lg px-2 py-1 border border-white/5">
                        <button 
                          onClick={() => updateCartQty(item.cartItemId, -1, item.stock_quantity)} 
                          className="text-gray-400 hover:text-white p-1 transition-colors focus:outline-none"
                        >
                          <i className="fa-solid fa-minus text-[10px]"></i>
                        </button>
                        <span className="text-xs font-bold text-white w-3 text-center">{item.qty}</span>
                        <button 
                          disabled={item.qty >= item.stock_quantity}
                          onClick={() => updateCartQty(item.cartItemId, 1, item.stock_quantity)} 
                          className={`p-1 transition-colors focus:outline-none ${item.qty >= item.stock_quantity ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
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
        <div className="p-6 border-t border-white/10 bg-black/50 space-y-3 shrink-0">
          <div className="flex justify-between items-center mb-1 text-xl">
            <span className="text-gray-400 font-bold text-sm">সর্বমোট:</span>
            <span className="font-black text-[#e76f51]">৳{cartTotal}</span>
          </div>
          
          {/* Disclaimer text */}
          <p className="text-[10px] text-gray-500 text-center pb-2">শিপিং এবং ট্যাক্স চেকআউটের সময় হিসাব করা হবে</p>

          <button 
            disabled={cart.length === 0} 
            onClick={openCheckoutModal} 
            className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all ${cart.length > 0 ? 'bg-[#e76f51] hover:bg-orange-600 text-white shadow-glow' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
          >
            চেকআউট করুন
          </button>
        </div>

      </div>
    </>
  );
}
