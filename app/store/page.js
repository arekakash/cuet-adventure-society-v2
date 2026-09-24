"use client";
import { useState, useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/store/ProductCard";
import SlideCart from "@/components/store/SlideCart";
import { useCartStore } from "./useCartStore";



// Helper: sizes/colors input থেকে ভ্যারিয়েশন কম্বিনেশন বানিয়ে আগের স্টক ভ্যালু ধরে রাখা
const recomputeVariantStock = (sizesInput, colorsInput, prevStock) => {
  const sizes = (sizesInput || "").split(",").map(s => s.trim()).filter(Boolean);
  const colors = (colorsInput || "").split(",").map(c => c.trim()).filter(Boolean);

  let combos = [];
  if (sizes.length > 0 && colors.length > 0) {
    sizes.forEach(s => colors.forEach(c => combos.push(`${s} - ${c}`)));
  } else if (sizes.length > 0) {
    combos = sizes;
  } else if (colors.length > 0) {
    combos = colors;
  }

  const newStock = {};
  combos.forEach(combo => {
    newStock[combo] = prevStock && prevStock[combo] !== undefined ? prevStock[combo] : 0;
  });
  return newStock;
};

// Auto-Slideshow Component for Details Modal
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

  const [viewMode, setViewMode] = useState('grid'); 

  // Cart & UI States
  const { cart, setCart } = useCartStore();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [intendedAction, setIntendedAction] = useState(null); 
  
  // 🔴 User specific cart key state
  const [cartStorageKey, setCartStorageKey] = useState('cas_store_cart_guest');

  // Selection States
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [rentDates, setRentDates] = useState({ start: "", end: "" });
  
  // Checkout States
  const [trxId, setTrxId] = useState("");
  const [selectedPaymentIdx, setSelectedPaymentIdx] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Admin States
  const [discountInput, setDiscountInput] = useState("");
  const [editFormData, setEditFormData] = useState(null);
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteStep, setDeleteStep] = useState(1); // 1, 2, or 3

  useEffect(() => {
    AOS.init({ duration: 800, once: true });
    fetchProducts();
    checkAuth();
  }, []);

  // 🔴 Cart persistence effect based on specific user key
  useEffect(() => {
    const savedCart = localStorage.getItem(cartStorageKey);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Cart parse error:", e);
        setCart([]);
      }
    } else {
      setCart([]); // Clear cart if no saved data for this specific user
    }
  }, [cartStorageKey]);

  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } else {
      localStorage.removeItem(cartStorageKey);
    }
  }, [cart, cartStorageKey]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      // 🔴 Update storage key based on logged-in user ID
      setCartStorageKey(`cas_store_cart_${session.user.id}`);
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (session.user.email === 'admin@cuet.ac.bd' || profileData?.role === 'admin') {
        setIsAdmin(true);
      }
    } else {
      setCartStorageKey('cas_store_cart_guest');
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

  const handleAdminAction = (e, product, actionType) => {
    e.stopPropagation();
    setSelectedProduct(product);
    if (actionType === 'edit') {
      openEditModal(product);
    } else if (actionType === 'discount') {
      setDiscountInput("");
      setActiveModal('discount');
    } else if (actionType === 'delete') {
      setDeleteStep(1);
      setDeleteConfirmChecked(false);
      setDeleteConfirmText("");
      setActiveModal('delete');
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

  const openCheckoutModal = () => {
    const methods = getUniquePaymentMethods();
    setSelectedPaymentIdx(methods.length === 1 ? 0 : null);
    setIsCartOpen(false);
    setActiveModal('checkout');
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("অর্ডার কনফার্ম করার জন্য অনুগ্রহ করে লগইন করুন!");
      return;
    }
    if (!trxId) {
      alert("দয়া করে আপনার ট্রানজেকশন আইডি (TrxID) দিন!");
      return;
    }

    const methods = getUniquePaymentMethods();
    if (methods.length > 0 && (selectedPaymentIdx === null || selectedPaymentIdx === undefined)) {
      alert("দয়া করে কোন মাধ্যমে পেমেন্ট করেছেন তা সিলেক্ট করুন!");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderType = cart.every(i => i.orderType === 'buy') ? 'purchase' : (cart.every(i => i.orderType === 'rent') ? 'rental' : 'mixed');
      const chosenPayment = methods[selectedPaymentIdx] || methods[0] || { provider: 'bkash' };

      const paymentDetailString = [
        chosenPayment.provider ? chosenPayment.provider.toUpperCase() : '',
        chosenPayment.bankName ? `(${chosenPayment.bankName})` : '',
        chosenPayment.accNo ? `- ${chosenPayment.accNo}` : '',
        chosenPayment.type ? `[${chosenPayment.type.replace('_', ' ')}]` : ''
      ].filter(Boolean).join(' ');

      const { data: orderData, error: orderError } = await supabase
        .from('store_orders')
        .insert([{
          user_id: user.id,
          total_amount: cartTotal,
          trx_id: trxId.trim().toUpperCase(),
          payment_method: paymentDetailString || chosenPayment.provider,
          order_type: orderType,
          status: 'pending'
        }])
        .select()
        .single();

      if (orderError) throw orderError;

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

      alert("✅ আপনার অর্ডার সফলভাবে সাবমিট হয়েছে! অ্যাডমিন পেমেন্ট যাচাই করে দ্রুত এটি অ্যাপ্রুভ করবেন।");
      setCart([]);
      setTrxId("");
      setSelectedPaymentIdx(null);
      setActiveModal(null);
      setIsCartOpen(false);

    } catch (err) {
      alert("❌ অর্ডার প্লেস করতে সমস্যা হয়েছে: " + err.message);
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

  const openEditModal = (product) => {
    setEditFormData({
      name: product.name || '',
      description: product.description || '',
      sale_price: product.sale_price || 0,
      discount_price: product.discount_price || 0,
      rent_price: product.rent_price || 0,
      stock_quantity: product.stock_quantity || 0,
      sizesInput: (product.sizes || []).join(', '),
      colorsInput: (product.colors || []).join(', '),
      variantStock: { ...(product.variant_stock || {}) }
    });
    setActiveModal('edit');
  };

  const handleEditVariantInput = (field, value) => {
    setEditFormData(prev => {
      const updated = { ...prev, [field]: value };
      const newSizesInput = field === 'sizesInput' ? value : prev.sizesInput;
      const newColorsInput = field === 'colorsInput' ? value : prev.colorsInput;
      const newVariantStock = recomputeVariantStock(newSizesInput, newColorsInput, prev.variantStock);
      updated.variantStock = newVariantStock;
      if (Object.keys(newVariantStock).length > 0) {
        updated.stock_quantity = Object.values(newVariantStock).reduce((a, c) => a + (parseInt(c) || 0), 0);
      }
      return updated;
    });
  };

  const handleEditVariantStockChange = (combo, value) => {
    setEditFormData(prev => {
      const updatedStock = { ...prev.variantStock, [combo]: parseInt(value) || 0 };
      return { ...prev, variantStock: updatedStock, stock_quantity: Object.values(updatedStock).reduce((a, c) => a + (parseInt(c) || 0), 0) };
    });
  };

  const handleAdminEditSave = async () => {
    if (!editFormData.name.trim()) {
      alert("পণ্যের নাম খালি রাখা যাবে না!");
      return;
    }
    setIsSubmitting(true);
    try {
      const parsedSizes = editFormData.sizesInput.split(',').map(s => s.trim()).filter(Boolean);
      const parsedColors = editFormData.colorsInput.split(',').map(s => s.trim()).filter(Boolean);
      const hasVariants = Object.keys(editFormData.variantStock).length > 0;
      const totalStock = hasVariants
        ? Object.values(editFormData.variantStock).reduce((a, c) => a + (parseInt(c) || 0), 0)
        : (parseInt(editFormData.stock_quantity) || 0);

      const updates = {
        name: editFormData.name,
        description: editFormData.description,
        sale_price: parseFloat(editFormData.sale_price) || 0,
        discount_price: parseFloat(editFormData.discount_price) || 0,
        rent_price: parseFloat(editFormData.rent_price) || 0,
        stock_quantity: totalStock,
        sizes: parsedSizes,
        colors: parsedColors,
        variant_stock: hasVariants ? editFormData.variantStock : {}
      };

      const { error } = await supabase.from('store_products').update(updates).eq('id', selectedProduct.id);
      if (error) throw error;

      await fetchProducts();
      setActiveModal(null);
      setEditFormData(null);
      alert("✅ পণ্যের তথ্য সফলভাবে আপডেট হয়েছে!");
    } catch (err) {
      alert("❌ আপডেট করতে সমস্যা হয়েছে: " + err.message);
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
        setDeleteStep(1);
        setDeleteConfirmChecked(false);
        setDeleteConfirmText("");
        alert("✅ পণ্যটি ডেটাবেস থেকে মুছে ফেলা হয়েছে!");
      } catch (err) {
        alert("ডিলিট ফেইল হয়েছে: " + err.message);
      } finally {
        setIsSubmitting(false);
      }
    }
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

        {/* 🔴 Product Grid / List Container - Updated Grid Columns for Mobile */}
        {loading ? (
          <div className="flex justify-center items-center py-32"><i className="fa-solid fa-compass fa-spin text-5xl text-[#e76f51]"></i></div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6" : "flex flex-col gap-4"}>
            {filteredProducts.map((product, index) => (
              <div key={product.id} data-aos="fade-up" data-aos-delay={index * 50} className="relative group">
                <ProductCard 
                  product={product} 
                  viewMode={viewMode}
                  activeTab={activeTab}
                  isAdmin={isAdmin}
                  onProductClick={handleProductClick}
                  onAction={handleProductAction}
                  onAdminAction={handleAdminAction} 
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <SlideCart 
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        cart={cart}
        updateCartQty={updateCartQty}
        cartTotal={cartTotal}
        openCheckoutModal={openCheckoutModal}
      />

      {/* All Modals Wrapper */}
      {activeModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setActiveModal(null)}></div>
          
                    {/* Product Details Modal */}
          {activeModal === 'details' && selectedProduct && (
            // 🔴 ওভারলে ফিক্স: margin-auto (m-auto) ব্যবহার করে স্ক্রিনের মাঝখানে আনা হলো
            <div className="bg-[#0a1c13] border border-[#e76f51]/30 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col relative z-10 shadow-2xl animate-[zoomIn_0.2s_ease-out] m-auto">
              
              <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-white/20 text-white w-8 h-8 rounded-full transition-colors flex items-center justify-center">
                <i className="fa-solid fa-xmark"></i>
              </button>
              
              {/* 🔴 বডি অংশটুকু স্ক্রল করার জন্য আলাদা কন্টেইনার */}
              <div className="overflow-y-auto custom-scrollbar flex-grow">
                <div className="relative h-60 sm:h-80 bg-white/5 shrink-0">
                  <ProductSlider images={selectedProduct.gallery || [selectedProduct.image_url]} altText={selectedProduct.name} />
                  {selectedProduct.discount_price > 0 && <div className="absolute top-4 left-4 bg-red-500 text-white font-black px-4 py-1 rounded-full shadow-lg">Sale!</div>}
                </div>

                <div className="p-6 sm:p-8">
                  <h2 className="text-2xl font-black text-white mb-2">{selectedProduct.name}</h2>
                  <div className="flex flex-wrap gap-4 items-center mb-6">
                    {selectedProduct.sale_price > 0 && (
                       <div className="bg-[#e76f51]/10 px-4 py-2 rounded-xl border border-[#e76f51]/20">
                         <p className="text-[10px] text-gray-400 uppercase tracking-widest">কেনা মূল্য</p>
                         <p className="text-xl font-black text-[#e76f51]">
                           ৳{selectedProduct.discount_price > 0 ? selectedProduct.discount_price : selectedProduct.sale_price}
                           {selectedProduct.discount_price > 0 && <span className="text-sm text-gray-500 line-through ml-2 font-normal">৳{selectedProduct.sale_price}</span>}
                         </p>
                       </div>
                    )}
                    {selectedProduct.rent_price > 0 && (
                       <div className="bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                         <p className="text-[10px] text-gray-400 uppercase tracking-widest">ভাড়া মূল্য</p>
                         <p className="text-xl font-black text-emerald-400">৳{selectedProduct.rent_price} <span className="text-sm font-normal">/দিন</span></p>
                       </div>
                    )}
                  </div>

                  <p className="text-gray-300 text-sm leading-relaxed mb-6 bg-white/5 p-4 rounded-xl border border-white/5 whitespace-pre-line">
                    {selectedProduct.description || "এই পণ্যটির কোনো বিস্তারিত বিবরণ দেওয়া নেই।"}
                  </p>

                  {selectedProduct.sizes?.length > 0 && (
                    <div className="mb-4">
                      <span className="text-xs text-gray-400 block mb-2 font-bold uppercase tracking-widest">এভেইলেবল সাইজ:</span>
                      <div className="flex gap-2 flex-wrap">
                        {selectedProduct.sizes.map(s => {
                          const outOfStock = isVariantOutOfStock(selectedProduct, s, null);
                          return <span key={s} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${outOfStock ? 'bg-black/20 border-white/5 text-gray-600 line-through' : 'bg-white/10 border-white/10 text-white'}`}>{s}</span>;
                        })}
                      </div>
                    </div>
                  )}
                  
                  {selectedProduct.colors?.length > 0 && (
                    <div className="mb-6">
                      <span className="text-xs text-gray-400 block mb-2 font-bold uppercase tracking-widest">এভেইলেবল কালার:</span>
                      <div className="flex gap-2 flex-wrap">
                        {selectedProduct.colors.map(c => {
                          const outOfStock = isVariantOutOfStock(selectedProduct, null, c);
                          return <span key={c} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${outOfStock ? 'bg-black/20 border-white/5 text-gray-600 line-through' : 'bg-white/10 border-white/10 text-white'}`}>{c}</span>;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 🔴 ফিক্সড অ্যাকশন বাটন এরিয়া (নিচে সব সময় দৃশ্যমান থাকবে) */}
              <div className="p-4 sm:p-6 bg-black/60 border-t border-white/10 shrink-0 rounded-b-3xl">
                <div className="flex gap-3">
                  {selectedProduct.rent_price > 0 && (
                    <button 
                      onClick={(e) => handleProductAction(e, selectedProduct, 'rent')}
                      disabled={isVariantOutOfStock(selectedProduct) && !isAdmin}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    >
                      <i className="fa-solid fa-calendar-check"></i> ভাড়া নিন
                    </button>
                  )}
                  
                  {selectedProduct.sale_price > 0 && (
                    <button 
                      onClick={(e) => handleProductAction(e, selectedProduct, 'buy_now')}
                      disabled={isVariantOutOfStock(selectedProduct) && !isAdmin}
                      className="flex-1 bg-[#e76f51] hover:bg-orange-600 text-white py-3 rounded-xl font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
                    >
                      <i className="fa-solid fa-bag-shopping"></i> কিনুন
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

                
                {selectedProduct.colors?.length > 0 && (
                  <div className="mb-6">
                    <span className="text-xs text-gray-400 block mb-2 font-bold uppercase tracking-widest">এভেইলেবল কালার:</span>
                    <div className="flex gap-2 flex-wrap">
                      {selectedProduct.colors.map(c => {
                        const outOfStock = isVariantOutOfStock(selectedProduct, null, c);
                        return <span key={c} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${outOfStock ? 'bg-black/20 border-white/5 text-gray-600 line-through' : 'bg-white/10 border-white/10 text-white'}`}>{c}</span>;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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

          {/* Rental Dates Calendar Modal */}
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

          {/* Checkout Modal (User selects Payment Method & TrxID) */}
          {activeModal === 'checkout' && (
            <div className="bg-[#0a1c13] border border-[#e76f51]/30 p-6 sm:p-8 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative z-10 shadow-[0_0_50px_rgba(231,111,81,0.15)]">
              <button onClick={() => {setActiveModal(null); setIsCartOpen(true);}} className="absolute top-4 right-4 text-gray-400 hover:text-white"><i className="fa-solid fa-arrow-left text-xl"></i></button>
              <h3 className="text-2xl font-black text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-2"><i className="fa-solid fa-money-check-dollar text-[#e76f51]"></i> পেমেন্ট ও চেকআউট</h3>
              
              <div className="bg-black/40 p-5 rounded-2xl border border-white/5 mb-6 text-center">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">সর্বমোট পে করতে হবে</p>
                <p className="text-4xl font-black text-[#e76f51] mt-2">৳{cartTotal}</p>
              </div>

              <div className="mb-8">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-3">যেকোনো একটি মাধ্যম বেছে নিন:</p>
                <div className="space-y-3">
                  {getUniquePaymentMethods().map((pm, i) => (
                    <div 
                      key={i} 
                      onClick={() => setSelectedPaymentIdx(i)}
                      className={`cursor-pointer border p-4 rounded-xl flex items-center justify-between transition-all ${selectedPaymentIdx === i ? 'border-[#e76f51] bg-[#e76f51]/10 shadow-[0_0_15px_rgba(231,111,81,0.2)]' : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'}`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selectedPaymentIdx === i ? 'border-[#e76f51]' : 'border-gray-500'}`}>
                          {selectedPaymentIdx === i && <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#e76f51]"></div>}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white font-bold text-sm sm:text-base">{pm.provider.toUpperCase()} {pm.bankName ? `(${pm.bankName})` : ''}</span>
                          <span className="text-gray-400 text-xs tracking-widest mt-0.5">{pm.accNo}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-1.5 rounded font-bold uppercase tracking-wider ${pm.type === 'send_money' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {pm.type.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                  {getUniquePaymentMethods().length === 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl flex items-start gap-2">
                      <i className="fa-solid fa-triangle-exclamation text-yellow-500 mt-1"></i>
                      <p className="text-xs text-yellow-400 leading-relaxed">অ্যাডমিন নির্দিষ্ট পেমেন্ট মেথড সেট করেনি।</p>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleCheckoutSubmit}>
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-400 mb-2">TrxID (ট্রানজেকশন আইডি) সাবমিট করুন *</label>
                  <input required type="text" value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="e.g. 9F8A7B6C5D" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#e76f51] font-mono uppercase transition-colors" />
                </div>
                <button disabled={isSubmitting} type="submit" className={`w-full py-4 rounded-xl font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-[#e76f51] hover:bg-orange-600 text-white shadow-glow'}`}>
                  {isSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check-double"></i>}
                  {isSubmitting ? 'অর্ডার প্রসেস হচ্ছে...' : 'অর্ডার কনফার্ম করুন'}
                </button>
              </form>
            </div>
          )}

          {/* Admin Discount Modal */}
          {activeModal === 'discount' && selectedProduct && (
             <div className="bg-[#0a1c13] border border-blue-500/30 p-6 rounded-3xl w-full max-w-sm relative z-10 shadow-2xl">
               <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><i className="fa-solid fa-xmark text-xl"></i></button>
               <h3 className="text-xl font-black text-white mb-2 text-center"><i className="fa-solid fa-tags text-blue-400 mr-2"></i>ডিসকাউন্ট সেট করুন</h3>
               <p className="text-sm text-gray-400 text-center mb-6 border-b border-white/10 pb-4">বর্তমান রেগুলার দাম: <strong className="text-white">৳{selectedProduct.sale_price}</strong></p>
               
               <div className="mb-6">
                 <label className="block text-xs font-bold text-gray-400 mb-2">নতুন ডিসকাউন্ট মূল্য লিখুন (৳)</label>
                 <input type="number" value={discountInput} onChange={e => setDiscountInput(e.target.value)} placeholder={`৳${selectedProduct.sale_price} এর চেয়ে কম`} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-black focus:outline-none focus:border-blue-500 transition-colors text-center" />
               </div>
               <button onClick={handleAdminDiscount} disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 transition-colors text-white py-3.5 rounded-xl font-black uppercase tracking-widest flex justify-center items-center gap-2">
                 {isSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>} সেভ করুন
               </button>
             </div>
          )}

          {/* Admin Product Edit Modal */}
          {activeModal === 'edit' && editFormData && selectedProduct && (
            <div className="bg-[#0a1c13] border border-purple-500/30 p-6 sm:p-8 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative z-10 shadow-2xl">
              <button onClick={() => { setActiveModal(null); setEditFormData(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-white"><i className="fa-solid fa-xmark text-xl"></i></button>
              <h3 className="text-xl font-black text-white mb-6 border-b border-white/10 pb-4"><i className="fa-solid fa-pen text-purple-400 mr-2"></i>পণ্যের তথ্য এডিট করুন</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">নাম *</label>
                  <input type="text" value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">বিস্তারিত বিবরণ</label>
                  <textarea rows="3" value={editFormData.description} onChange={e => setEditFormData({ ...editFormData, description: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">বিক্রয় মূল্য (৳)</label>
                    <input type="number" value={editFormData.sale_price} onChange={e => setEditFormData({ ...editFormData, sale_price: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">ডিসকাউন্ট মূল্য (৳)</label>
                    <input type="number" value={editFormData.discount_price} onChange={e => setEditFormData({ ...editFormData, discount_price: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
                  </div>
                </div>

                {selectedProduct?.category === 'gear' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">ভাড়ার মূল্য / দিন (৳)</label>
                    <input type="number" value={editFormData.rent_price} onChange={e => setEditFormData({ ...editFormData, rent_price: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">সাইজ ভ্যারিয়েশন</label>
                    <input type="text" value={editFormData.sizesInput} onChange={e => handleEditVariantInput('sizesInput', e.target.value)} placeholder="M, L, XL" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">কালার ভ্যারিয়েশন</label>
                    <input type="text" value={editFormData.colorsInput} onChange={e => handleEditVariantInput('colorsInput', e.target.value)} placeholder="Black, Navy" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                  </div>
                </div>

                {Object.keys(editFormData.variantStock).length > 0 ? (
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <label className="block text-xs font-bold text-purple-400 mb-3 uppercase tracking-widest"><i className="fa-solid fa-layer-group mr-1"></i>ভ্যারিয়েশন অনুযায়ী স্টক</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.keys(editFormData.variantStock).map(combo => (
                        <div key={combo} className="bg-black/30 p-2 rounded-lg border border-white/5">
                          <label className="block text-[10px] text-gray-300 font-bold mb-1 truncate" title={combo}>{combo}</label>
                          <input type="number" min="0" value={editFormData.variantStock[combo]} onChange={e => handleEditVariantStockChange(combo, e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
                      <span className="text-xs text-gray-400 font-bold uppercase">মোট স্টক (স্বয়ংক্রিয়):</span>
                      <span className="text-lg font-black text-white">{Object.values(editFormData.variantStock).reduce((a, c) => a + (parseInt(c) || 0), 0)}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">স্টক সংখ্যা</label>
                    <input type="number" min="0" value={editFormData.stock_quantity} onChange={e => setEditFormData({ ...editFormData, stock_quantity: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500" />
                  </div>
                )}
              </div>

              <button onClick={handleAdminEditSave} disabled={isSubmitting} className={`w-full mt-8 py-4 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'bg-gray-600 text-gray-400' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]'}`}>
                {isSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-floppy-disk"></i> পরিবর্তন সেভ করুন</>}
              </button>
            </div>
          )}

          {/* Admin 3-Step Delete Warning Modal */}
          {activeModal === 'delete' && selectedProduct && (
            <div className="bg-[#0a1c13] border border-red-500/50 p-6 sm:p-8 rounded-3xl w-full max-w-sm relative z-10 text-center shadow-2xl">
              <i className="fa-solid fa-triangle-exclamation text-6xl text-red-500 mb-6 animate-bounce"></i>
              
              {deleteStep === 1 && (
                <>
                  <h3 className="text-xl font-black text-white mb-2">পণ্যটি ডিলিট করবেন?</h3>
                  <p className="text-sm text-gray-400 mb-6">এই পণ্যটি স্টোর থেকে মুছে ফেলা হবে।</p>
                  <div className="flex gap-2">
                    <button onClick={() => setActiveModal(null)} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl font-bold transition-colors">বাতিল</button>
                    <button onClick={() => setDeleteStep(2)} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl font-bold transition-colors">হ্যাঁ, ডিলিট করুন</button>
                  </div>
                </>
              )}

              {deleteStep === 2 && (
                <>
                  <h3 className="text-xl font-black text-red-400 mb-2">চরম সতর্কতা!</h3>
                  <p className="text-xs text-gray-400 mb-4">পণ্যটি ডেটাবেস থেকে স্থায়ীভাবে মুছে যাবে। এটি আর রিকভার করা সম্ভব নয়!</p>
                  <label className="flex items-start gap-3 text-xs text-gray-300 cursor-pointer select-none mb-6 text-left bg-black/40 p-3 rounded-lg border border-white/5">
                    <input type="checkbox" checked={deleteConfirmChecked} onChange={e => setDeleteConfirmChecked(e.target.checked)} className="w-5 h-5 shrink-0 mt-0.5 accent-red-500" />
                    <span className="leading-snug">আমি বুঝতে পেরেছি যে এই সিদ্ধান্তটি অপরিবর্তনীয়।</span>
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteStep(1)} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl font-bold transition-colors">ফিরে যান</button>
                    <button onClick={() => setDeleteStep(3)} disabled={!deleteConfirmChecked} className="flex-1 bg-red-600 disabled:bg-gray-600 text-white py-2.5 rounded-xl font-bold transition-colors">আমি নিশ্চিত</button>
                  </div>
                </>
              )}

              {deleteStep === 3 && (
                <>
                  <h3 className="text-lg font-black text-white mb-2">ফাইনাল কনফার্মেশন</h3>
                  <p className="text-[10px] text-gray-400 mb-4">ডিলিট করতে নিচের বক্সে <strong className="text-red-500">DELETE</strong> টাইপ করুন।</p>
                  <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="DELETE" className="w-full bg-white/5 border border-red-500/30 rounded-xl px-4 py-3 text-white mb-6 text-center font-mono tracking-widest focus:outline-none focus:border-red-500" />
                  <div className="flex gap-2">
                    <button onClick={() => setActiveModal(null)} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl font-bold transition-colors">বাতিল</button>
                    <button onClick={handleAdminDelete} disabled={deleteConfirmText !== 'DELETE' || isSubmitting} className="flex-1 bg-red-700 disabled:bg-gray-600 hover:bg-red-600 text-white py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                      {isSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-trash-can"></i> ডিলিট করুন</>}
                    </button>
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
