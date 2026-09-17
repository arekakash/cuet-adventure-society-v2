'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import AOS from 'aos'
import 'aos/dist/aos.css'

export default function StoreOrdersAdmin() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    AOS.init({ once: true })
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('store_orders')
        .select(`
          *,
          profiles (full_name, phone, student_id),
          store_order_items (
            quantity, size_selected, rent_start_date, rent_end_date, price_at_time, product_id,
            store_products (id, name, image_url, category, stock_quantity)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  // 🔴 অর্ডার অ্যাপ্রুভ করা এবং স্টক কমানো (Inventory Automation - Point 10)
  const handleApprove = async (orderId, items) => {
    if (!window.confirm("আপনি কি নিশ্চিত যে পেমেন্ট ঠিক আছে এবং অর্ডারটি অ্যাপ্রুভ করতে চান?")) return;
    
    setProcessingId(orderId)
    try {
      // 1. Update Order Status
      const { error: orderError } = await supabase
        .from('store_orders')
        .update({ status: 'approved' })
        .eq('id', orderId)
      if (orderError) throw orderError

      // 2. Reduce Stock Quantity for each item
      for (const item of items) {
        const currentStock = item.store_products.stock_quantity;
        const newStock = Math.max(0, currentStock - item.quantity); // স্টক যেন মাইনাস না হয়
        
        await supabase
          .from('store_products')
          .update({ stock_quantity: newStock })
          .eq('id', item.product_id)
      }

      alert("✅ অর্ডার সফলভাবে অ্যাপ্রুভ হয়েছে এবং স্টক আপডেট করা হয়েছে!")
      fetchOrders() // Refresh List
    } catch (error) {
      alert("❌ এরর: " + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  // 🔴 অর্ডার রিজেক্ট করা
  const handleReject = async (orderId) => {
    if (!window.confirm("অর্ডারটি রিজেক্ট করতে চান?")) return;
    
    setProcessingId(orderId)
    try {
      await supabase.from('store_orders').update({ status: 'rejected' }).eq('id', orderId)
      fetchOrders()
    } catch (error) {
      alert("❌ এরর: " + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  // 🔴 গিয়ার রিটার্ন নেওয়া এবং স্টক বাড়ানো (Inventory Automation)
  const handleReturn = async (orderId, items) => {
    if (!window.confirm("গিয়ারগুলো কি সফলভাবে ফেরত পাওয়া গেছে?")) return;
    
    setProcessingId(orderId)
    try {
      // 1. Update Order Status to Returned
      const { error: orderError } = await supabase
        .from('store_orders')
        .update({ status: 'returned' })
        .eq('id', orderId)
      if (orderError) throw orderError

      // 2. Increase Stock Quantity ONLY for Rental items
      for (const item of items) {
        if (item.store_products.category === 'gear' && item.rent_start_date) {
          // Fetch exact latest stock just to be safe
          const { data: prodData } = await supabase.from('store_products').select('stock_quantity').eq('id', item.product_id).single()
          const currentStock = prodData ? prodData.stock_quantity : 0;
          
          await supabase
            .from('store_products')
            .update({ stock_quantity: currentStock + item.quantity })
            .eq('id', item.product_id)
        }
      }

      alert("✅ গিয়ার রিটার্ন সম্পন্ন হয়েছে এবং স্টক পুনরায় আপডেট করা হয়েছে!")
      fetchOrders()
    } catch (error) {
      alert("❌ এরর: " + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'approved': return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest">Approve করা হয়েছে</span>
      case 'pending': return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest animate-pulse">Pending</span>
      case 'rejected': return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest">বাতিল</span>
      case 'returned': return <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest">গিয়ার ফেরত এসেছে</span>
      default: return <span className="bg-gray-500/20 text-gray-400 border border-gray-500/30 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest">{status}</span>
    }
  }

  return (
    <div className="min-h-screen bg-[#050b08] pt-24 pb-12 px-4 sm:px-6 relative">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="glass-panel rounded-3xl p-6 mb-8 flex justify-between items-center bg-[#0a1c13] border border-white/10" data-aos="fade-down">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <i className="fa-solid fa-cart-shopping text-orange-400"></i> স্টোর অর্ডার ম্যানেজমেন্ট
            </h1>
            <p className="text-sm text-gray-400 mt-1">পেমেন্ট ভেরিফাই করুন, অর্ডার অ্যাপ্রুভ করুন এবং গিয়ার রেন্টাল মনিটর করুন।</p>
          </div>
          <Link href="/admin" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2">
            <i className="fa-solid fa-arrow-left"></i> অ্যাডমিন হাব
          </Link>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <i className="fa-solid fa-circle-notch fa-spin text-5xl text-orange-400"></i>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-[#0a1c13] border border-white/10 rounded-3xl" data-aos="zoom-in">
            <i className="fa-solid fa-box-open text-6xl text-gray-600 mb-4 opacity-50"></i>
            <h3 className="text-xl font-bold text-gray-300">কোনো অর্ডার পাওয়া যায়নি</h3>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order, index) => (
              <div key={order.id} className="bg-[#0a1c13] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group hover:border-orange-500/30 transition-all" data-aos="fade-up" data-aos-delay={index * 50}>
                
                {order.status === 'pending' && <div className="absolute top-0 right-0 w-2 h-full bg-blue-500 animate-pulse"></div>}

                {/* Top Section: User & Payment Info */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-white/5 pb-4 mb-4 gap-4">
                  <div>
                    <h3 className="text-lg font-black text-white mb-1 flex items-center gap-2">
                      <i className="fa-solid fa-user text-orange-400"></i> {order.profiles?.full_name || 'Unknown User'}
                    </h3>
                    <p className="text-sm text-gray-400 font-bold flex gap-4">
                      <span><i className="fa-solid fa-phone text-gray-500"></i> {order.profiles?.phone || 'N/A'}</span>
                      <span><i className="fa-solid fa-fingerprint text-gray-500"></i> ID: {order.profiles?.student_id || 'N/A'}</span>
                    </p>
                    <p className="text-[10px] text-gray-500 mt-2 font-mono">Order ID: {order.id}</p>
                  </div>
                  
                  <div className="bg-black/30 border border-white/5 p-4 rounded-2xl flex items-center gap-6 text-right w-full lg:w-auto">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">Total Bill</p>
                      <p className="text-2xl font-black text-orange-400">৳{order.total_amount}</p>
                    </div>
                    <div className="border-l border-white/10 pl-6 text-left">
                      <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">TrxID ({order.payment_method})</p>
                      <p className="text-sm font-mono font-bold text-white bg-[#e76f51]/20 px-2 py-1 rounded border border-[#e76f51]/30 select-all">
                        {order.trx_id}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Middle Section: Items List */}
                <div className="mb-6 space-y-3">
                  {order.store_order_items?.map((item, idx) => (
                    <div key={idx} className="bg-white/5 p-3 rounded-xl flex items-center gap-4">
                      <img src={item.store_products?.image_url} alt="Item" className="w-12 h-12 rounded-lg object-contain bg-black/40 p-1" />
                      <div>
                        <h4 className="text-sm font-bold text-white">{item.store_products?.name}</h4>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px]">
                          <span className="text-gray-300 bg-white/10 px-2 py-0.5 rounded font-bold">Qty: {item.quantity}</span>
                          {item.size_selected && <span className="text-purple-400 font-bold">Size: {item.size_selected}</span>}
                          {item.rent_start_date && (
                            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                              <i className="fa-solid fa-calendar-check"></i> 
                              {new Date(item.rent_start_date).toLocaleDateString('en-GB')} থেকে {new Date(item.rent_end_date).toLocaleDateString('en-GB')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Section: Actions & Status */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                  <div>
                    {getStatusBadge(order.status)}
                    <span className="text-xs text-gray-500 ml-3"><i className="fa-solid fa-clock mr-1"></i>{new Date(order.created_at).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    {order.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleReject(order.id)} 
                          disabled={processingId === order.id}
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors"
                        >
                          {processingId === order.id ? 'Processing...' : 'Reject'}
                        </button>
                        <button 
                          onClick={() => handleApprove(order.id, order.store_order_items)} 
                          disabled={processingId === order.id}
                          className="flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
                        >
                          {processingId === order.id ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                          পেমেন্ট নিশ্চিত করুন
                        </button>
                      </>
                    )}

                    {order.status === 'approved' && order.order_type !== 'purchase' && (
                      <button 
                        onClick={() => handleReturn(order.id, order.store_order_items)} 
                        disabled={processingId === order.id}
                        className="w-full sm:w-auto px-6 py-2 rounded-xl text-xs font-bold text-white bg-purple-500 hover:bg-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all flex items-center justify-center gap-2"
                      >
                        {processingId === order.id ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-rotate-left"></i>}
                        গিয়ার ফেরত পাওয়া গেছে (স্টক বাড়ান)
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
