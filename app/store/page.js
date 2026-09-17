"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";
import { supabase } from "@/lib/supabase";

export default function AdventureStore() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("merch"); 
  const [user, setUser] = useState(null);

  // 🔴 Cart & Checkout States
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'size', 'rent', 'checkout'
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Modal Form States
  const [selectedSize, setSelectedSize] = useState("");
  const [rentDates, setRentDates] = useState({ start: "", end: "" });
  const [trxId, setTrxId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    AOS.init({ duration: 800, once: true });
    fetchProducts();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setUser(session.user);
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('store_products').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data);
    setLoading(false);
  };

  const filteredProducts = products.filter(item => item.category === activeTab);

  // 🔴 Cart Calculations
  const calculateDays = (start, end) => {
    if (!start || !end) return 1;
    const diffTime = Math.abs(new Date(end) - new Date(start));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.qty * (item.rentDays || 1)), 0);

  // 🔴 Handle "Add to Cart" or "Rent" Clicks
  const handleProductAction = (product, actionType) => {
    setSelectedProduct(product);
    if (actionType === 'buy' && product.sizes && product.sizes.length > 0) {
      setActiveModal('size');
      setSelectedSize("");
    } else if (actionType === 'rent') {
      setActiveModal('rent');
      setRentDates({ start: "", end: "" });
    } else {
      addToCart(product, 'buy', product.sale_price, null);
    }
  };

  // 🔴 Core Add to Cart Function
  const addToCart = (product, type, price, extraData) => {
    const cartItemId = `${product.id}-${type}-${extraData?.size || 'nosize'}-${extraData?.start || 'nodate'}`;
    
    setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, {
        ...product,
        cartItemId,
        orderType: type,
        price: price,
        qty: 1,
        selectedSize: extraData?.size || null,
        rentStart: extraData?.start || null,
        rentEnd: extraData?.end || null,
        rentDays: extraData?.days || null
      }];
    });

    setActiveModal(null);
    setIsCartOpen(true); // কার্টে অ্যাড হলেই সাইডবার ওপেন হবে
  };

  // 🔴 Handle Checkout Submission
  const processCheckout = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("চেকআউট করার জন্য আগে লগইন করুন!");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1. Create Order
      const orderType = cart.every(i => i.orderType === 'buy') ? 'purchase' : (cart.every(i => i.orderType === 'rent') ? 'rental' : 'mixed');
      
      const { data: orderData, error: orderError } = await supabase
        .from('store_orders')
        .insert([{ user_id: user.id, total_amount: cartTotal, trx_id: trxId, order_type: orderType }])
        .select().single();

      if (orderError) throw orderError;

      // 2. Insert Order Items & Update Stock
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.qty,
        size_selected: item.selectedSize,
        rent_start_date: item.rentStart,
        rent_end_date: item.rentEnd,
        price_at_time: item.price
      }));

      const { error: itemsError } = await supabase.from('store_order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // (ঐচ্ছিক) আমরা চাইলে এখানে স্টকের পরিমাণ আপডেট করার কোডও রাখতে পারি
      
      alert("✅ আপনার অর্ডার সফলভাবে প্লেস হয়েছে! অ্যাডমিন অ্যাপ্রুভালের জন্য অপেক্ষা করুন।");
      setCart([]);
      setTrxId("");
      setActiveModal(null);
      setIsCartOpen(false);

    } catch (error) {
      console.error(error);
      alert("❌ চেকআউট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Store Hero Section */}
        <div className="text-center mb-12 relative" data-aos="fade-down">
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 tracking-tight drop-shadow-lg uppercase">
            অ্যাডভেঞ্চার <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e76f51] to-yellow-500">স্টোর</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-lg max-w-2xl mx-auto">
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
          <div className="flex justify-center items-center py-32"><i className="fa-solid fa-compass fa-spin text-5xl text-[#e76f51]"></i></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8 relative z-10">
            {filteredProducts.map((product, index) => (
              <div key={product.id} className="glass-dark bg-[#0a1c13]/80 border border-white/10 rounded-3xl overflow-hidden shadow-xl hover:border-[#e76f51]/50 transition-all duration-500 flex flex-col" data-aos="fade-up" data-aos-delay={index * 100}>
                
                <div className="relative h-56 w-full overflow-hidden bg-white/5 flex items-center justify-center p-4 group">
                  {product.stock_quantity <= 0 && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center">
                      <span className="bg-red-500 text-white text-xs font-bold uppercase px-4 py-1.5 rounded-full rotate-12">Out of Stock</span>
                    </div>
                  )}
                  <img src={product.image_url || "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&q=80"} alt={product.name} className={`w-full h-full object-contain transition-transform duration-700 group-hover:scale-110 ${product.stock_quantity <= 0 ? 'grayscale' : ''}`} />
                  
                  <div className="absolute top-4 right-4 bg-[#050b08]/80 backdrop-blur-md border border-white/10 text-white font-black px-3 py-1.5 rounded-xl text-sm z-10 flex flex-col items-end">
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

                <div className="p-5 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white mb-1">{product.name}</h3>
                    {product.sizes && product.sizes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {product.sizes.map(size => <span key={size} className="text-[9px] font-bold text-gray-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded">{size}</span>)}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    {activeTab === 'merch' ? (
                      <button onClick={() => handleProductAction(product, 'buy')} disabled={product.stock_quantity <= 0} className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${product.stock_quantity > 0 ? 'bg-[#e76f51] hover:bg-orange-600 text-white shadow-glow' : 'bg-gray-600 text-gray-400'}`}>
                        <i className="fa-solid fa-cart-plus"></i> কার্টে যোগ করুন
                      </button>
                    ) : (
                      <>
                        {product.rent_price > 0 && (
                          <button onClick={() => handleProductAction(product, 'rent')} disabled={product.stock_quantity <= 0} className={`flex-1 py-2 rounded-xl font-bold text-xs flex justify-center items-center gap-1.5 ${product.stock_quantity > 0 ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-gray-600 text-gray-400'}`}>
                            <i className="fa-solid fa-calendar-check"></i> ভাড়া নিন
                          </button>
                        )}
                        {product.sale_price > 0 && (
                          <button onClick={() => handleProductAction(product, 'buy')} disabled={product.stock_quantity <= 0} className={`flex-1 py-2 rounded-xl font-bold text-xs flex justify-center items-center gap-1.5 ${product.stock_quantity > 0 ? 'bg-[#e76f51] hover:bg-orange-600 text-white' : 'bg-gray-600 text-gray-400'}`}>
                            <i className="fa-solid fa-cart-plus"></i> কিনে নিন
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔴 Floating Cart Button */}
      {cart.length > 0 && (
        <button onClick={() => setIsCartOpen(true)} className="fixed bottom-6 right-6 z-40 bg-[#e76f51] text-white p-4 rounded-full shadow-[0_0_30px_rgba(231,111,81,0.5)] hover:scale-110 transition-transform flex items-center justify-center animate-bounce">
          <i className="fa-solid fa-cart-shopping text-xl"></i>
          <span className="absolute -top-2 -right-2 bg-white text-[#e76f51] text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#e76f51]">{cart.length}</span>
        </button>
      )}

      {/* 🔴 Slide-out Cart Panel */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[#0a1c13] border-l border-white/10 shadow-2xl transform transition-transform duration-500 ease-in-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
          <h2 className="text-xl font-black text-white flex items-center gap-2"><i className="fa-solid fa-cart-shopping text-[#e76f51]"></i> আপনার কার্ট</h2>
          <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-white transition-colors text-xl"><i className="fa-solid fa-xmark"></i></button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-20 text-gray-500"><i className="fa-solid fa-basket-shopping text-5xl mb-4 opacity-50"></i><p>আপনার কার্ট ফাঁকা!</p></div>
          ) : (
            cart.map(item => (
              <div key={item.cartItemId} className="bg-white/5 border border-white/10 p-3 rounded-xl flex gap-3">
                <img src={item.image_url} alt={item.name} className="w-16 h-16 object-contain bg-black/30 rounded-lg p-1" />
                <div className="flex-grow">
                  <h4 className="text-sm font-bold text-white leading-tight">{item.name}</h4>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {item.orderType === 'rent' ? <span className="text-emerald-400 border border-emerald-500/30 px-1 rounded mr-1">Rent: {item.rentDays} Days</span> : <span className="text-[#e76f51] border border-[#e76f51]/30 px-1 rounded mr-1">Buy</span>}
                    {item.selectedSize && `Size: ${item.selectedSize}`}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-white text-sm">৳{item.price * item.qty * (item.rentDays || 1)}</span>
                    <div className="flex items-center gap-2 bg-black/40 rounded-lg px-2 py-0.5">
                      <span className="text-xs text-gray-400 font-bold">Qty: {item.qty}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-white/10 bg-black/40">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-400 font-bold">সর্বমোট:</span>
            <span className="text-2xl font-black text-white">৳{cartTotal}</span>
          </div>
          <button 
            disabled={cart.length === 0} 
            onClick={() => { setIsCartOpen(false); setActiveModal('checkout'); }}
            className={`w-full py-4 rounded-xl font-black tracking-widest uppercase transition-all ${cart.length > 0 ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
          >
            চেকআউট করুন <i className="fa-solid fa-arrow-right ml-2"></i>
          </button>
        </div>
      </div>

      {/* 🔴 Modals Overlay */}
      {activeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          
          {/* 1. Size Selection Modal */}
          {activeModal === 'size' && (
            <div className="bg-[#0a1c13] border border-white/10 p-6 rounded-3xl w-full max-w-sm relative z-10 shadow-2xl animate-[zoomIn_0.2s_ease-out]">
              <h3 className="text-lg font-black text-white mb-4">সাইজ বা ভ্যারিয়েশন সিলেক্ট করুন</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedProduct.sizes.map(size => (
                  <button key={size} onClick={() => setSelectedSize(size)} className={`px-4 py-2 rounded-xl font-bold border transition-all ${selectedSize === size ? 'bg-[#e76f51] border-[#e76f51] text-white shadow-glow' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                    {size}
                  </button>
                ))}
              </div>
              <button onClick={() => selectedSize ? addToCart(selectedProduct, 'buy', selectedProduct.sale_price, { size: selectedSize }) : alert('অনুগ্রহ করে একটি সাইজ সিলেক্ট করুন!')} className="w-full bg-[#e76f51] text-white py-3 rounded-xl font-bold">
                নিশ্চিত করুন
              </button>
            </div>
          )}

          {/* 2. Smart Rental Calendar Modal */}
          {activeModal === 'rent' && (
            <div className="bg-[#0a1c13] border border-white/10 p-6 rounded-3xl w-full max-w-md relative z-10 shadow-2xl animate-[zoomIn_0.2s_ease-out]">
              <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2"><i className="fa-solid fa-calendar-days text-emerald-400"></i> ভাড়ার তারিখ নির্ধারণ</h3>
              <p className="text-xs text-gray-400 mb-6">কয়দিনের জন্য ভাড়া নিতে চান তা ক্যালেন্ডার থেকে সিলেক্ট করুন।</p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">পিক-আপ ডেট (শুরুর দিন)</label>
                  <input type="date" value={rentDates.start} min={new Date().toISOString().split('T')[0]} onChange={(e) => setRentDates({...rentDates, start: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">রিটার্ন ডেট (ফেরত দেওয়ার দিন)</label>
                  <input type="date" value={rentDates.end} min={rentDates.start || new Date().toISOString().split('T')[0]} onChange={(e) => setRentDates({...rentDates, end: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 [color-scheme:dark]" />
                </div>
              </div>

              {rentDates.start && rentDates.end && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl mb-6 text-center">
                  <span className="block text-sm text-gray-300">ভাড়ার মেয়াদ: <strong className="text-emerald-400">{calculateDays(rentDates.start, rentDates.end)} দিন</strong></span>
                  <span className="block text-lg font-black text-white mt-1">মোট ভাড়া: ৳{calculateDays(rentDates.start, rentDates.end) * selectedProduct.rent_price}</span>
                </div>
              )}

              <button onClick={() => {
                if(!rentDates.start || !rentDates.end) return alert("দয়া করে তারিখ সিলেক্ট করুন!");
                addToCart(selectedProduct, 'rent', selectedProduct.rent_price, { start: rentDates.start, end: rentDates.end, days: calculateDays(rentDates.start, rentDates.end) });
              }} className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-600 transition-colors">
                কার্টে যোগ করুন
              </button>
            </div>
          )}

          {/* 3. Checkout Modal */}
          {activeModal === 'checkout' && (
            <div className="bg-[#0a1c13] border border-[#e76f51]/30 p-6 sm:p-8 rounded-3xl w-full max-w-md relative z-10 shadow-[0_0_50px_rgba(231,111,81,0.15)] animate-[zoomIn_0.2s_ease-out]">
              <button onClick={() => {setActiveModal(null); setIsCartOpen(true);}} className="absolute top-4 right-4 text-gray-400 hover:text-white"><i className="fa-solid fa-xmark text-xl"></i></button>
              <h3 className="text-2xl font-black text-white mb-2">চেকআউট</h3>
              
              {!user ? (
                <div className="text-center py-6">
                  <i className="fa-solid fa-lock text-4xl text-gray-500 mb-4"></i>
                  <p className="text-gray-300 mb-6">অর্ডার প্লেস করার জন্য আপনাকে লগইন করতে হবে।</p>
                  <Link href="/login" className="bg-[#e76f51] text-white px-6 py-2.5 rounded-full font-bold">লগইন করুন</Link>
                </div>
              ) : (
                <form onSubmit={processCheckout}>
                  <div className="bg-black/30 p-4 rounded-xl border border-white/5 mb-6 text-center">
                    <p className="text-sm text-gray-400">সর্বমোট বিল</p>
                    <p className="text-3xl font-black text-[#e76f51] mt-1">৳{cartTotal}</p>
                  </div>
                  
                  <div className="mb-6 space-y-3">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">পেমেন্ট ইন্সট্রাকশন:</p>
                    <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3"><img src="https://i.imgur.com/uR1k3M5.png" alt="bKash" className="w-8 h-8 rounded" /><span className="text-sm font-bold text-white">017XXXXXXXX</span></div>
                      <span className="text-[10px] bg-pink-500/20 text-pink-400 px-2 py-1 rounded font-bold">Send Money</span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-400 mb-2">TrxID (ট্রানজেকশন আইডি) সাবমিট করুন *</label>
                    <input required type="text" value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="e.g. 9F8A7B6C5D" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#e76f51] font-mono uppercase" />
                  </div>

                  <button disabled={isSubmitting} type="submit" className={`w-full py-4 rounded-xl font-black tracking-widest uppercase transition-all flex justify-center items-center gap-2 ${isSubmitting ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-[#e76f51] hover:bg-orange-600 text-white shadow-glow'}`}>
                    {isSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check-double"></i>}
                    {isSubmitting ? 'প্রসেস হচ্ছে...' : 'অর্ডার কনফার্ম করুন'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
