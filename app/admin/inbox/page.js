'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminInboxPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [admin, setAdmin] = useState(null)
  
  // Contacts & Chat States
  const [contacts, setContacts] = useState([])
  const [selectedContact, setSelectedContact] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  
  // Mobile View Toggle ('list' or 'chat')
  const [mobileView, setMobileView] = useState('list') 
  const messagesEndRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    const initializeAdminInbox = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        if (isMounted) router.push('/login')
        return
      }

      // ১. অ্যাডমিন ভেরিফিকেশন
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profileData?.role !== 'admin') {
        alert("এই পেজে প্রবেশাধিকার নেই!")
        if (isMounted) router.push('/dashboard')
        return
      }

      if (isMounted) setAdmin(profileData)

      // ২. কন্টাক্ট লিস্ট লোড করা (যাঁদের সাথে চ্যাট হয়েছে)
      await fetchContacts(profileData.id)

      // ৩. রিয়েল-টাইম চ্যাট লিসেনার
      const channel = supabase
        .channel('admin_realtime_chat')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cas_messages' }, (payload) => {
          const newMsg = payload.new
          
          // যদি মেসেজটি অ্যাডমিনের সাথে সম্পর্কিত হয়
          if (newMsg.receiver_id === profileData.id || newMsg.sender_id === profileData.id) {
            fetchContacts(profileData.id) // কন্টাক্ট লিস্ট আপডেট (লেটেস্ট মেসেজ দেখানোর জন্য)
            
            // যদি সিলেক্ট করা ইউজারের মেসেজ হয়, তবে চ্যাট উইন্ডো আপডেট করো
            setSelectedContact(prevContact => {
              if (prevContact && (newMsg.sender_id === prevContact.id || newMsg.receiver_id === prevContact.id)) {
                fetchMessages(profileData.id, prevContact.id)
              }
              return prevContact
            })
          }
        })
        .subscribe()

      if (isMounted) setLoading(false)

      return () => {
        supabase.removeChannel(channel)
      }
    }

    initializeAdminInbox()
    return () => { isMounted = false }
  }, [router])

  // 🔴 ইউজারদের তালিকা নিয়ে আসার ফাংশন
  const fetchContacts = async (adminId) => {
    try {
      const { data, error } = await supabase
        .from('cas_messages')
        .select(`
          id, content, created_at, sender_id, receiver_id, message_type,
          sender:sender_id(id, full_name, photo_url, student_id),
          receiver:receiver_id(id, full_name, photo_url, student_id)
        `)
        .or(`sender_id.eq.${adminId},receiver_id.eq.${adminId}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      // ইউনিক ইউজার ফিল্টার করা
      const contactsMap = new Map()
      if (data) {
        data.forEach(msg => {
          const isAdminSender = msg.sender_id === adminId
          const contactId = isAdminSender ? msg.receiver_id : msg.sender_id
          const contactProfile = isAdminSender ? msg.receiver : msg.sender

          if (!contactsMap.has(contactId) && contactProfile) {
            contactsMap.set(contactId, {
              id: contactId,
              ...contactProfile,
              lastMessage: msg.message_type === 'receipt' ? '🧾 Payment Receipt' : msg.content,
              lastMessageTime: msg.created_at
            })
          }
        })
      }
      setContacts(Array.from(contactsMap.values()))
    } catch (err) {
      console.error("Contacts loading error:", err.message)
    }
  }

  // 🔴 নির্দিষ্ট ইউজারের মেসেজ নিয়ে আসার ফাংশন
  const fetchMessages = async (adminId, contactId) => {
    try {
      const { data, error } = await supabase
        .from('cas_messages')
        .select(`*, sender:sender_id(full_name, photo_url, role)`)
        .or(`and(sender_id.eq.${adminId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${adminId})`)
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

  const handleContactSelect = (contact) => {
    setSelectedContact(contact)
    setMobileView('chat')
    fetchMessages(admin.id, contact.id)
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // 🔴 মেসেজ পাঠানোর ফাংশন (dynamic receiver_id)
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedContact || !admin) return

    setSending(true)
    try {
      const { error } = await supabase.from('cas_messages').insert([{
        sender_id: admin.id,
        receiver_id: selectedContact.id, // 🔴 এখন অ্যাডমিন যাকে সিলেক্ট করবে, শুধু তার কাছেই যাবে
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

  if (loading) {
    return <div className="min-h-screen bg-[#050b08] flex items-center justify-center"><i className="fa-solid fa-circle-notch fa-spin text-4xl text-[#e76f51]"></i></div>
  }

  return (
    <div className="min-h-screen bg-[#050b08] pt-20 pb-4 px-2 sm:px-6 flex justify-center h-screen overflow-hidden">
      
      <div className="w-full max-w-6xl bg-[#0a1c13] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl flex overflow-hidden h-full">
        
        {/* ================= LEFT PANE: CONTACTS LIST ================= */}
        <div className={`w-full md:w-1/3 md:min-w-[320px] bg-[#0a1c13] flex flex-col border-r border-white/10 ${mobileView === 'list' ? 'block' : 'hidden md:flex'}`}>
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 bg-black/20 flex items-center justify-between shrink-0">
            <h2 className="text-white font-black text-lg flex items-center gap-2">
              <i className="fa-solid fa-inbox text-[#e76f51]"></i> অ্যাডমিন ইনবক্স
            </h2>
            <Link href="/admin" className="text-gray-400 hover:text-white bg-white/5 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
              <i className="fa-solid fa-arrow-left text-sm"></i>
            </Link>
          </div>

          {/* Contact List */}
          <div className="flex-grow overflow-y-auto custom-scrollbar p-2">
            {contacts.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <i className="fa-solid fa-ghost text-3xl text-gray-500 mb-2"></i>
                <p className="text-xs font-bold text-gray-400">কোনো চ্যাট হিস্ট্রি নেই</p>
              </div>
            ) : (
              contacts.map(contact => (
                <div 
                  key={contact.id} 
                  onClick={() => handleContactSelect(contact)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all mb-1 ${selectedContact?.id === contact.id ? 'bg-[#e76f51]/20 border border-[#e76f51]/30' : 'hover:bg-white/5 border border-transparent'}`}
                >
                  <img 
                    src={contact.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.full_name)}&background=1f2937&color=fff`} 
                    alt="User" 
                    className="w-10 h-10 rounded-full border border-white/10 object-cover" 
                  />
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="text-white font-bold text-sm truncate">{contact.full_name}</h4>
                      <span className="text-[9px] text-gray-500 whitespace-nowrap ml-2">
                        {new Date(contact.lastMessageTime).toLocaleDateString('en-GB', {day:'numeric', month:'short'})}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${selectedContact?.id === contact.id ? 'text-[#e76f51]' : 'text-gray-400'}`}>
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
              {/* Chat Header */}
              <div className="p-4 border-b border-white/10 bg-black/40 flex items-center gap-3 shrink-0">
                <button onClick={() => setMobileView('list')} className="md:hidden text-gray-400 hover:text-white mr-2">
                  <i className="fa-solid fa-chevron-left text-lg"></i>
                </button>
                <img 
                  src={selectedContact.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContact.full_name)}&background=1f2937&color=fff`} 
                  alt="Avatar" 
                  className="w-9 h-9 rounded-full border border-white/10"
                />
                <div>
                  <h3 className="text-white font-bold text-sm leading-none">{selectedContact.full_name}</h3>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-mono">ID: {selectedContact.student_id || 'Unknown'}</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-grow overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4">
                {messages.map((msg) => {
                  const isAdmin = msg.sender_id === admin.id
                  return (
                    <div key={msg.id} className={`flex w-full ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${isAdmin ? 'items-end' : 'items-start'}`}>
                        <span className="text-[9px] text-gray-500 mb-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        
                        <div className={`p-3 rounded-2xl text-sm shadow-md ${isAdmin ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white/10 text-gray-200 border border-white/5 rounded-tl-sm'}`}>
                          {msg.message_type === 'receipt' ? (
                            <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                              <i className="fa-solid fa-receipt text-lg"></i> Payment Receipt Sent
                            </div>
                          ) : (
                            msg.content
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-[#0a1c13] border-t border-white/10 shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-3 relative">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`${selectedContact.full_name} কে মেসেজ লিখুন...`}
                    className="w-full bg-black/40 border border-white/10 rounded-full pl-5 pr-14 py-3.5 text-sm text-white outline-none focus:border-[#e76f51] transition-colors"
                  />
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim() || sending}
                    className="absolute right-2 top-1.5 bottom-1.5 w-10 h-10 bg-[#e76f51] hover:bg-orange-600 disabled:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    {sending ? <i className="fa-solid fa-circle-notch fa-spin text-sm"></i> : <i className="fa-solid fa-paper-plane text-sm ml-[-2px]"></i>}
                  </button>
                </form>
              </div>
            </>
          ) : (
            // No User Selected State
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6 opacity-50">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <i className="fa-solid fa-comments text-4xl text-gray-400"></i>
              </div>
              <h2 className="text-xl font-black text-white mb-2">CAS Admin Inbox</h2>
              <p className="text-sm text-gray-400 max-w-xs">বাম পাশের লিস্ট থেকে যেকোনো একজন ইউজারকে সিলেক্ট করে চ্যাট শুরু করুন।</p>
            </div>
          )}
          
        </div>
      </div>
    </div>
  )
}
