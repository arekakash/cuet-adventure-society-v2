"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import AOS from "aos";
import "aos/dist/aos.css";
import { supabase } from "@/lib/supabase";

// Auto-Slideshow Component
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

export default function AdventureStore() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("merch"); 
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Cart & UI States
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [intendedAction, setIntendedAction] = useState(null); 
  
  // Selection States
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [rentDates, setRentDates] = useState({ start: "", end: "" });
  
  // Checkout & Admin States
  const [trxId, setTrxId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

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

  const calculateDays = (start, end) => {
    if (!start || !end) return 1;
    const diffDays = Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const cartTotal = cart.reduce((total, item) => total + (item.current_price * item.qty * (item.rentDays || 1)), 0);

  const handleProductAction = (e, product, actionType) => {
    e.stopPropagation(); 
    setSelectedProduct(product);
    setIntendedAction(actionType);

    const hasOptions = (product.sizes && product.sizes.length > 0) || (product.colors && product.colors.length > 0);
    const currentPrice = product.discount_price > 0 ? product.discount_price : product.sale_price;

    if (actionType === 'rent') {
      setActiveModal('rent');
      setRentDates({ start: "", end: "" });
    } else if (hasOptions) {
      setActiveModal('options');
      setSelectedSize("");
      setSelectedColor("");
    } else {
      processAddToCart(product, 'buy', currentPrice, null, actionType);
    }
  };

  const processAddToCart = (product, type, price, extraData, actionIntent) => {
    const cartItemId = `${product.id}-${type}-${extraData?.size || 'ns'}-${extraData?.color || 'nc'}-${extraData?.start || 'nd'}`;
    
    setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, {
        ...product,
        cartItemId,
        orderType: type,
        current_price: price, 
        qty: 1,
        selectedSize: extraData?.size || null,
        selectedColor: extraData?.color || null,
        rentStart: extraData?.start || null,
        rentEnd: extraData?.end || null,
        rentDays: extraData?.days || null
      }];
    });

    setActiveModal(null);
    if (actionIntent === 'buy_now' || actionIntent === 'rent') {
      setIsCartOpen(true);
    } else {
      alert("পণ্যটি সফলভাবে কার্টে যুক্ত হয়েছে!");
    }
  };

  const updateCartQty = (cartItemId, delta, stockLimit) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQty = item.qty + delta;
        if (newQty > 0 && newQty <= stockLimit) return { ...item, qty: newQty };
      }
      return item;
    }).filter(item => item.qty > 0));
  };

  // 🔴 1. Functional Checkout & Order Submission Logic
  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("অর্ডার কনফার্ম করার জন্য অনুগ্রহ করে লগইন করুন!");
      return;
    }
    if (!trxId) {
      alert("দয়া করে আপনার ট্রানজেকশন আইডি (TrxID) দিন!");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderType = cart.every(i => i.orderType === 'buy') ? 'purchase' : (cart.every(i => i.orderType === 'rent') ? 'rental' : 'mixed');
      const primaryPayment = getUniquePaymentMethods()[0] || { provider: 'bkash' };

      // Main Order Insert
      const { data: orderData, error: orderError } = await supabase
        .from('store_orders')
        .insert([{
          user_id: user.id,
          total_amount: cartTotal,
          trx_id: trxId.trim().toUpperCase(),
          payment_method: primaryPayment.provider,
          order_type: orderType,
          status: 'pending'
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Order Items Insert
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.qty,
        size_selected: item.selectedSize || null,
        color_selected: item.selectedColor || null,
        rent_start_date: item.rentStart || null,
        rent_end_date: item.rentEnd || null,
        price_at_time: item.current_price
      }));

      const { error: itemsError } = await supabase.from('store_order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      alert("✅ আপনার অর্ডার সফলভাবে সাবমিট হয়েছে! অ্যাডমিন পেমেন্ট যাচাই করে দ্রুত এটি অ্যাপ্রুভ করবেন।");
      setCart([]);
      setTrxId("");
      setActiveModal(null);
      setIsCartOpen(false);

    } catch (err) {
      alert("❌ অর্ডার প্লেস করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminDiscount = async () => {
    if (!discountInput || isNaN(discountInput)) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('store_products').update({ discount_price: parseFloat(discountInput) }).eq('id', selectedProduct.id);
      if (error) throw error;
      fetchProducts();
      setActiveModal(null);
      setDiscountInput("");
    } catch (err) {
      alert("এরর: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminDelete = async () => {
    if (deleteStep === 3 && deleteConfirmText === "DELETE") {
      setIsSubmitting(true);
      try {
        const { error } = await supabase.from('store_products').delete().eq('id', selectedProduct.id);
        if (error) throw error;
        fetchProducts();
        setActiveModal(null);
        setDeleteStep(0);
        setDeleteConfirmText("");
      } catch (err) {
        alert("ডিলিট ফেইল হয়েছে: " + err.message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getUniquePaymentMethods = () => {
    const methods = [];
    cart.forEach(item => {
      if (item.payment_methods) {
        item.payment_methods.forEach(pm => {
          if (!methods.find(m => m.accNo === pm.accNo && m.provider === pm.provider)) {
            methods.push(pm);
          }
        });
      }
    });
    return methods;
  };

  // 🔴 3. Helper to check if a specific size/color variant is out of stock
  const isVariantOutOfStock = (product, size, color) => {
    if (!product.variant_stock) return false;
    let key = "";
    if (size && color) key = `${size} - ${color}`;
    else if (size) key = size;
    else if (color) key = color;

    if (key && product.variant_stock[key] !== undefined) {
      return product.variant_stock[key] <= 0;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center mb-12 relative" data-aos="fade-down">
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 tracking-tight drop-shadow-lg uppercase">
            অ্যাডভেঞ্চার <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e76f51] to-yellow-500">স্টোর</span>
          </h1>
          {isAdmin && <span className="bg-emerald-500 text-white text-xs px-3 py-1 rounded-full animate-pulse">Admin Mode Active</span>}
        </div>

        {/* Tabs */}
        <div className="flex justify-center items-center gap-4 mb-12 relative z-20" data-aos="fade-up">
          <button onClick={() => setActiveTab("merch")} className={`px-6 py-3 rounded-full font-bold transition-all ${activeTab === "merch" ? "bg-[#e76f51] text-white shadow-glow scale-105" : "bg-white/5 text-gray-400 hover:text-white"}`}>
            <i className="fa-solid fa-shirt"></i> মার্চেন্ডাইজ
          </button>
          <button onClick={() => setActiveTab("gear")} className={`px-6 py-3 rounded-full font-bold transition-all ${activeTab === "gear" ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105" : "bg-white/5 text-gray-400 hover:text-white"}`}>
            <i className="fa-solid fa-campground"></i> গিয়ার
          </button>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-32"><i className="fa-solid fa-compass fa-spin text-5xl text-[#e76f51]"></i></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {filteredProducts.map((product, index) => {
              const images = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image_url];
              const hasDiscount = product.discount_price > 0 && product.discount_price < product.sale_price;
              const discountPercent = hasDiscount ? Math.round(((product.sale_price - product.discount_price) / product.sale_price) * 100) : 0;

              return (
                <div 
                  key={product.id} 
                  onClick={() => { setSelectedProduct(product); setActiveModal('details'); }}
                  className="bg-[#0a1c13]/80 border border-white/10 rounded-3xl overflow-hidden shadow-xl hover:border-[#e76f51]/50 transition-all cursor-pointer group relative flex flex-col"
                  data-aos="fade-up" data-aos-delay={index * 50}
                >
                  {isAdmin && (
                    <div className="absolute top-2 left-2 z-30 flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); setActiveModal('discount'); }} className="bg-blue-500/80 hover:bg-blue-500 text-white p-2 rounded-lg text-xs backdrop-blur-sm"><i className="fa-solid fa-tag"></i></button>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); setDeleteStep(1); setActiveModal('delete'); }} className="bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-lg text-xs backdrop-blur-sm"><i className="fa-solid fa-trash"></i></button>
                    </div>
                  )}

                  {hasDiscount && (
                    <div className="absolute top-4 right-4 z-20 bg-red-500 text-white text-xs font-black uppercase px-3 py-1 rounded-full shadow-lg rotate-3 animate-pulse">
                      {discountPercent}% OFF
                    </div>
                  )}
                  {product.stock_quantity <= 0 && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center">
                      <span className="bg-gray-800 border border-gray-600 text-white text-sm font-bold uppercase px-6 py-2 rounded-full rotate-12">Out of Stock</span>
                    </div>
                  )}

                  <div className="relative h-56 w-full overflow-hidden bg-white/5 flex items-center justify-center p-4">
                    <ProductSlider images={images} altText={product.name} />
                  </div>

                  <div className="p-5 flex-grow flex flex-col justify-between z-10 bg-gradient-to-t from-black/80 to-transparent">
                    <div>
                      <h3 className="text-lg font-black text-white mb-2 truncate">{product.name}</h3>
                      <div className="flex items-end gap-2 mb-3">
                        {activeTab === 'merch' || product.sale_price > 0 ? (
                          <>
                            <span className="text-xl font-black text-[#e76f51]">৳{hasDiscount ? product.discount_price : product.sale_price}</span>
                            {hasDiscount && <span className="text-sm text-gray-500 line-through mb-0.5">৳{product.sale_price}</span>}
                          </>
                        ) : null}
                        {product.rent_price > 0 && <span className="text-emerald-400 font-bold ml-auto">৳{product.rent_price}/দিন</span>}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-2">
                      {activeTab === 'merch' ? (
                        <>
                          <button onClick={(e) => handleProductAction(e, product, 'add_cart')} disabled={product.stock_quantity <= 0} className="flex-1 py-2 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-white transition-colors"><i className="fa-solid fa-cart-plus"></i> কার্টে নিন</button>
                          <button onClick={(e) => handleProductAction(e, product, 'buy_now')} disabled={product.stock_quantity <= 0} className="flex-1 py-2 rounded-xl font-bold text-xs bg-[#e76f51] hover:bg-orange-600 text-white shadow-glow"><i className="fa-solid fa-bolt"></i> কিনুন</button>
                        </>
                      ) : (
                        <>
                          {product.rent_price > 0 && <button onClick={(e) => handleProductAction(e, product, 'rent')} disabled={product.stock_quantity <= 0} className="flex-1 py-2 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white"><i className="fa-solid fa-calendar-check"></i> ভাড়া নিন</button>}
                          {product.sale_price > 0 && <button onClick={(e) => handleProductAction(e, product, 'buy_now')} disabled={product.stock_quantity <= 0} className="flex-1 py-2 rounded-xl font-bold text-xs bg-[#e76f51] hover:bg-orange-600 text-white"><i className="fa-solid fa-cart-plus"></i> কিনুন</button>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <button onClick={() => setIsCartOpen(true)} className="fixed bottom-6 right-6 z-40 bg-[#e76f51] text-white p-4 rounded-full shadow-[0_0_30px_rgba(231,111,81,0.5)] hover:scale-110 transition-transform">
          <i className="fa-solid fa-cart-shopping text-xl"></i>
          <span className="absolute -top-2 -right-2 bg-white text-[#e76f51] text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#e76f51]">{cart.length}</span>
        </button>
      )}

      {/* 🔴 2. Slide-out Cart Panel with Backdrop Click-to-Close */}
      {isCartOpen && <div className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>}
      <div className={`fixed inset-y-0 right-0 z-[70] w-full sm:w-96 bg-[#0a1c13] border-l border-white/10 shadow-2xl transform transition-transform duration-500 ${isCartOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
          <h2 className="text-xl font-black text-white"><i className="fa-solid fa-cart-shopping text-[#e76f51] mr-2"></i> কার্ট</h2>
          <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-white"><i className="fa-solid fa-xmark text-2xl"></i></button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-20 opacity-50"><i className="fa-solid fa-basket-shopping text-5xl mb-4"></i><p>কার্ট ফাঁকা!</p></div>
          ) : (
            cart.map(item => (
              <div key={item.cartItemId} className="bg-white/5 border border-white/10 p-3 rounded-xl flex gap-3">
                <img src={item.gallery?.[0]?.url || item.image_url} alt={item.name} className="w-16 h-16 object-contain bg-black/40 rounded-lg p-1" />
                <div className="flex-grow">
                  <h4 className="text-sm font-bold text-white truncate pr-4">{item.name}</h4>
                  <div className="text-[10px] text-gray-400 flex gap-2 my-1">
                    {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                    {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                    {item.orderType === 'rent' && <span className="text-emerald-400">Rent: {item.rentDays} Days</span>}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-white">৳{item.current_price * item.qty * (item.rentDays || 1)}</span>
                    <div className="flex items-center gap-3 bg-black/50 rounded-lg px-2 py-1">
                      <button onClick={() => updateCartQty(item.cartItemId, -1, item.stock_quantity)} className="text-gray-400 hover:text-white"><i className="fa-solid fa-minus text-[10px]"></i></button>
                      <span className="text-xs font-bold text-white">{item.qty}</span>
                      <button onClick={() => updateCartQty(item.cartItemId, 1, item.stock_quantity)} className="text-gray-400 hover:text-white"><i className="fa-solid fa-plus text-[10px]"></i></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-white/10 bg-black/50">
          <div className="flex justify-between items-center mb-4 text-xl">
            <span className="text-gray-400 font-bold">সর্বমোট:</span>
            <span className="font-black text-[#e76f51]">৳{cartTotal}</span>
          </div>
          <button disabled={cart.length === 0} onClick={() => { setIsCartOpen(false); setActiveModal('checkout'); }} className={`w-full py-4 rounded-xl font-black uppercase transition-all ${cart.length > 0 ? 'bg-[#e76f51] hover:bg-orange-600 text-white shadow-glow' : 'bg-gray-700 text-gray-500'}`}>
            চেকআউট করুন
          </button>
        </div>
      </div>

      {/* Modals Component Mapping */}
      {activeModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setActiveModal(null)}></div>
          
          {/* Product Details Modal */}
          {activeModal === 'details' && selectedProduct && (
            <div className="bg-[#0a1c13] border border-[#e76f51]/30 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-10 shadow-2xl animate-[zoomIn_0.2s_ease-out]">
              <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 z-20 bg-black/50 text-white w-8 h-8 rounded-full"><i className="fa-solid fa-xmark"></i></button>
              
              <div className="relative h-72 bg-white/5">
                <ProductSlider images={selectedProduct.gallery || [selectedProduct.image_url]} altText={selectedProduct.name} />
                {selectedProduct.discount_price > 0 && <div className="absolute top-4 left-4 bg-red-500 text-white font-black px-4 py-1 rounded-full shadow-lg">Sale!</div>}
              </div>

              <div className="p-6 sm:p-8">
                <h2 className="text-2xl font-black text-white mb-2">{selectedProduct.name}</h2>
                <div className="flex gap-4 items-center mb-6">
                  {selectedProduct.sale_price > 0 && (
                     <div className="bg-[#e76f51]/10 px-4 py-2 rounded-xl border border-[#e76f51]/20">
                       <p className="text-[10px] text-gray-400 uppercase">কেনা মূল্য</p>
                       <p className="text-xl font-black text-[#e76f51]">
                         ৳{selectedProduct.discount_price > 0 ? selectedProduct.discount_price : selectedProduct.sale_price}
                         {selectedProduct.discount_price > 0 && <span className="text-sm text-gray-500 line-through ml-2 font-normal">৳{selectedProduct.sale_price}</span>}
                       </p>
                     </div>
                  )}
                  {selectedProduct.rent_price > 0 && (
                     <div className="bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                       <p className="text-[10px] text-gray-400 uppercase">ভাড়া মূল্য</p>
                       <p className="text-xl font-black text-emerald-400">৳{selectedProduct.rent_price} <span className="text-sm font-normal">/দিন</span></p>
                     </div>
                  )}
                </div>

                <p className="text-gray-300 text-sm leading-relaxed mb-6">{selectedProduct.description || "এই পণ্যটির কোনো বিস্তারিত বিবরণ দেওয়া নেই।"}</p>

                {selectedProduct.sizes?.length > 0 && (
                  <div className="mb-4">
                    <span className="text-xs text-gray-400 block mb-2 font-bold">এভেইলেবল সাইজ:</span>
                    <div className="flex gap-2">{selectedProduct.sizes.map(s => <span key={s} className="bg-white/10 text-white text-xs px-3 py-1 rounded-md">{s}</span>)}</div>
                  </div>
                )}
                
                {selectedProduct.colors?.length > 0 && (
                  <div className="mb-6">
                    <span className="text-xs text-gray-400 block mb-2 font-bold">এভেইলেবল কালার:</span>
                    <div className="flex gap-2">{selectedProduct.colors.map(c => <span key={c} className="bg-white/10 text-white text-xs px-3 py-1 rounded-md">{c}</span>)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 🔴 3. Options (Size/Color) Selection Modal with Smart Out-of-Stock Fading/Disabling */}
          {activeModal === 'options' && (
            <div className="bg-[#0a1c13] border border-white/10 p-6 rounded-3xl w-full max-w-sm relative z-10 shadow-2xl">
              <h3 className="text-lg font-black text-white mb-4">ভ্যারিয়েশন সিলেক্ট করুন</h3>
              
              {selectedProduct.sizes?.length > 0 && (
                <div className="mb-4">
                  <label className="block text-xs text-gray-400 mb-2">সাইজ:</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.sizes.map(size => {
                      const outOfStock = isVariantOutOfStock(selectedProduct, size, selectedColor);
                      return (
                        <button 
                          key={size} 
                          disabled={outOfStock}
                          onClick={() => setSelectedSize(size)} 
                          className={`px-4 py-2 rounded-xl font-bold border transition-all ${
                            selectedSize === size 
                              ? 'bg-[#e76f51] border-[#e76f51] text-white' 
                              : outOfStock 
                              ? 'bg-black/20 border-white/5 text-gray-600 line-through cursor-not-allowed opacity-40' 
                              : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'
                          }`}
                        >
                          {size} {outOfStock && '(Out)'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedProduct.colors?.length > 0 && (
                <div className="mb-6">
                  <label className="block text-xs text-gray-400 mb-2">কালার:</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.colors.map(color => {
                      const outOfStock = isVariantOutOfStock(selectedProduct, selectedSize, color);
                      return (
                        <button 
                          key={color} 
                          disabled={outOfStock}
                          onClick={() => setSelectedColor(color)} 
                          className={`px-4 py-2 rounded-xl font-bold border transition-all ${
                            selectedColor === color 
                              ? 'bg-purple-500 border-purple-500 text-white' 
                              : outOfStock 
                              ? 'bg-black/20 border-white/5 text-gray-600 line-through cursor-not-allowed opacity-40' 
                              : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'
                          }`}
                        >
                          {color} {outOfStock && '(Out)'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button onClick={() => {
                if(selectedProduct.sizes?.length > 0 && !selectedSize) return alert('একটি সাইজ সিলেক্ট করুন!');
                if(selectedProduct.colors?.length > 0 && !selectedColor) return alert('একটি কালার সিলেক্ট করুন!');
                const currentPrice = selectedProduct.discount_price > 0 ? selectedProduct.discount_price : selectedProduct.sale_price;
                processAddToCart(selectedProduct, 'buy', currentPrice, { size: selectedSize, color: selectedColor }, intendedAction);
              }} className="w-full bg-[#e76f51] text-white py-3 rounded-xl font-bold">
                নিশ্চিত করুন
              </button>
            </div>
          )}

          {/* Rental Dates Calendar Modal */}
          {activeModal === 'rent' && (
            <div className="bg-[#0a1c13] border border-white/10 p-6 rounded-3xl w-full max-w-md relative z-10 shadow-2xl">
              <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2"><i className="fa-solid fa-calendar-days text-emerald-400"></i> ভাড়ার তারিখ নির্ধারণ</h3>
              <p className="text-xs text-gray-400 mb-6">কয়দিনের জন্য ভাড়া নিতে চান তা সিলেক্ট করুন।</p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">পিক-আপ ডেট (শুরুর দিন)</label>
                  <input type="date" value={rentDates.start} min={new Date().toISOString().split('T')[0]} onChange={(e) => setRentDates({...rentDates, start: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">রিটার্ন ডেট (ফেরত দেওয়ার দিন)</label>
                  <input type="date" value={rentDates.end} min={rentDates.start || new Date().toISOString().split('T')[0]} onChange={(e) => setRentDates({...rentDates, end: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white [color-scheme:dark]" />
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
                processAddToCart(selectedProduct, 'rent', selectedProduct.rent_price, { start: rentDates.start, end: rentDates.end, days: calculateDays(rentDates.start, rentDates.end) }, 'rent');
              }} className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-600">
                কার্টে যোগ করুন
              </button>
            </div>
          )}

          {/* 🔴 1. Active Checkout / Payments Modal */}
          {activeModal === 'checkout' && (
            <div className="bg-[#0a1c13] border border-[#e76f51]/30 p-6 sm:p-8 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative z-10 shadow-[0_0_50px_rgba(231,111,81,0.15)]">
              <button onClick={() => {setActiveModal(null); setIsCartOpen(true);}} className="absolute top-4 right-4 text-gray-400 hover:text-white"><i className="fa-solid fa-arrow-left"></i></button>
              <h3 className="text-2xl font-black text-white mb-6 border-b border-white/10 pb-4">পেমেন্ট ও চেকআউট</h3>
              
              <div className="bg-black/30 p-4 rounded-xl border border-white/5 mb-6 text-center">
                <p className="text-sm text-gray-400">সর্বমোট পে করতে হবে</p>
                <p className="text-3xl font-black text-[#e76f51] mt-1">৳{cartTotal}</p>
              </div>

              <div className="mb-6">
                <p className="text-xs text-gray-400 font-bold uppercase mb-3">পেমেন্ট করার মাধ্যমসমূহ:</p>
                <div className="space-y-2">
                  {getUniquePaymentMethods().map((pm, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-sm">{pm.provider.toUpperCase()} {pm.bankName ? `(${pm.bankName})` : ''}</span>
                        <span className="text-gray-400 text-xs tracking-widest">{pm.accNo}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${pm.type === 'send_money' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {pm.type.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                  {getUniquePaymentMethods().length === 0 && <p className="text-xs text-yellow-400">অ্যাডমিন নির্দিষ্ট পেমেন্ট মেথড সেট করেনি। বিকাশ নম্বর: 01700000000 (Send Money) ধরে ট্রাই করতে পারেন।</p>}
                </div>
              </div>

              <form onSubmit={handleCheckoutSubmit}>
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-400 mb-2">TrxID (ট্রানজেকশন আইডি) সাবমিট করুন *</label>
                  <input required type="text" value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="e.g. 9F8A7B6C5D" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#e76f51] font-mono uppercase" />
                </div>
                <button disabled={isSubmitting} type="submit" className={`w-full py-4 rounded-xl font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'bg-gray-600 text-gray-400' : 'bg-[#e76f51] hover:bg-orange-600 text-white shadow-glow'}`}>
                  {isSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check-double"></i>}
                  {isSubmitting ? 'প্রসেস হচ্ছে...' : 'অর্ডার কনফার্ম করুন'}
                </button>
              </form>
            </div>
          )}

          {/* Admin Discount Modal */}
          {activeModal === 'discount' && (
             <div className="bg-[#0a1c13] border border-blue-500/30 p-6 rounded-3xl w-full max-w-sm relative z-10">
               <h3 className="text-lg font-black text-white mb-4 text-center"><i className="fa-solid fa-tags text-blue-400 mr-2"></i>ডিসকাউন্ট মূল্য সেট করুন</h3>
               <p className="text-xs text-gray-400 text-center mb-4">আগের দাম: ৳{selectedProduct.sale_price}</p>
               <input type="number" value={discountInput} onChange={e => setDiscountInput(e.target.value)} placeholder="নতুন মূল্য লিখুন (যেমন: 450)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-4" />
               <button onClick={handleAdminDiscount} disabled={isSubmitting} className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold">সেভ করুন</button>
             </div>
          )}

          {/* Admin 3-Step Delete Warning Modal */}
          {activeModal === 'delete' && (
            <div className="bg-[#0a1c13] border border-red-500/50 p-6 rounded-3xl w-full max-w-sm relative z-10 text-center">
              <i className="fa-solid fa-triangle-exclamation text-5xl text-red-500 mb-4 animate-bounce"></i>
              {deleteStep === 1 && (
                <>
                  <h3 className="text-xl font-black text-white mb-2">আপনি কি নিশ্চিত?</h3>
                  <p className="text-xs text-gray-400 mb-6">এই পণ্যটি স্টোর থেকে মুছে ফেলা হবে।</p>
                  <div className="flex gap-2">
                    <button onClick={() => setActiveModal(null)} className="flex-1 bg-white/10 text-white py-2 rounded-xl">বাতিল</button>
                    <button onClick={() => setDeleteStep(2)} className="flex-1 bg-red-500 text-white py-2 rounded-xl font-bold">হ্যাঁ, ডিলিট করুন</button>
                  </div>
                </>
              )}
              {deleteStep === 2 && (
                <>
                  <h3 className="text-xl font-black text-red-400 mb-2">চরম সতর্কতা!</h3>
                  <p className="text-xs text-gray-400 mb-6">পণ্যটি ডেটাবেস থেকে স্থায়ীভাবে মুছে যাবে। এটি আর রিকভার করা সম্ভব নয়!</p>
                  <div className="flex gap-2">
                    <button onClick={() => setActiveModal(null)} className="flex-1 bg-white/10 text-white py-2 rounded-xl">ফিরে যান</button>
                    <button onClick={() => setDeleteStep(3)} className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold">আমি নিশ্চিত</button>
                  </div>
                </>
              )}
              {deleteStep === 3 && (
                <>
                  <h3 className="text-lg font-black text-white mb-2">ফাইনাল কনফার্মেশন</h3>
                  <p className="text-[10px] text-gray-400 mb-4">ডিলিট করতে নিচের বক্সে <strong className="text-red-500">DELETE</strong> টাইপ করুন।</p>
                  <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="DELETE" className="w-full bg-white/5 border border-red-500/30 rounded-xl px-4 py-2 text-white mb-4 text-center font-mono" />
                  <div className="flex gap-2">
                    <button onClick={() => setActiveModal(null)} className="flex-1 bg-white/10 text-white py-2 rounded-xl">বাতিল</button>
                    <button onClick={handleAdminDelete} disabled={deleteConfirmText !== 'DELETE' || isSubmitting} className="flex-1 bg-red-700 disabled:bg-gray-600 text-white py-2 rounded-xl font-bold transition-colors">স্থায়ীভাবে ডিলিট করুন</button>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
