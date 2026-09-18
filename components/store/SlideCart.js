"use client";

export default function SlideCart({
  isCartOpen,
  setIsCartOpen,
  cart,
  updateCartQty,
  cartTotal,
  openCheckoutModal
}) {
  return (
    <>
      {/* 🔴 Permanent Floating Cart Button */}
      {cart.length > 0 && (
        <button 
          onClick={() => setIsCartOpen(true)} 
          className="fixed bottom-6 right-6 z-40 bg-[#e76f51] text-white p-4 rounded-full shadow-[0_0_30px_rgba(231,111,81,0.5)] hover:scale-110 transition-transform animate-bounce"
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
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
          <h2 className="text-xl font-black text-white"><i className="fa-solid fa-cart-shopping text-[#e76f51] mr-2"></i> আপনার কার্ট</h2>
          <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
            বন্ধ করুন <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
        
        {/* Cart Items List */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-20 opacity-50">
              <i className="fa-solid fa-basket-shopping text-5xl mb-4"></i>
              <p className="text-sm font-bold">কার্ট সম্পূর্ণ ফাঁকা!</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.cartItemId} className="bg-white/5 border border-white/10 p-3 rounded-xl flex gap-3 hover:bg-white/10 transition-colors">
                <img src={item.gallery?.[0]?.url || item.image_url} alt={item.name} className="w-16 h-16 object-contain bg-black/40 rounded-lg p-1" />
                <div className="flex-grow">
                  <h4 className="text-sm font-bold text-white truncate pr-4">{item.name}</h4>
                  <div className="text-[10px] text-gray-400 flex flex-wrap gap-2 my-1">
                    {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                    {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                    {item.orderType === 'rent' && <span className="text-emerald-400">Rent: {item.rentDays} Days</span>}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-white text-sm">৳{item.current_price * item.qty * (item.rentDays || 1)}</span>
                    <div className="flex items-center gap-3 bg-black/50 rounded-lg px-2 py-1">
                      <button onClick={() => updateCartQty(item.cartItemId, -1, item.stock_quantity)} className="text-gray-400 hover:text-white p-1"><i className="fa-solid fa-minus text-[10px]"></i></button>
                      <span className="text-xs font-bold text-white">{item.qty}</span>
                      <button onClick={() => updateCartQty(item.cartItemId, 1, item.stock_quantity)} className="text-gray-400 hover:text-white p-1"><i className="fa-solid fa-plus text-[10px]"></i></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-black/50 space-y-3">
          <div className="flex justify-between items-center mb-1 text-xl">
            <span className="text-gray-400 font-bold text-sm">সর্বমোট:</span>
            <span className="font-black text-[#e76f51]">৳{cartTotal}</span>
          </div>
          <button 
            disabled={cart.length === 0} 
            onClick={openCheckoutModal} 
            className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all ${cart.length > 0 ? 'bg-[#e76f51] hover:bg-orange-600 text-white shadow-glow' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
          >
            চেকআউট করুন
          </button>
          <button onClick={() => setIsCartOpen(false)} className="w-full py-2.5 rounded-xl font-bold text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
            বার বন্ধ করুন
          </button>
        </div>

      </div>
    </>
  );
}
