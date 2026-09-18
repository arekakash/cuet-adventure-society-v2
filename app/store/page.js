"use client";
import { useState, useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/store/ProductCard";
import SlideCart from "@/components/store/SlideCart";

export default function AdventureStore() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("merch"); 
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [viewMode, setViewMode] = useState('grid'); 

  // 🔴 Cart & UI States
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'details', 'options', 'rent', etc.
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [intendedAction, setIntendedAction] = useState(null); 
  
  // Selection States
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [rentDates, setRentDates] = useState({ start: "", end: "" });

  useEffect(() => {
    AOS.init({ duration: 800, once: true });
    fetchProducts();
    checkAuth();
    
    // 🔴 লোকাল স্টোরেজ থেকে কার্টের ডেটা রিস্টোর করা (Persistent Cart)
    const savedCart = localStorage.getItem('cas_store_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Cart parse error:", e);
      }
    }
  }, []);

  // 🔴 কার্ট আপডেট হলে লোকাল স্টোরেজে সেভ করা
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('cas_store_cart', JSON.stringify(cart));
    } else {
      localStorage.removeItem('cas_store_cart');
    }
  }, [cart]);

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

  // --- Cart Logistics ---
  const calculateDays = (start, end) => {
    if (!start || !end) return 1;
    const diffDays = Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const cartTotal = cart.reduce((total, item) => total + (item.current_price * item.qty * (item.rentDays || 1)), 0);

  // 🔴 Smart Variant Out-of-Stock Checker
  const isVariantOutOfStock = (product, size, color) => {
    if (!product.variant_stock || Object.keys(product.variant_stock).length === 0) return false;
    let keyToCheck = "";
    if (size && color) keyToCheck = `${size} - ${color}`;
    else if (size) {
      keyToCheck = size;
      if (product.colors && product.colors.length > 0) {
        const availableStock = product.colors.reduce((total, c) => total + (product.variant_stock[`${size} - ${c}`] || 0), 0);
        return availableStock <= 0;
      }
    } else if (color) {
      keyToCheck = color;
      if (product.sizes && product.sizes.length > 0) {
        const availableStock = product.sizes.reduce((total, s) => total + (product.variant_stock[`${s} - ${color}`] || 0), 0);
        return availableStock <= 0;
      }
    }
    if (keyToCheck && product.variant_stock[keyToCheck] !== undefined) {
      return product.variant_stock[keyToCheck] <= 0;
    }
    return false;
  };

  // 🔴 Action Handler (Product Card clicks)
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

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setActiveModal('details');
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
      alert("পণ্যটি সফলভাবে কার্টে যুক্ত হয়েছে!");
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

  const openCheckoutModal = () => {
    setIsCartOpen(false);
    // setActiveModal('checkout'); (এটি ধাপ ৪-এ আমরা যুক্ত করব)
    alert("চেকআউট মোডাল ওপেন হবে (ধাপ ৪-এ যুক্ত হবে)!");
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

        {/* Product Grid / List */}
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

      {/* 🔴 Import SlideCart Component */}
      <SlideCart 
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        cart={cart}
        updateCartQty={updateCartQty}
        cartTotal={cartTotal}
        openCheckoutModal={openCheckoutModal}
      />

      {/* 🔴 Product Action Modals (Options / Rent) */}
      {activeModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setActiveModal(null)}></div>
          
          {/* Options (Size/Color) Selection Modal */}
          {activeModal === 'options' && selectedProduct && (
            <div className="bg-[#0a1c13] border border-white/10 p-6 rounded-3xl w-full max-w-sm relative z-10 shadow-2xl animate-[zoomIn_0.2s_ease-out]">
              <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><i className="fa-solid fa-xmark text-xl"></i></button>
              <h3 className="text-lg font-black text-white mb-4">ভ্যারিয়েশন সিলেক্ট করুন</h3>
              
              {selectedProduct.sizes?.length > 0 && (
                <div className="mb-4">
                  <label className="block text-xs text-gray-400 mb-2 font-bold">সাইজ:</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.sizes.map(size => {
                      const outOfStock = isVariantOutOfStock(selectedProduct, size, selectedColor);
                      return (
                        <button 
                          key={size} disabled={outOfStock} onClick={() => setSelectedSize(size)} 
                          className={`px-4 py-2 rounded-xl font-bold border transition-all relative ${
                            selectedSize === size ? 'bg-[#e76f51] border-[#e76f51] text-white shadow-glow' : outOfStock ? 'bg-black/40 border-white/5 text-gray-600 line-through cursor-not-allowed opacity-50' : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/10'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedProduct.colors?.length > 0 && (
                <div className="mb-6">
                  <label className="block text-xs text-gray-400 mb-2 font-bold">কালার:</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.colors.map(color => {
                      const outOfStock = isVariantOutOfStock(selectedProduct, selectedSize, color);
                      return (
                        <button 
                          key={color} disabled={outOfStock} onClick={() => setSelectedColor(color)} 
                          className={`px-4 py-2 rounded-xl font-bold border transition-all ${
                            selectedColor === color ? 'bg-purple-500 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : outOfStock ? 'bg-black/40 border-white/5 text-gray-600 line-through cursor-not-allowed opacity-50' : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/10'
                          }`}
                        >
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button onClick={() => {
                if(selectedProduct.sizes?.length > 0 && !selectedSize) return alert('একটি সাইজ সিলেক্ট করুন!');
                if(selectedProduct.colors?.length > 0 && !selectedColor) return alert('একটি কালার সিলেক্ট করুন!');
                if(isVariantOutOfStock(selectedProduct, selectedSize, selectedColor)) return alert('এই ভ্যারিয়েন্টটি স্টকে নেই!');
                const currentPrice = selectedProduct.discount_price > 0 ? selectedProduct.discount_price : selectedProduct.sale_price;
                processAddToCart(selectedProduct, 'buy', currentPrice, { size: selectedSize, color: selectedColor }, intendedAction);
              }} className="w-full bg-[#e76f51] hover:bg-orange-600 transition-colors text-white py-3.5 rounded-xl font-black uppercase tracking-widest mt-2">
                নিশ্চিত করুন
              </button>
            </div>
          )}

          {/* Rental Dates Modal */}
          {activeModal === 'rent' && selectedProduct && (
            <div className="bg-[#0a1c13] border border-white/10 p-6 rounded-3xl w-full max-w-md relative z-10 shadow-2xl animate-[zoomIn_0.2s_ease-out]">
              <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><i className="fa-solid fa-xmark text-xl"></i></button>
              <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2"><i className="fa-solid fa-calendar-days text-emerald-400"></i> ভাড়ার তারিখ নির্ধারণ</h3>
              <p className="text-xs text-gray-400 mb-6">কয়দিনের জন্য ভাড়া নিতে চান তা সিলেক্ট করুন।</p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">পিক-আপ ডেট</label>
                  <input type="date" value={rentDates.start} min={new Date().toISOString().split('T')[0]} onChange={(e) => setRentDates({...rentDates, start: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">রিটার্ন ডেট</label>
                  <input type="date" value={rentDates.end} min={rentDates.start || new Date().toISOString().split('T')[0]} onChange={(e) => setRentDates({...rentDates, end: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 [color-scheme:dark]" />
                </div>
              </div>

              {rentDates.start && rentDates.end && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl mb-6 text-center">
                  <span className="block text-sm text-gray-300">ভাড়ার মেয়াদ: <strong className="text-emerald-400">{calculateDays(rentDates.start, rentDates.end)} দিন</strong></span>
                  <span className="block text-xl font-black text-white mt-1">মোট ভাড়া: ৳{calculateDays(rentDates.start, rentDates.end) * selectedProduct.rent_price}</span>
                </div>
              )}

              <button onClick={() => {
                if(!rentDates.start || !rentDates.end) return alert("দয়া করে তারিখ সিলেক্ট করুন!");
                processAddToCart(selectedProduct, 'rent', selectedProduct.rent_price, { start: rentDates.start, end: rentDates.end, days: calculateDays(rentDates.start, rentDates.end) }, 'rent');
              }} className="w-full bg-emerald-500 text-white py-3.5 rounded-xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors">
                কার্টে যোগ করুন
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
