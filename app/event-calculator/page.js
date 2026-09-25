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

  // Settlement Algorithm (Updated for Multi-Payers)
  const calculateSettlement = () => {
    let balances = {}; // { memberId: netBalance } (+ means group owes them, - means they owe group)
    members.forEach(m => {
      balances[m.id] = { name: m.name, paid: m.deposit, consumed: 0, net: 0 };
    });

    expenses.forEach(exp => {
      // 1. Consumers cost deduction
      const perHead = exp.amount / exp.consumers.length;
      exp.consumers.forEach(cId => {
        if (balances[cId]) balances[cId].consumed += perHead;
      });

      // 2. Addition to paid amount based on payer type
      if (exp.paymentMethod === 'single' && balances[exp.singlePayerId]) {
        balances[exp.singlePayerId].paid += exp.amount;
      } else if (exp.paymentMethod === 'multiple') {
        Object.entries(exp.multiPayers).forEach(([pId, amtStr]) => {
           const amt = parseFloat(amtStr) || 0;
           if (balances[pId]) balances[pId].paid += amt;
        });
      }
    });

    // Calculate Net Balance
    Object.keys(balances).forEach(id => {
      balances[id].net = balances[id].paid - balances[id].consumed;
    });

    return balances;
  };

  const settlementData = calculateSettlement();

  // --- Generate High-Res Image (Zero Storage) ---
  const downloadReceipt = async () => {
    setIsGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const element = receiptRef.current;
      const canvas = await html2canvas(element, { 
        scale: 3, 
        backgroundColor: '#0a1c13',
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
    <div className="min-h-screen bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 relative text-gray-300 overflow-x-hidden">
      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-8" data-aos="fade-down">
          <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 tracking-tight">
            ইভেন্ট <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">ক্যালকুলেটর</span>
          </h1>
          <p className="text-sm text-gray-400">ট্যুরের যাবতীয় হিসাব-নিকাশের ম্যাজিক সমাধান</p>
        </div>

        {/* Tab Navigation */}
        {activeTab !== "setup" && (
          <div className="flex flex-wrap justify-center gap-2 bg-white/5 p-2 rounded-2xl mb-6 border border-white/10">
            <button onClick={() => setActiveTab("members")} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'members' ? 'bg-purple-500 text-white shadow-glow' : 'hover:bg-white/10'}`}><i className="fa-solid fa-users mr-2"></i>মেম্বার ও ফান্ড</button>
            <button onClick={() => { setActiveTab("expenses"); setExpenseForm(p => ({...p, consumers: members.map(m=>m.id)})); }} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'expenses' ? 'bg-pink-500 text-white shadow-glow' : 'hover:bg-white/10'}`}><i className="fa-solid fa-money-bill-wave mr-2"></i>খরচের খাতা</button>
            <button onClick={() => setActiveTab("settlement")} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'settlement' ? 'bg-emerald-500 text-white shadow-glow' : 'hover:bg-white/10'}`}><i className="fa-solid fa-check-double mr-2"></i>ফাইনাল সেটেলমেন্ট</button>
          </div>
        )}

        {/* TAB 1: SETUP */}
        {activeTab === "setup" && (
          <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-8 max-w-md mx-auto shadow-2xl" data-aos="zoom-in">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-500/40 text-purple-400 text-2xl">
              <i className="fa-solid fa-compass"></i>
            </div>
            <h2 className="text-2xl font-black text-white text-center mb-6">নতুন ইভেন্ট শুরু করুন</h2>
            <form onSubmit={handleStartEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">ইভেন্টের নাম *</label>
                <input required type="text" value={eventData.name} onChange={e => setEventData({...eventData, name: e.target.value})} placeholder="e.g. Sajek Tour 2026" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">তারিখ</label>
                <input type="date" value={eventData.date} onChange={e => setEventData({...eventData, date: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none [color-scheme:dark]" />
              </div>
              <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3.5 rounded-xl font-black tracking-widest mt-4 transition-colors">হিসাব শুরু করুন <i className="fa-solid fa-arrow-right ml-2"></i></button>
            </form>
          </div>
        )}

        {/* TAB 2: MEMBERS & FUND */}
        {activeTab === "members" && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-900/10 border border-emerald-500/30 p-5 rounded-2xl text-center">
                <p className="text-xs text-emerald-400 font-bold mb-1">মোট ফান্ড কালেকশন</p>
                <p className="text-3xl font-black text-white">৳{totalCollected.toFixed(0)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-900/40 to-purple-900/10 border border-purple-500/30 p-5 rounded-2xl text-center">
                <p className="text-xs text-purple-400 font-bold mb-1">মেম্বার সংখ্যা</p>
                <p className="text-3xl font-black text-white">{members.length} জন</p>
              </div>
            </div>

            <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-black text-white mb-4 border-b border-white/5 pb-3">মেম্বার যুক্ত করুন</h3>
              <form onSubmit={handleAddMember} className="flex gap-2 mb-6">
                <input type="text" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="মেম্বারের নাম লিখুন..." className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none" />
                <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-6 rounded-xl font-bold transition-colors"><i className="fa-solid fa-plus"></i></button>
              </form>

              <div className="space-y-3">
                {members.length === 0 ? <p className="text-center text-gray-500 py-4 text-sm">কোনো মেম্বার যুক্ত করা হয়নি।</p> : null}
                {members.map(member => (
                  <div key={member.id} className="bg-white/5 border border-white/10 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/10 transition-colors">
                    <span className="font-bold text-white pl-2">{member.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-400">৳</span>
                        <input type="number" value={member.deposit || ''} onChange={(e) => handleUpdateDeposit(member.id, e.target.value)} placeholder="0" className="w-32 bg-black/50 border border-white/10 rounded-lg pl-7 pr-3 py-2 text-emerald-400 font-bold focus:border-emerald-500 outline-none" />
                      </div>
                      <button onClick={() => handleRemoveMember(member.id)} className="bg-red-500/10 text-red-400 hover:bg-red-500/30 p-2 rounded-lg transition-colors"><i className="fa-solid fa-trash"></i></button>
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
            <div className="bg-gradient-to-br from-pink-900/40 to-pink-900/10 border border-pink-500/30 p-5 rounded-2xl text-center flex justify-between items-center">
              <div>
                <p className="text-xs text-pink-400 font-bold mb-1">মোট খরচ</p>
                <p className="text-3xl font-black text-white text-left">৳{totalExpense.toFixed(0)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 font-bold mb-1">গ্রুপ ফান্ডের ব্যালেন্স</p>
                <p className={`text-xl font-black ${groupFundBalance < 0 ? 'text-red-500' : 'text-emerald-400'}`}>৳{groupFundBalance.toFixed(0)}</p>
              </div>
            </div>

            <div className="bg-[#0a1c13] border border-white/10 rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-black text-white mb-4 border-b border-white/5 pb-3">খরচের এন্ট্রি করুন</h3>
              <form onSubmit={handleAddExpense} className="space-y-4 mb-8 bg-black/30 p-5 rounded-2xl border border-white/5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">কীসে খরচ হলো? *</label>
                    <input type="text" value={expenseForm.desc} onChange={e => setExpenseForm({...expenseForm, desc: e.target.value})} placeholder="যেমন: বাসের ভাড়া, খাবার" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-pink-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">টাকার পরিমাণ (৳) *</label>
                    <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} placeholder="0" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-pink-500 outline-none font-bold" />
                  </div>
                </div>

                {/* 🔴 Who Paid Section (UPDATED FOR MULTIPLE PAYERS) */}
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <label className="block text-xs font-bold text-pink-400 mb-3 uppercase tracking-widest"><i className="fa-solid fa-wallet mr-1"></i> টাকাটা কে দিয়েছে?</label>
                  <div className="flex gap-2 flex-wrap mb-4">
                    <label className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold border transition-all ${expenseForm.paymentMethod === 'group' ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-black/50 border-white/10 text-gray-400'}`}>
                      <input type="radio" name="payMethod" className="hidden" checked={expenseForm.paymentMethod === 'group'} onChange={() => setExpenseForm({...expenseForm, paymentMethod: 'group'})} />
                      গ্রুপ ফান্ড
                    </label>
                    <label className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold border transition-all ${expenseForm.paymentMethod === 'single' ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-black/50 border-white/10 text-gray-400'}`}>
                      <input type="radio" name="payMethod" className="hidden" checked={expenseForm.paymentMethod === 'single'} onChange={() => setExpenseForm({...expenseForm, paymentMethod: 'single', singlePayerId: members[0]?.id || ""})} />
                      একজন মেম্বার
                    </label>
                    <label className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold border transition-all ${expenseForm.paymentMethod === 'multiple' ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-black/50 border-white/10 text-gray-400'}`}>
                      <input type="radio" name="payMethod" className="hidden" checked={expenseForm.paymentMethod === 'multiple'} onChange={() => setExpenseForm({...expenseForm, paymentMethod: 'multiple', multiPayers: {}})} />
                      একাধিক মেম্বার (Custom)
                    </label>
                  </div>

                  {/* Single Payer Dropdown */}
                  {expenseForm.paymentMethod === 'single' && (
                    <select value={expenseForm.singlePayerId} onChange={e => setExpenseForm({...expenseForm, singlePayerId: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-pink-500 outline-none mt-2">
                      <option value="">-- মেম্বার সিলেক্ট করুন --</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name} নিজের পকেট থেকে দিয়েছে</option>)}
                    </select>
                  )}

                  {/* Multiple Payers Input Grid */}
                  {expenseForm.paymentMethod === 'multiple' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                      {members.map(m => (
                        <div key={m.id} className="bg-black/40 p-2 rounded-lg border border-white/5">
                          <span className="block text-[10px] text-gray-400 mb-1 truncate">{m.name}</span>
                          <input 
                            type="number" 
                            placeholder="৳ 0"
                            value={expenseForm.multiPayers[m.id] || ""} 
                            onChange={(e) => setExpenseForm({
                              ...expenseForm, 
                              multiPayers: {...expenseForm.multiPayers, [m.id]: e.target.value}
                            })}
                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-pink-500 outline-none" 
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sub-group Checkboxes */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-gray-400">এই খরচটি কাদের জন্য প্রযোজ্য? (Sub-group)</label>
                    <button type="button" onClick={() => setExpenseForm({...expenseForm, consumers: expenseForm.consumers.length === members.length ? [] : members.map(m=>m.id)})} className="text-[10px] text-pink-400 hover:text-pink-300 font-bold bg-pink-500/10 px-2 py-1 rounded">
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
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isSelected ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-black/50 border-white/10 text-gray-500 hover:text-gray-300'}`}
                        >
                          {m.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button type="submit" className="w-full bg-pink-600 hover:bg-pink-500 text-white py-3.5 rounded-xl font-bold uppercase tracking-widest transition-colors mt-4 shadow-glow">
                  <i className="fa-solid fa-check mr-2"></i> খরচ যুক্ত করুন
                </button>
              </form>

              {/* Expense List */}
              <div className="space-y-3">
                {expenses.length === 0 ? <p className="text-center text-gray-500 py-4 text-sm">কোনো খরচের হিসাব নেই।</p> : null}
                {expenses.map((exp, i) => {
                  let payerName = "";
                  if (exp.paymentMethod === 'group') payerName = "গ্রুপ ফান্ড";
                  else if (exp.paymentMethod === 'single') payerName = members.find(m => m.id === exp.singlePayerId)?.name || 'Unknown';
                  else payerName = "একাধিক মেম্বার";

                  return (
                    <div key={exp.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center gap-3 hover:bg-white/10 transition-colors relative group overflow-hidden">
                      {exp.paymentMethod === 'multiple' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>}
                      <div className="pl-2">
                        <p className="font-bold text-white flex items-center gap-2 text-sm sm:text-base">
                          <span className="bg-white/10 text-[10px] px-2 py-0.5 rounded-md text-gray-400">#{expenses.length - i}</span> {exp.desc}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                          পেমেন্ট: <span className="text-blue-400 font-bold">{payerName}</span> • ভোগকারী: {exp.consumers.length === members.length ? 'সকলে' : `${exp.consumers.length} জন`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base sm:text-lg font-black text-pink-400">৳{exp.amount.toFixed(0)}</p>
                        <button onClick={() => handleRemoveExpense(exp.id)} className="text-[10px] text-red-400 hover:text-red-300 font-bold mt-1 uppercase transition-colors"><i className="fa-solid fa-trash mr-1"></i>ডিলিট</button>
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
            
            {/* The Hidden/Visible Canvas Area for Slip Generation */}
            <div ref={receiptRef} className="bg-gradient-to-b from-[#0a1c13] to-[#050b08] border border-white/10 rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
              
              {/* Slip Header */}
              <div className="text-center border-b border-dashed border-white/20 pb-6 mb-6 relative">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/30 text-emerald-400 text-xl">
                  <i className="fa-solid fa-receipt"></i>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-widest uppercase mb-1">CAS Final Slip</h2>
                <h3 className="text-base sm:text-lg text-emerald-400 font-bold mb-2">{eventData.name || 'Unnamed Event'}</h3>
                <p className="text-[10px] sm:text-xs text-gray-400">{eventData.date ? `তারিখ: ${eventData.date}` : `জেনারেট করা হয়েছে: ${new Date().toLocaleDateString('en-GB')}`}</p>
              </div>

              {/* Core Stats */}
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10 mb-8 relative">
                <div className="text-center w-1/2 border-r border-white/10">
                  <p className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-widest mb-1">মোট সংগ্রহ</p>
                  <p className="text-xl sm:text-2xl font-black text-emerald-400">৳{totalCollected.toFixed(0)}</p>
                </div>
                <div className="text-center w-1/2">
                  <p className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-widest mb-1">মোট খরচ</p>
                  <p className="text-xl sm:text-2xl font-black text-pink-400">৳{totalExpense.toFixed(0)}</p>
                </div>
              </div>

              {/* Settlement Breakdowns */}
              <div className="space-y-3 relative">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-4">ব্যক্তিগত হিসাব নিকাশ:</p>
                {Object.keys(settlementData).map(id => {
                  const data = settlementData[id];
                  const net = data.net;
                  return (
                    <div key={id} className="bg-black/40 p-3 sm:p-4 rounded-xl flex justify-between items-center border-l-4 shadow-sm" style={{borderColor: net > 1 ? '#10b981' : (net < -1 ? '#ef4444' : '#6b7280')}}>
                      <div>
                        <p className="font-bold text-white text-sm">{data.name}</p>
                        <p className="text-[9px] sm:text-[10px] text-gray-400 mt-1">জমা/পকেট থেকে: ৳{data.paid.toFixed(0)} | খরচ হয়েছে: ৳{data.consumed.toFixed(0)}</p>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        {net > 1 ? (
                          <div className="bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                            <p className="text-[9px] text-emerald-400 uppercase tracking-widest mb-0.5">গ্রুপের কাছে পাবে</p>
                            <p className="text-sm font-black text-emerald-400">৳{net.toFixed(0)}</p>
                          </div>
                        ) : net < -1 ? (
                          <div className="bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
                            <p className="text-[9px] text-red-400 uppercase tracking-widest mb-0.5">গ্রুপকে আরও দেবে</p>
                            <p className="text-sm font-black text-red-500">৳{Math.abs(net).toFixed(0)}</p>
                          </div>
                        ) : (
                          <div className="px-3 py-1.5">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest"><i className="fa-solid fa-check-circle mr-1"></i>ক্লিয়ার</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Watermark/Footer */}
              <div className="text-center mt-12 pt-6 border-t border-white/10 opacity-70">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Calculated by CUET Adventure Society</p>
                <p className="text-[8px] text-gray-600 mt-1">www.cuetas.com</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={downloadReceipt} disabled={isGenerating}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] flex justify-center items-center gap-2"
              >
                {isGenerating ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-download"></i>}
                {isGenerating ? "স্লিপ তৈরি হচ্ছে..." : "এইচডি স্লিপ ডাউনলোড"}
              </button>
              
              <button 
                onClick={resetCalculator}
                className="bg-red-900/50 hover:bg-red-900 border border-red-500/50 text-red-400 px-6 py-4 rounded-xl font-bold transition-all text-xs uppercase shadow-lg"
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
