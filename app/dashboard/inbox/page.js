'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import html2canvas from 'html2canvas'

export default function GlobalInboxPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  
  // Contacts & Chat States
  const [contacts, setContacts] = useState([])
  const [selectedContact, setSelectedContact] = useState(null)
  const selectedContactRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  
  // Mobile View Toggle ('list' or 'chat')
  const [mobileView, setMobileView] = useState('list') 
  const messagesEndRef = useRef(null)

  // Search Feature States
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  // 🟢 ইউজারের সার্চ ফাংশন
  const handleSearchUsers = async (query) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    
    setIsSearching(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, student_id, role')
        .ilike('full_name', `%${query}%`) // নামের সাথে মিলিয়ে সার্চ
        .neq('id', currentUser.id) // নিজেকে বাদে সার্চ
        .limit(10)

      if (error) throw error
      setSearchResults(data || [])
    } catch (err) {
      console.error("Search error:", err)
    } finally {
      setIsSearching(false)
    }
  }

  // 🟢 সার্চ রেজাল্ট থেকে নতুন চ্যাট শুরু করা
  const handleStartNewChat = async (user) => {
    const existingContact = contacts.find(c => c.id === user.id)
    
    let contactToSelect;
    if (existingContact) {
      contactToSelect = existingContact
    } else {
      contactToSelect = {
        id: user.id,
        full_name: user.full_name,
        photo_url: user.photo_url,
        student_id: user.student_id,
        role: user.role,
        lastMessage: 'নতুন কথোপকথন শুরু করুন',
        lastMessageTime: new Date().toISOString(),
        unread: 0
      }
      setContacts(prev => [contactToSelect, ...prev])
    }

    setSearchQuery('')
    setSearchResults([])
    handleContactSelect(contactToSelect)
  }

  useEffect(() => {
    let isMounted = true
    let channel = null 

    const initializeInbox = async () => {
      try { 
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          if (isMounted) router.push('/login')
          return
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (isMounted) setCurrentUser(profileData)

        // কন্টাক্ট লিস্ট লোড করা
        await fetchContacts(profileData.id)

        // রিয়েল-টাইম চ্যাট লিসেনার (যেকোনো মেসেজ রিসিভ বা সেন্ড হলে আপডেট হবে)
        channel = supabase
          .channel('global_realtime_chat')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cas_messages' }, (payload) => {
            const newMsg = payload.new
            
            if (newMsg.receiver_id === profileData.id || newMsg.sender_id === profileData.id) {
              fetchContacts(profileData.id)
              
              const currentContact = selectedContactRef.current
              if (currentContact && (newMsg.sender_id === currentContact.id || newMsg.receiver_id === currentContact.id)) {
                fetchMessages(profileData.id, currentContact.id)
                
                // যদি আমি রিসিভার হই এবং চ্যাট ওপেন থাকে, তবে সাথে সাথে রিড মার্ক করবো
                if (newMsg.receiver_id === profileData.id) {
                  markMessagesAsRead(currentContact.id, profileData.id)
                }
              }
            }
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cas_messages' }, (payload) => {
             // 🟢 রিয়েল-টাইম Read Status আপডেট (সিন হলে ব্লু টিক দেখাবে)
             const updatedMsg = payload.new
             const currentContact = selectedContactRef.current
             if (currentContact && (updatedMsg.sender_id === currentContact.id || updatedMsg.receiver_id === currentContact.id)) {
                 fetchMessages(profileData.id, currentContact.id)
             }
          })
          .subscribe()

      } catch (error) {
        console.error("Inbox init error:", error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initializeInbox()
    
    return () => { 
      isMounted = false 
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [router])

  // 🟢 ডায়নামিক কন্টাক্ট ফেচিং
  const fetchContacts = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('cas_messages')
        .select(`
          id, content, created_at, sender_id, receiver_id, message_type, is_read,
          sender:sender_id(id, full_name, photo_url, student_id, role),
          receiver:receiver_id(id, full_name, photo_url, student_id, role)
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      const contactsMap = new Map()
      if (data) {
        data.forEach(msg => {
          const isMeSender = msg.sender_id === userId
          const contactId = isMeSender ? msg.receiver_id : msg.sender_id
          const contactProfile = isMeSender ? msg.receiver : msg.sender

          if (!contactsMap.has(contactId) && contactProfile) {
            contactsMap.set(contactId, {
              id: contactId,
              ...contactProfile,
              lastMessage: msg.message_type === 'receipt' ? '🧾 Payment Receipt' : msg.content,
              lastMessageTime: msg.created_at,
              unread: (!isMeSender && !msg.is_read) ? 1 : 0
            })
          } else if (!isMeSender && !msg.is_read) {
             const existing = contactsMap.get(contactId)
             if(existing) existing.unread += 1
          }
        })
      }
      setContacts(Array.from(contactsMap.values()))
    } catch (err) {
      console.error("Contacts loading error:", err.message)
    }
  }

  // 🟢 চ্যাট হিস্ট্রি ফেচিং
  const fetchMessages = async (userId, contactId) => {
    try {
      const { data, error } = await supabase
        .from('cas_messages')
        .select(`*, sender:sender_id(full_name, photo_url, role)`)
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true })

      if (error) throw error
      if (data) {
        setMessages(data)
        scrollToBottom()
      }
    } catch (err) {
      console.error("Message loading error:", err.message)
    }
  }

  // 🟢 মেসেজ রিড (Seen) মার্ক করা
  const markMessagesAsRead = async (senderId, myId) => {
    try {
      await supabase
        .from('cas_messages')
        .update({ is_read: true })
        .eq('sender_id', senderId)
        .eq('receiver_id', myId)
        .eq('is_read', false)
    } catch (error) {
      console.error("Error marking messages as read:", error)
    }
  }

    const handleContactSelect = async (contact) => {
    setSelectedContact(contact)
    selectedContactRef.current = contact
    setMobileView('chat')
    
    await fetchMessages(currentUser.id, contact.id)

    // আনরিড মেসেজ থাকলে ডেটাবেসে সিন করবো এবং লোকাল স্টেট সাথে সাথে জিরো করে দেবো
    if (contact.unread > 0) {
      await markMessagesAsRead(contact.id, currentUser.id)
      
      // 🔴 The Masterstroke: ডেটাবেস থেকে আবার সব ফেচ করার জন্য বসে না থেকে 
      // লোকাল স্টেটেই আনরিড কাউন্ট জিরো করে দিচ্ছি। 
      setContacts(prevContacts => 
        prevContacts.map(c => 
          c.id === contact.id ? { ...c, unread: 0 } : c
        )
      )
    }
  }


  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedContact || !currentUser) return

    setSending(true)
    try {
      const { error } = await supabase.from('cas_messages').insert([{
        sender_id: currentUser.id,
        receiver_id: selectedContact.id, 
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

  // 🟢 রিসিট ডাউনলোড ফাংশন
  const downloadReceipt = async (receiptId, receiptNo) => {
    const element = document.getElementById(`receipt-${receiptId}`)
    if (!element) return

    try {
      element.classList.add('download-mode')
      const canvas = await html2canvas(element, { backgroundColor: '#0a1c13', scale: 2 })
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
    <div className="min-h-screen bg-[#050b08] pt-20 pb-4 px-2 sm:px-6 flex justify-center h-[calc(100vh)] overflow-hidden">
      
      <div className="w-full max-w-6xl bg-[#0a1c13] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl flex overflow-hidden h-full">
        
        {/* ================= LEFT PANE: CONTACTS LIST & SEARCH ================= */}
        <div className={`w-full md:w-1/3 md:min-w-[320px] bg-[#0a1c13] flex flex-col border-r border-white/10 ${mobileView === 'list' ? 'block' : 'hidden md:flex'}`}>
          
          <div className="p-4 sm:p-5 border-b border-white/10 bg-black/20 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-black text-lg flex items-center gap-2">
                <i className="fa-regular fa-paper-plane text-[#e76f51]"></i> ইনবক্স
              </h2>
              <Link href="/dashboard" className="text-gray-400 hover:text-white bg-white/5 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                <i className="fa-solid fa-arrow-left text-sm"></i>
              </Link>
            </div>

            {/* 🟢 Search Input Box */}
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm"></i>
              <input 
                type="text" 
                placeholder="যেকোনো ইউজারকে খুঁজুন..." 
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none focus:border-[#e76f51] transition-colors"
              />
              {isSearching && <i className="fa-solid fa-circle-notch fa-spin absolute right-3 top-1/2 transform -translate-y-1/2 text-[#e76f51] text-xs"></i>}
            </div>
          </div>

          <div className="flex-grow overflow-y-auto custom-scrollbar p-2 relative">
            
            {/* 🟢 Search Results Dropdown Overlay */}
            {searchQuery.trim() !== '' && (
              <div className="absolute inset-0 bg-[#0a1c13] z-20 p-2 overflow-y-auto custom-scrollbar">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3 ml-2 border-b border-white/10 pb-1">Search Results</p>
                
                {searchResults.length === 0 && !isSearching ? (
                  <p className="text-center text-gray-500 text-xs py-5">কাউকে পাওয়া যায়নি!</p>
                ) : (
                  searchResults.map(user => (
                    <div 
                      key={user.id} 
                      onClick={() => handleStartNewChat(user)}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-all mb-1 border border-transparent"
                    >
                      <img src={user.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=1f2937&color=fff`} className="w-10 h-10 rounded-full border border-white/10 object-cover shrink-0" alt="User" />
                      <div>
                        <h4 className="text-sm text-white font-bold">
                          {user.full_name}
                          {user.role === 'admin' && <i className="fa-solid fa-circle-check text-blue-400 ml-1" title="Admin"></i>}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-mono">ID: {user.student_id || 'N/A'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Default Contact List */}
            {contacts.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <i className="fa-solid fa-ghost text-3xl text-gray-500 mb-2"></i>
                <p className="text-xs font-bold text-gray-400">কোনো চ্যাট হিস্ট্রি নেই</p>
                <p className="text-[10px] text-gray-500 mt-1">উপরে সার্চ করে মেসেজ পাঠান</p>
              </div>
            ) : (
              contacts.map(contact => (
                <div 
                  key={contact.id} 
                  onClick={() => handleContactSelect(contact)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all mb-1 ${selectedContact?.id === contact.id ? 'bg-[#e76f51]/20 border border-[#e76f51]/30' : 'hover:bg-white/5 border border-transparent'}`}
                >
                  <div className="relative shrink-0">
                    <img 
                      src={contact.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.full_name)}&background=1f2937&color=fff`} 
                      alt="User" 
                      className="w-10 h-10 rounded-full border border-white/10 object-cover" 
                    />
                    {contact.unread > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-md">
                        {contact.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className={`text-sm truncate ${contact.unread > 0 ? 'text-white font-black' : 'text-white font-bold'}`}>
                        {contact.full_name}
                      </h4>
                      <span className="text-[9px] text-gray-500 whitespace-nowrap ml-2">
                        {new Date(contact.lastMessageTime).toLocaleDateString('en-GB', {day:'numeric', month:'short'})}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${selectedContact?.id === contact.id ? 'text-[#e76f51]' : contact.unread > 0 ? 'text-gray-300 font-bold' : 'text-gray-400'}`}>
                      {contact.lastMessage}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ================= RIGHT PANE: CHAT INTERFACE ================= */}
        <div className={`w-full md:w-2/3 flex flex-col bg-[#050b08] relative ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}`}>
          
          {selectedContact ? (
            <>
              <div className="p-4 border-b border-white/10 bg-black/40 flex items-center gap-3 shrink-0 shadow-md z-10">
                <button onClick={() => setMobileView('list')} className="md:hidden text-gray-400 hover:text-white mr-2">
                  <i className="fa-solid fa-chevron-left text-lg"></i>
                </button>
                <img 
                  src={selectedContact.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContact.full_name)}&background=1f2937&color=fff`} 
                  alt="Avatar" 
                  className="w-9 h-9 rounded-full border border-white/10"
                />
                <div>
                  <h3 className="text-white font-bold text-sm leading-none flex items-center gap-1.5">
                    {selectedContact.full_name}
                    {selectedContact.role === 'admin' && <i className="fa-solid fa-circle-check text-blue-400 text-xs" title="Admin"></i>}
                  </h3>
                  <Link href={`/public-profile?id=${selectedContact.id}`} className="text-[10px] text-blue-400 hover:underline mt-1 inline-block uppercase tracking-widest font-mono">
                    <i className="fa-solid fa-user-astronaut"></i> Profile
                  </Link>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4">
                {messages.map((msg) => {
                  const isMine = msg.sender_id === currentUser.id
                  const isReceipt = msg.message_type === 'receipt'

                  return (
                    <div key={msg.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                        
                        {!isReceipt ? (
                          <div className={`p-3 rounded-2xl text-sm shadow-md ${isMine ? 'bg-[#e76f51] text-white rounded-tr-sm' : 'bg-white/10 text-gray-200 border border-white/5 rounded-tl-sm'}`}>
                            {msg.content}
                          </div>
                        ) : (
                          // 🟢 Receipt Card
                          <div className="flex flex-col gap-2 w-full max-w-sm">
                            {msg.content && (
                              <div className={`p-3.5 rounded-2xl text-sm ${isMine ? 'bg-[#e76f51] text-white rounded-tr-sm' : 'bg-white/10 text-gray-200 border border-white/5 rounded-tl-sm'}`}>
                                {msg.content}
                              </div>
                            )}
                            
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
                                </div>
                              </div>
                            </div>

                            <button 
                              onClick={() => downloadReceipt(msg.id, msg.metadata?.receipt_no)}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 mt-1 shadow-md"
                            >
                              <i className="fa-solid fa-download"></i> রিসিট ডাউনলোড করুন
                            </button>
                          </div>
                        )}

                        {/* 🟢 Timestamp & Read Status (Seen/Delivered Marks) */}
                        <div className="flex items-center gap-1 mt-1 px-1">
                          <span className="text-[9px] text-gray-500">
                            {new Date(msg.created_at).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          {isMine && (
                            <span className="text-[10px]">
                              {msg.is_read ? (
                                <i className="fa-solid fa-check-double text-blue-400" title="Seen"></i>
                              ) : (
                                <i className="fa-solid fa-check text-gray-500" title="Delivered"></i>
                              )}
                            </span>
                          )}
                        </div>

                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Area */}
              <div className="bg-[#0a1c13]/90 backdrop-blur-md border-t border-white/10 p-3 sm:p-4 shrink-0 z-10">
                <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3 relative">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="মেসেজ লিখুন..." 
                    className="w-full bg-black/50 border border-white/10 rounded-full pl-5 pr-12 sm:pr-14 py-3 sm:py-3.5 text-sm text-white outline-none focus:border-[#e76f51] transition-colors"
                  />
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim() || sending}
                    className="absolute right-1.5 sm:right-2 top-1.5 bottom-1.5 w-10 sm:w-11 h-10 sm:h-11 bg-[#e76f51] hover:bg-orange-600 disabled:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    {sending ? <i className="fa-solid fa-circle-notch fa-spin text-sm"></i> : <i className="fa-solid fa-paper-plane text-sm ml-[-2px]"></i>}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center p-6 text-center opacity-50">
              <i className="fa-regular fa-paper-plane text-6xl text-gray-500 mb-4"></i>
              <h3 className="text-xl font-bold text-white mb-2">গ্লোবাল ইনবক্স</h3>
              <p className="text-sm text-gray-400 max-w-sm">বাম পাশ থেকে একজন ইউজার সিলেক্ট করুন অথবা উপরে সার্চ করে নতুন কারো সাথে চ্যাট শুরু করুন।</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
