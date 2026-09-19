'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import html2canvas from 'html2canvas'

export default function InboxPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [adminId, setAdminId] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    let isMounted = true
    let channel = null // 🔴 চ্যানেলটি বাইরে ডিক্লেয়ার করা হলো

    const initializeInbox = async () => {
      try { // 🔴 পুরো লজিক try ব্লকে ঢোকানো হলো
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          if (isMounted) router.push('/login')
          return
        }

        // 🔴 ১. गार्ड लজিক: ইউজারের রোল চেক করা
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profile?.role === 'admin') {
          // অ্যাডমিন হলে লাথি দিয়ে অ্যাডমিন ইনবক্সে পাঠিয়ে দেওয়া হবে
          if (isMounted) router.push('/admin/inbox')
          return
        }
        
        if (isMounted) setUser(session.user)

        // ২. অ্যাডমিনের আইডি খুঁজে বের করা (যাতে মেসেজ অ্যাডমিনকে পাঠানো যায়)
        const { data: adminData } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .single()
        
        let fetchedAdminId = null
        if (adminData) {
          fetchedAdminId = adminData.id
          if (isMounted) setAdminId(fetchedAdminId)
        }

        // ৩. ইউজারের সব মেসেজ ফেচ করা এবং Seen মার্ক করা
        await fetchMessages(session.user.id)
        if (fetchedAdminId) {
          await markMessagesAsRead(session.user.id, fetchedAdminId)
        }

        // ৪. রিয়েল-টাইম সাবস্ক্রিপশন
        channel = supabase
          .channel('cas_realtime_chat')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cas_messages' }, (payload) => {
            const newMsg = payload.new
            if (newMsg.receiver_id === session.user.id || newMsg.sender_id === session.user.id) {
              fetchMessages(session.user.id)
              
              // রিয়েল-টাইমে মেসেজ এলে সেটিও Seen মার্ক হবে
              if (newMsg.receiver_id === session.user.id && fetchedAdminId) {
                markMessagesAsRead(session.user.id, fetchedAdminId)
              }
            }
          })
          .subscribe()

      } catch (error) {
        console.error("Inbox initialization error:", error)
      } finally {
        // 🔴 finally ব্লকের কারণে লোডিং ১০০% বন্ধ হবেই!
        if (isMounted) setLoading(false)
      }
    }

    initializeInbox()
    
    // 🔴 আসল ক্লিনআপ ব্লক
    return () => { 
      isMounted = false 
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [router])

  // 🔴 মেসেজ Read (Seen) মার্ক করার ফাংশন
  const markMessagesAsRead = async (userId, adminId) => {
    try {
      await supabase
        .from('cas_messages')
        .update({ is_read: true })
        .eq('sender_id', adminId)
        .eq('receiver_id', userId)
        .eq('is_read', false)
    } catch (error) {
      console.error("Error marking messages as read:", error)
    }
  }

  const fetchMessages = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('cas_messages')
        .select(`
          *,
          sender:sender_id(full_name, photo_url, role)
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: true })

      if (error) throw error
      if (data) {
        setMessages(data)
        scrollToBottom()
      }
    } catch (err) {
      console.error("মেসেজ ফেচ করতে সমস্যা:", err.message)
    }
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // মেসেজ পাঠানোর ফাংশন
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !adminId || !user) return

    setSending(true)
    try {
      const { error } = await supabase.from('cas_messages').insert([{
        sender_id: user.id,
        receiver_id: adminId,
        content: newMessage.trim(),
        message_type: 'text'
      }])

      if (error) throw error
      setNewMessage('')
    } catch (err) {
      alert("মেসেজ পাঠাতে সমস্যা হয়েছে: " + err.message)
    } finally {
      setSending(false)
    }
  }

  // জিরো-স্টোরেজ রিসিট ডাউনলোড ফাংশন (html2canvas)
  const downloadReceipt = async (receiptId, receiptNo) => {
    const element = document.getElementById(`receipt-${receiptId}`)
    if (!element) return

    try {
      element.classList.add('download-mode')
      
      const canvas = await html2canvas(element, { 
        backgroundColor: '#0a1c13',
        scale: 2 
      })
      
      element.classList.remove('download-mode')

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `CAS-Receipt-${receiptNo}.jpg`
      link.click()
    } catch (error) {
      alert("রিসিট ডাউনলোড করতে সমস্যা হয়েছে।")
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-[#050b08] flex items-center justify-center"><i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#e76f51]"></i></div>
  }

  return (
    <div className="min-h-screen bg-[#050b08] flex flex-col pt-20 relative">
      
      {/* Header */}
      <div className="bg-[#0a1c13]/90 backdrop-blur-md border-b border-white/10 p-4 sticky top-0 z-20 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
            <i className="fa-solid fa-arrow-left text-xl"></i>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e76f51]/20 text-[#e76f51] flex items-center justify-center border border-[#e76f51]/30">
              <i className="fa-solid fa-headset text-lg"></i>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">CAS Support & Inbox</h1>
              <p className="text-[10px] text-emerald-400 font-bold tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-6 flex flex-col pb-4">
          
          {messages.length === 0 ? (
            <div className="text-center py-20 opacity-50">
              <i className="fa-regular fa-comments text-5xl text-gray-500 mb-4"></i>
              <p className="text-gray-400 font-medium">অ্যাডমিনের সাথে আপনার চ্যাট হিস্ট্রি এখানে দেখাবে।</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user?.id
              const isReceipt = msg.message_type === 'receipt'

              return (
                <div key={msg.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[85%] md:max-w-[70%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {/* Avatar */}
                    <img 
                      src={msg.sender?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.full_name || 'User')}&background=0a1c13&color=fff`} 
                      className="w-8 h-8 rounded-full border border-white/10 shrink-0" 
                      alt="Avatar" 
                    />
                    
                    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] text-gray-500 mb-1 px-1">
                        {msg.sender?.full_name} {msg.sender?.role === 'admin' && <i className="fa-solid fa-circle-check text-blue-400 ml-0.5"></i>} • {new Date(msg.created_at).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      
                      {/* Normal Text Message */}
                      {!isReceipt ? (
                        <div className={`p-3.5 rounded-2xl text-sm shadow-md ${isMine ? 'bg-[#2d6a4f] text-white rounded-tr-sm' : 'bg-white/10 text-gray-200 border border-white/5 rounded-tl-sm'}`}>
                          {msg.content}
                        </div>
                      ) : (
                        /* Zero-Storage Receipt Bubble */
                        <div className="flex flex-col gap-2 w-full max-w-sm sm:max-w-md">
                          {msg.content && (
                            <div className="bg-white/10 border border-white/5 text-gray-200 p-3.5 rounded-2xl rounded-tl-sm text-sm">
                              {msg.content}
                            </div>
                          )}
                          
                          {/* Receipt Card */}
                          <div 
                            id={`receipt-${msg.id}`} 
                            className="bg-white text-black p-5 sm:p-6 rounded-2xl shadow-xl relative overflow-hidden border-t-8 border-[#0a1c13] mt-2"
                          >
                            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                              <i className="fa-solid fa-mountain-sun text-[100px]"></i>
                            </div>
                            
                            <div className="relative z-10">
                              <div className="flex justify-between items-start border-b-2 border-gray-200 pb-3 mb-3">
                                <div>
                                  <h3 className="text-xl font-black text-[#0a1c13] leading-none">C.A.S.</h3>
                                  <p className="text-[8px] font-bold tracking-widest text-gray-500 mt-1">CUET ADVENTURE SOCIETY</p>
                                </div>
                                <div className="text-right">
                                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider">Confirmed</span>
                                  <p className="text-[9px] text-gray-500 mt-1.5 font-mono">No: {msg.metadata?.receipt_no}</p>
                                </div>
                              </div>

                              <div className="mb-4">
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Event Name</p>
                                <p className="font-black text-base text-gray-800 leading-tight">{msg.metadata?.event_name}</p>
                              </div>

                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4 space-y-2 text-xs">
                                <div className="flex justify-between border-b border-gray-200 pb-1">
                                  <span className="text-gray-500 font-medium">Explorer:</span>
                                  <span className="font-bold text-gray-800">{msg.metadata?.explorer_name}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 pb-1">
                                  <span className="text-gray-500 font-medium">Method:</span>
                                  <span className="font-bold text-gray-800">{msg.metadata?.payment_method?.split('-')[0]}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500 font-medium">TrxID:</span>
                                  <span className="font-mono font-bold text-gray-800">{msg.metadata?.trx_id}</span>
                                </div>
                              </div>

                              <div className="flex justify-between items-end bg-[#0a1c13] text-white p-3 rounded-xl">
                                <div>
                                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Amount Paid</p>
                                  <p className="text-2xl font-black">৳ {msg.metadata?.amount_paid}</p>
                                </div>
                                <div className="text-right">
                                  <i className="fa-solid fa-barcode text-3xl opacity-50"></i>
                                  <p className="text-[7px] text-gray-400 mt-1">{new Date(msg.metadata?.payment_date).toLocaleDateString('en-GB')}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <button 
                            onClick={() => downloadReceipt(msg.id, msg.metadata?.receipt_no)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 mt-1 shadow-md"
                          >
                            <i className="fa-solid fa-download"></i> রিসিটটি ডাউনলোড করুন (JPEG)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input Area */}
      <div className="bg-[#0a1c13]/90 backdrop-blur-md border-t border-white/10 p-4 sticky bottom-0 z-20">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-3 relative">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="আপনার মেসেজ লিখুন..." 
              className="w-full bg-black/50 border border-white/10 rounded-full pl-5 pr-14 py-3.5 text-sm text-white outline-none focus:border-blue-400 transition-colors"
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim() || sending}
              className="absolute right-2 top-1.5 bottom-1.5 w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors"
            >
              {sending ? <i className="fa-solid fa-circle-notch fa-spin text-sm"></i> : <i className="fa-solid fa-paper-plane text-sm ml-[-2px]"></i>}
            </button>
          </form>
          <p className="text-center text-[10px] text-gray-500 mt-2">ছবি বা ফাইল পাঠাতে চাইলে ImgBB তে আপলোড করে লিংক দিন।</p>
        </div>
      </div>
    </div>
  )
}
