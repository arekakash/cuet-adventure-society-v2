"use client";

import { useState, useEffect, useRef } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

export default function EventCalculator() {
  const [isMounted, setIsMounted] = useState(false);
  const receiptRef = useRef(null);

  // --- States ---
  const [eventData, setEventData] = useState({ name: "", date: "" });
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState("setup"); // setup, members, expenses, settlement
  const [newMemberName, setNewMemberName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Expense Form State (Updated for Multi-Payers)
  const [expenseForm, setExpenseForm] = useState({ 
    desc: "", 
    amount: "", 
    paymentMethod: "group", // 'group', 'single', 'multiple'
    singlePayerId: "", 
    multiPayers: {}, // { memberId: amountStr }
    consumers: [] 
  });

  // --- Local Storage Sync (Offline Protection) ---
  useEffect(() => {
    AOS.init({ duration: 600, once: true });
    const savedData = localStorage.getItem("cas_event_calc");
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setEventData(parsed.eventData || { name: "", date: "" });
      setMembers(parsed.members || []);
      setExpenses(parsed.expenses || []);
      if (parsed.eventData?.name) setActiveTab("members");
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("cas_event_calc", JSON.stringify({ eventData, members, expenses }));
    }
  }, [eventData, members, expenses, isMounted]);

  // --- Handlers ---
  const handleStartEvent = (e) => {
    e.preventDefault();
    if (!eventData.name) return alert("ইভেন্টের নাম দিন!");
    setActiveTab("members");
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    setMembers([...members, { id: Date.now().toString(), name: newMemberName.trim(), deposit: 0 }]);
    setNewMemberName("");
  };

  const handleUpdateDeposit = (id, amount) => {
    setMembers(members.map(m => m.id === id ? { ...m, deposit: parseFloat(amount) || 0 } : m));
  };

  const handleRemoveMember = (id) => {
    if (window.confirm("এই মেম্বারকে রিমুভ করবেন?")) {
      setMembers(members.filter(m => m.id !== id));
      setExpenses(expenses.map(exp => ({
        ...exp,
        consumers: exp.consumers.filter(cId => cId !== id)
      })));
    }
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseForm.amount);

    if (!expenseForm.desc || !amountNum) return alert("খরচের বিবরণ ও পরিমাণ সঠিকভাবে দিন!");
    if (expenseForm.consumers.length === 0) return alert("অন্তত একজনকে সিলেক্ট করুন যার জন্য খরচ হয়েছে!");
    
    // Validation for Multiple Payers
    if (expenseForm.paymentMethod === 'multiple') {
      const sumOfMultiPayers = Object.values(expenseForm.multiPayers).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
      if (sumOfMultiPayers !== amountNum) {
        return alert(`হিসাব মিলছে না! মোট খরচ ৳${amountNum}, কিন্তু মেম্বারদের দেওয়া টাকার যোগফল ৳${sumOfMultiPayers}`);
      }
    }

    if (expenseForm.paymentMethod === 'single' && !expenseForm.singlePayerId) {
       return alert("কে টাকা দিয়েছে তা সিলেক্ট করুন!");
    }

    setExpenses([{
      id: Date.now().toString(),
      desc: expenseForm.desc,
      amount: amountNum,
      paymentMethod: expenseForm.paymentMethod,
      singlePayerId: expenseForm.singlePayerId,
      multiPayers: expenseForm.multiPayers,
      consumers: expenseForm.consumers
    }, ...expenses]);

    // Reset Form
    setExpenseForm({ 
      desc: "", amount: "", 
      paymentMethod: "group", singlePayerId: "", multiPayers: {}, 
      consumers: members.map(m => m.id) 
    });
  };

  const handleRemoveExpense = (id) => {
    if(window.confirm("খরচটি ডিলিট করবেন?")) setExpenses(expenses.filter(e => e.id !== id));
  };

  const resetCalculator = () => {
    if(window.confirm("পুরো হিসাব মুছে নতুন ইভেন্ট শুরু করবেন? এটি রিস্টোর করা যাবে না!")) {
      setEventData({ name: "", date: "" });
      setMembers([]);
      setExpenses([]);
      setActiveTab("setup");
      localStorage.removeItem("cas_event_calc");
    }
  };

  // --- Calculations ---
  const totalCollected = members.reduce((sum, m) => sum + (m.deposit || 0), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const groupFundBalance = totalCollected - expenses.filter(e => e.paymentMethod === 'group').reduce((sum, e) => sum + e.amount, 0);

  // Settlement Algorithm
  const calculateSettlement = () => {
    let balances = {}; 
    members.forEach(m => {
      balances[m.id] = { name: m.name, paid: m.deposit, consumed: 0, net: 0 };
    });

    expenses.forEach(exp => {
      const perHead = exp.amount / exp.consumers.length;
      exp.consumers.forEach(cId => {
        if (balances[cId]) balances[cId].consumed += perHead;
      });

      if (exp.paymentMethod === 'single' && balances[exp.singlePayerId]) {
        balances[exp.singlePayerId].paid += exp.amount;
      } else if (exp.paymentMethod === 'multiple') {
        Object.entries(exp.multiPayers).forEach(([pId, amtStr]) => {
           const amt = parseFloat(amtStr) || 0;
           if (balances[pId]) balances[pId].paid += amt;
        });
      }
    });

    Object.keys(balances).forEach(id => {
      balances[id].net = balances[id].paid - balances[id].consumed;
    });

    return balances;
  };

  const settlementData = calculateSettlement();

  // --- Generate High-Res Image ---
  const downloadReceipt = async () => {
    setIsGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const element = receiptRef.current;
      
      // Determine background color based on theme
      const isDarkMode = document.documentElement.classList.contains('dark');
      const bgColor = isDarkMode ? '#0a1c13' : '#fdfbf7'; 

      const canvas = await html2canvas(element, { 
        scale: 3, 
        backgroundColor: bgColor,
        useCORS: true
      });
      
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `CAS-Event-Slip-${eventData.name.replace(/\s+/g, '-')}.png`;
      link.click();
    } catch (err) {
      alert("স্লিপ জেনারেট করতে সমস্যা হয়েছে!");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-pastel-bg dark:bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 relative text-gray-800 dark:text-gray-300 overflow-x-hidden transition-colors duration-500">
      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-8" data-aos="fade-down">
          <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white mb-2 tracking-tight transition-colors">
            ইভেন্ট <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">ক্যালকুলেটর</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">ট্যুরের যাবতীয় হিসাব-নিকাশের ম্যাজিক সমাধান</p>
        </div>

        {/* Tab Navigation */}
        {activeTab !== "setup" && (
          <div className="flex flex-wrap justify-center gap-2 bg-white dark:bg-white/5 p-2 rounded-2xl mb-6 border border-gray-200 dark:border-white/10 shadow-soft dark:shadow-none transition-colors duration-500">
            <button onClick={() => setActiveTab("members")} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm dark:shadow-none ${activeTab === 'members' ? 'bg-purple-500 text-white dark:shadow-glow' : 'bg-gray-50 text-gray-600 dark:bg-transparent dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'}`}>
              <i className="fa-solid fa-users mr-2"></i>মেম্বার ও ফান্ড
            </button>
            <button onClick={() => { setActiveTab("expenses"); setExpenseForm(p => ({...p, consumers: members.map(m=>m.id)})); }} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm dark:shadow-none ${activeTab === 'expenses' ? 'bg-pink-500 text-white dark:shadow-glow' : 'bg-gray-50 text-gray-600 dark:bg-transparent dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'}`}>
              <i className="fa-solid fa-money-bill-wave mr-2"></i>খরচের খাতা
            </button>
            <button onClick={() => setActiveTab("settlement")} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm dark:shadow-none ${activeTab === 'settlement' ? 'bg-emerald-500 text-white dark:shadow-glow' : 'bg-gray-50 text-gray-600 dark:bg-transparent dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'}`}>
              <i className="fa-solid fa-check-double mr-2"></i>ফাইনাল সেটেলমেন্ট
            </button>
          </div>
        )}

        {/* TAB 1: SETUP */}
        {activeTab === "setup" && (
          <div className="bg-white dark:bg-[#0a1c13] border border-gray-200 dark:border-white/10 rounded-3xl p-8 max-w-md mx-auto shadow-soft dark:shadow-2xl transition-colors duration-500" data-aos="zoom-in">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-200 dark:border-purple-500/40 text-purple-600 dark:text-purple-400 text-2xl transition-colors">
              <i className="fa-solid fa-compass"></i>
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white text-center mb-6 transition-colors">নতুন ইভেন্ট শুরু করুন</h2>
            <form onSubmit={handleStartEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 transition-colors">ইভেন্টের নাম *</label>
                <input required type="text" value={eventData.name} onChange={e => setEventData({...eventData, name: e.target.value})} placeholder="e.g. Sajek Tour 2026" className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-purple-500 outline-none transition-colors shadow-sm dark:shadow-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 transition-colors">তারিখ</label>
                <input type="date" value={eventData.date} onChange={e => setEventData({...eventData, date: e.target.value})} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-purple-500 outline-none dark:[color-scheme:dark] transition-colors shadow-sm dark:shadow-none" />
              </div>
              <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3.5 rounded-xl font-black tracking-widest mt-4 transition-colors shadow-md hover:-translate-y-1">হিসাব শুরু করুন <i className="fa-solid fa-arrow-right ml-2"></i></button>
            </form>
          </div>
        )}

        {/* TAB 2: MEMBERS & FUND */}
        {activeTab === "members" && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 dark:bg-gradient-to-br dark:from-emerald-900/40 dark:to-emerald-900/10 border border-emerald-200 dark:border-emerald-500/30 p-5 rounded-2xl text-center shadow-sm dark:shadow-none transition-colors duration-500">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-1 transition-colors">মোট ফান্ড কালেকশন</p>
                <p className="text-3xl font-black text-emerald-900 dark:text-white transition-colors">৳{totalCollected.toFixed(0)}</p>
              </div>
              <div className="bg-purple-50 dark:bg-gradient-to-br dark:from-purple-900/40 dark:to-purple-900/10 border border-purple-200 dark:border-purple-500/30 p-5 rounded-2xl text-center shadow-sm dark:shadow-none transition-colors duration-500">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-bold mb-1 transition-colors">মেম্বার সংখ্যা</p>
                <p className="text-3xl font-black text-purple-900 dark:text-white transition-colors">{members.length} জন</p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0a1c13] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-soft dark:shadow-xl transition-colors duration-500">
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-white/5 pb-3 transition-colors">মেম্বার যুক্ত করুন</h3>
              <form onSubmit={handleAddMember} className="flex gap-2 mb-6">
                <input type="text" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="মেম্বারের নাম লিখুন..." className="flex-1 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-purple-500 outline-none transition-colors shadow-sm dark:shadow-none" />
                <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-6 rounded-xl font-bold transition-colors shadow-md hover:-translate-y-0.5"><i className="fa-solid fa-plus"></i></button>
              </form>

              <div className="space-y-3">
                {members.length === 0 ? <p className="text-center text-gray-500 py-4 text-sm transition-colors">কোনো মেম্বার যুক্ত করা হয়নি।</p> : null}
                {members.map(member => (
                  <div key={member.id} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none">
                    <span className="font-bold text-gray-800 dark:text-white pl-2 transition-colors">{member.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-400">৳</span>
                        <input type="number" value={member.deposit || ''} onChange={(e) => handleUpdateDeposit(member.id, e.target.value)} placeholder="0" className="w-32 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg pl-7 pr-3 py-2 text-emerald-600 dark:text-emerald-400 font-bold focus:border-emerald-500 outline-none transition-colors shadow-inner dark:shadow-none" />
                      </div>
                      <button onClick={() => handleRemoveMember(member.id)} className="bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/30 p-2 rounded-lg transition-colors border border-red-200 dark:border-transparent"><i className="fa-solid fa-trash"></i></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EXPENSES */}
        {activeTab === "expenses" && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="bg-pink-50 dark:bg-gradient-to-br dark:from-pink-900/40 dark:to-pink-900/10 border border-pink-200 dark:border-pink-500/30 p-5 rounded-2xl text-center flex justify-between items-center shadow-sm dark:shadow-none transition-colors duration-500">
              <div>
                <p className="text-xs text-pink-600 dark:text-pink-400 font-bold mb-1 transition-colors">মোট খরচ</p>
                <p className="text-3xl font-black text-pink-900 dark:text-white text-left transition-colors">৳{totalExpense.toFixed(0)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1 transition-colors">গ্রুপ ফান্ডের ব্যালেন্স</p>
                <p className={`text-xl font-black transition-colors ${groupFundBalance < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>৳{groupFundBalance.toFixed(0)}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0a1c13] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-soft dark:shadow-xl transition-colors duration-500">
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-white/5 pb-3 transition-colors">খরচের এন্ট্রি করুন</h3>
              <form onSubmit={handleAddExpense} className="space-y-4 mb-8 bg-gray-50 dark:bg-black/30 p-5 rounded-2xl border border-gray-200 dark:border-white/5 transition-colors">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 transition-colors">কীসে খরচ হলো? *</label>
                    <input type="text" value={expenseForm.desc} onChange={e => setExpenseForm({...expenseForm, desc: e.target.value})} placeholder="যেমন: বাসের ভাড়া, খাবার" className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:border-pink-500 outline-none transition-colors shadow-sm dark:shadow-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 transition-colors">টাকার পরিমাণ (৳) *</label>
                    <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} placeholder="0" className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:border-pink-500 outline-none font-bold transition-colors shadow-sm dark:shadow-none" />
                  </div>
                </div>

                <div className="bg-white dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none transition-colors">
                  <label className="block text-xs font-bold text-pink-500 dark:text-pink-400 mb-3 uppercase tracking-widest transition-colors"><i className="fa-solid fa-wallet mr-1"></i> টাকাটা কে দিয়েছে?</label>
                  <div className="flex gap-2 flex-wrap mb-4">
                    <label className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold border transition-all ${expenseForm.paymentMethod === 'group' ? 'bg-pink-100 dark:bg-pink-500/20 border-pink-300 dark:border-pink-500 text-pink-600 dark:text-pink-400' : 'bg-gray-50 dark:bg-black/50 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400'}`}>
                      <input type="radio" name="payMethod" className="hidden" checked={expenseForm.paymentMethod === 'group'} onChange={() => setExpenseForm({...expenseForm, paymentMethod: 'group'})} />
                      গ্রুপ ফান্ড
                    </label>
                    <label className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold border transition-all ${expenseForm.paymentMethod === 'single' ? 'bg-pink-100 dark:bg-pink-500/20 border-pink-300 dark:border-pink-500 text-pink-600 dark:text-pink-400' : 'bg-gray-50 dark:bg-black/50 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400'}`}>
                      <input type="radio" name="payMethod" className="hidden" checked={expenseForm.paymentMethod === 'single'} onChange={() => setExpenseForm({...expenseForm, paymentMethod: 'single', singlePayerId: members[0]?.id || ""})} />
                      একজন মেম্বার
                    </label>
                    <label className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold border transition-all ${expenseForm.paymentMethod === 'multiple' ? 'bg-pink-100 dark:bg-pink-500/20 border-pink-300 dark:border-pink-500 text-pink-600 dark:text-pink-400' : 'bg-gray-50 dark:bg-black/50 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400'}`}>
                      <input type="radio" name="payMethod" className="hidden" checked={expenseForm.paymentMethod === 'multiple'} onChange={() => setExpenseForm({...expenseForm, paymentMethod: 'multiple', multiPayers: {}})} />
                      একাধিক মেম্বার (Custom)
                    </label>
                  </div>

                  {expenseForm.paymentMethod === 'single' && (
                    <select value={expenseForm.singlePayerId} onChange={e => setExpenseForm({...expenseForm, singlePayerId: e.target.value})} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-800 dark:text-white focus:border-pink-500 outline-none mt-2 transition-colors">
                      <option value="">-- মেম্বার সিলেক্ট করুন --</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name} নিজের পকেট থেকে দিয়েছে</option>)}
                    </select>
                  )}

                  {expenseForm.paymentMethod === 'multiple' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                      {members.map(m => (
                        <div key={m.id} className="bg-gray-50 dark:bg-black/40 p-2 rounded-lg border border-gray-200 dark:border-white/5 transition-colors">
                          <span className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1 truncate transition-colors">{m.name}</span>
                          <input 
                            type="number" 
                            placeholder="৳ 0"
                            value={expenseForm.multiPayers[m.id] || ""} 
                            onChange={(e) => setExpenseForm({
                              ...expenseForm, 
                              multiPayers: {...expenseForm.multiPayers, [m.id]: e.target.value}
                            })}
                            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-2 py-1 text-xs text-gray-800 dark:text-white focus:border-pink-500 outline-none transition-colors shadow-inner dark:shadow-none" 
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 transition-colors">এই খরচটি কাদের জন্য প্রযোজ্য? (Sub-group)</label>
                    <button type="button" onClick={() => setExpenseForm({...expenseForm, consumers: expenseForm.consumers.length === members.length ? [] : members.map(m=>m.id)})} className="text-[10px] text-pink-600 dark:text-pink-400 hover:text-pink-500 dark:hover:text-pink-300 font-bold bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-transparent px-2 py-1 rounded transition-colors">
                      {expenseForm.consumers.length === members.length ? 'সবাইকে আনসিলেক্ট করুন' : 'সবাইকে সিলেক্ট করুন'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {members.map(m => {
                      const isSelected = expenseForm.consumers.includes(m.id);
                      return (
                        <button 
                          key={m.id} type="button"
                          onClick={() => {
                            const newConsumers = isSelected ? expenseForm.consumers.filter(id => id !== m.id) : [...expenseForm.consumers, m.id];
                            setExpenseForm({...expenseForm, consumers: newConsumers});
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm dark:shadow-none ${isSelected ? 'bg-pink-100 dark:bg-pink-500/20 border-pink-400 dark:border-pink-500 text-pink-600 dark:text-pink-400' : 'bg-gray-50 dark:bg-black/50 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
                        >
                          {m.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button type="submit" className="w-full bg-pink-600 hover:bg-pink-500 text-white py-3.5 rounded-xl font-bold uppercase tracking-widest transition-all mt-4 shadow-md hover:-translate-y-0.5">
                  <i className="fa-solid fa-check mr-2"></i> খরচ যুক্ত করুন
                </button>
              </form>

              {/* Expense List */}
              <div className="space-y-3">
                {expenses.length === 0 ? <p className="text-center text-gray-500 py-4 text-sm transition-colors">কোনো খরচের হিসাব নেই।</p> : null}
                {expenses.map((exp, i) => {
                  let payerName = "";
                  if (exp.paymentMethod === 'group') payerName = "গ্রুপ ফান্ড";
                  else if (exp.paymentMethod === 'single') payerName = members.find(m => m.id === exp.singlePayerId)?.name || 'Unknown';
                  else payerName = "একাধিক মেম্বার";

                  return (
                    <div key={exp.id} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-xl flex justify-between items-center gap-3 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors relative group overflow-hidden shadow-sm dark:shadow-none">
                      {exp.paymentMethod === 'multiple' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-400 dark:bg-purple-500"></div>}
                      <div className="pl-2">
                        <p className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm sm:text-base transition-colors">
                          <span className="bg-white dark:bg-white/10 border border-gray-200 dark:border-transparent text-[10px] px-2 py-0.5 rounded-md text-gray-500 dark:text-gray-400 shadow-sm dark:shadow-none">{expenses.length - i}</span> {exp.desc}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">
                          পেমেন্ট: <span className="text-blue-500 dark:text-blue-400 font-bold">{payerName}</span> • ভোগকারী: {exp.consumers.length === members.length ? 'সকলে' : `${exp.consumers.length} জন`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base sm:text-lg font-black text-pink-500 dark:text-pink-400 transition-colors">৳{exp.amount.toFixed(0)}</p>
                        <button onClick={() => handleRemoveExpense(exp.id)} className="text-[10px] text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 font-bold mt-1 uppercase transition-colors"><i className="fa-solid fa-trash mr-1"></i>ডিলিট</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FINAL SETTLEMENT & SLIP GENERATION */}
        {activeTab === "settlement" && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            
            <div ref={receiptRef} className="bg-white dark:bg-gradient-to-b dark:from-[#0a1c13] dark:to-[#050b08] border border-gray-200 dark:border-white/10 rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-soft dark:shadow-2xl transition-colors duration-500">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-5"></div>
              
              <div className="text-center border-b border-dashed border-gray-300 dark:border-white/20 pb-6 mb-6 relative transition-colors">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200 dark:border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-xl transition-colors">
                  <i className="fa-solid fa-receipt"></i>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-widest uppercase mb-1 transition-colors">CAS Final Slip</h2>
                <h3 className="text-base sm:text-lg text-emerald-600 dark:text-emerald-400 font-bold mb-2 transition-colors">{eventData.name || 'Unnamed Event'}</h3>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 transition-colors">{eventData.date ? `তারিখ: ${eventData.date}` : `জেনারেট করা হয়েছে: ${new Date().toLocaleDateString('en-GB')}`}</p>
              </div>

              <div className="flex justify-between items-center bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10 mb-8 relative transition-colors shadow-inner dark:shadow-none">
                <div className="text-center w-1/2 border-r border-gray-200 dark:border-white/10 transition-colors">
                  <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 transition-colors">মোট সংগ্রহ</p>
                  <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 transition-colors">৳{totalCollected.toFixed(0)}</p>
                </div>
                <div className="text-center w-1/2">
                  <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 transition-colors">মোট খরচ</p>
                  <p className="text-xl sm:text-2xl font-black text-pink-600 dark:text-pink-400 transition-colors">৳{totalExpense.toFixed(0)}</p>
                </div>
              </div>

              <div className="space-y-3 relative">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mb-4 transition-colors">ব্যক্তিগত হিসাব নিকাশ:</p>
                {Object.keys(settlementData).map(id => {
                  const data = settlementData[id];
                  const net = data.net;
                  return (
                    <div key={id} className="bg-white dark:bg-black/40 p-3 sm:p-4 rounded-xl flex justify-between items-center border border-gray-100 dark:border-transparent border-l-4 shadow-sm dark:shadow-none transition-colors" style={{borderLeftColor: net > 1 ? '#10b981' : (net < -1 ? '#ef4444' : '#6b7280')}}>
                      <div>
                        <p className="font-bold text-gray-800 dark:text-white text-sm transition-colors">{data.name}</p>
                        <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 mt-1 transition-colors">জমা/পকেট থেকে: ৳{data.paid.toFixed(0)} | খরচ হয়েছে: ৳{data.consumed.toFixed(0)}</p>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        {net > 1 ? (
                          <div className="bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/20 transition-colors">
                            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-0.5 transition-colors">গ্রুপের কাছে পাবে</p>
                            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 transition-colors">৳{net.toFixed(0)}</p>
                          </div>
                        ) : net < -1 ? (
                          <div className="bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/20 transition-colors">
                            <p className="text-[9px] text-red-600 dark:text-red-400 uppercase tracking-widest mb-0.5 transition-colors">গ্রুপকে আরও দেবে</p>
                            <p className="text-sm font-black text-red-600 dark:text-red-500 transition-colors">৳{Math.abs(net).toFixed(0)}</p>
                          </div>
                        ) : (
                          <div className="px-3 py-1.5">
                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors"><i className="fa-solid fa-check-circle mr-1"></i>ক্লিয়ার</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-center mt-12 pt-6 border-t border-gray-200 dark:border-white/10 opacity-70 transition-colors">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest transition-colors">Calculated by CUET Adventure Society</p>
                <p className="text-[8px] text-gray-400 dark:text-gray-600 mt-1 transition-colors">www.cuetas.com</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={downloadReceipt} disabled={isGenerating}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-md hover:-translate-y-1 flex justify-center items-center gap-2"
              >
                {isGenerating ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-download"></i>}
                {isGenerating ? "স্লিপ তৈরি হচ্ছে..." : "এইচডি স্লিপ ডাউনলোড"}
              </button>
              
              <button 
                onClick={resetCalculator}
                className="bg-red-50 dark:bg-red-900/50 hover:bg-red-100 dark:hover:bg-red-900 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-400 px-6 py-4 rounded-xl font-bold transition-all text-xs uppercase shadow-sm dark:shadow-lg"
              >
                <i className="fa-solid fa-power-off mr-2"></i>নতুন হিসাব শুরু
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
