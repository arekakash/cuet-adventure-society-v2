"use client";

import React, { useState, useEffect } from 'react';

export default function EventCalculator() {
  const [activeTab, setActiveTab] = useState('ledger');
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [newMemberName, setNewMemberName] = useState('');
  
  // Expense Form States
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPayer, setExpPayer] = useState('fund');
  const [expSplitAmong, setExpSplitAmong] = useState([]);

  // Load data from Local Storage on mount
  useEffect(() => {
    const savedMembers = localStorage.getItem('cas_members');
    const savedExpenses = localStorage.getItem('cas_expenses');
    if (savedMembers) setMembers(JSON.parse(savedMembers));
    if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
  }, []);

  // Save data to Local Storage whenever it changes
  useEffect(() => {
    localStorage.setItem('cas_members', JSON.stringify(members));
    localStorage.setItem('cas_expenses', JSON.stringify(expenses));
  }, [members, expenses]);

  // --- Member Actions ---
  const addMember = (e) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    const newMember = { id: Date.now().toString(), name: newMemberName.trim(), deposit: 0 };
    setMembers([...members, newMember]);
    setNewMemberName('');
  };

  const addDeposit = (id, amount) => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    setMembers(members.map(m => m.id === id ? { ...m, deposit: m.deposit + val } : m));
  };

  const deleteMember = (id) => {
    setMembers(members.filter(m => m.id !== id));
    // Remove member from any existing expense splits
    setExpenses(expenses.map(e => ({
      ...e,
      splitAmong: e.splitAmong.filter(mId => mId !== id)
    })));
  };

  // --- Expense Actions ---
  const handleSelectAllSplit = () => {
    if (expSplitAmong.length === members.length) {
      setExpSplitAmong([]);
    } else {
      setExpSplitAmong(members.map(m => m.id));
    }
  };

  const toggleSplitMember = (id) => {
    if (expSplitAmong.includes(id)) {
      setExpSplitAmong(expSplitAmong.filter(mId => mId !== id));
    } else {
      setExpSplitAmong([...expSplitAmong, id]);
    }
  };

  const addExpense = (e) => {
    e.preventDefault();
    if (!expTitle || !expAmount || expSplitAmong.length === 0) return;
    const newExpense = {
      id: Date.now().toString(),
      title: expTitle,
      amount: parseFloat(expAmount),
      payer: expPayer,
      splitAmong: expSplitAmong
    };
    setExpenses([...expenses, newExpense]);
    setExpTitle('');
    setExpAmount('');
    setExpPayer('fund');
    setExpSplitAmong(members.map(m => m.id)); // Reset to all
  };

  const deleteExpense = (id) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  // --- Calculations for Settlement ---
  const totalFundCollected = members.reduce((sum, m) => sum + m.deposit, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const fundExpenses = expenses.filter(e => e.payer === 'fund').reduce((sum, e) => sum + e.amount, 0);
  const remainingFund = totalFundCollected - fundExpenses;

  // Calculate individual balances
  const calculatedMembers = members.map(m => {
    let pocketPaid = 0;
    let share = 0;
    
    expenses.forEach(e => {
      // If member paid out of pocket
      if (e.payer === m.id) pocketPaid += e.amount;
      // If member is in the split group
      if (e.splitAmong.includes(m.id)) {
        share += (e.amount / e.splitAmong.length);
      }
    });

    const totalPaid = m.deposit + pocketPaid;
    const balance = totalPaid - share; // Positive means gets back, Negative means owes

    return { ...m, pocketPaid, share, totalPaid, balance };
  });

  return (
    <div className="min-h-screen bg-darkForest text-mistPanel p-4 md:p-8 pt-24 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-trail to-campfire">
            <i className="fa-solid fa-calculator mr-3"></i>CAS Event Calculator
          </h1>
          <p className="text-sm text-gray-400">স্মার্ট ট্রিপ, জিরো হিসাবের প্যারা</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-2 md:gap-4 border-b border-white/10 pb-4">
          <button 
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'ledger' ? 'bg-trail text-white shadow-glow' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}
          >
            <i className="fa-solid fa-users mr-2"></i> লেজার (জমা)
          </button>
          <button 
            onClick={() => { setActiveTab('expense'); setExpSplitAmong(members.map(m => m.id)); }}
            className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'expense' ? 'bg-campfire text-white shadow-glow' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}
          >
            <i className="fa-solid fa-receipt mr-2"></i> খরচ (লগ)
          </button>
          <button 
            onClick={() => setActiveTab('settlement')}
            className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'settlement' ? 'bg-purple-600 text-white shadow-glow' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}
          >
            <i className="fa-solid fa-scale-balanced mr-2"></i> সেটেলমেন্ট
          </button>
        </div>

        {/* --- TAB 1: LEDGER --- */}
        {activeTab === 'ledger' && (
          <div className="glass-panel p-6 rounded-2xl space-y-6 animate-fade-in">
            <form onSubmit={addMember} className="flex gap-4">
              <input 
                type="text" 
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="নতুন মেম্বারের নাম..." 
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-trail"
              />
              <button type="submit" className="bg-trail hover:bg-green-600 text-white px-6 py-2 rounded-xl transition-colors font-medium">
                অ্যাড করুন
              </button>
            </form>

            <div className="space-y-3">
              {members.length === 0 ? (
                <p className="text-center text-gray-500 py-8">এখনো কোনো মেম্বার অ্যাড করা হয়নি।</p>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="flex flex-col md:flex-row md:items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-moss rounded-full flex items-center justify-center text-trail font-bold text-lg">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">{member.name}</h3>
                        <p className="text-sm text-gray-400">মোট জমা: <span className="text-trail font-bold">{member.deposit} ৳</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        id={`deposit-${member.id}`}
                        placeholder="অ্যামাউন্ট" 
                        className="w-28 bg-darkForest border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-trail"
                      />
                      <button 
                        onClick={() => {
                          const input = document.getElementById(`deposit-${member.id}`);
                          addDeposit(member.id, input.value);
                          input.value = '';
                        }}
                        className="bg-white/10 hover:bg-trail text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                      >
                        জমা নিন
                      </button>
                      <button onClick={() => deleteMember(member.id)} className="text-red-400 hover:text-red-300 ml-2">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="text-right text-sm text-gray-400 border-t border-white/10 pt-4">
              মোট ফান্ড কালেকশন: <span className="text-xl text-white font-bold">{totalFundCollected} ৳</span>
            </div>
          </div>
        )}

        {/* --- TAB 2: EXPENSES --- */}
        {activeTab === 'expense' && (
          <div className="space-y-6 animate-fade-in">
            <form onSubmit={addExpense} className="glass-panel p-6 rounded-2xl space-y-5">
              <h2 className="text-xl font-bold text-campfire mb-4">নতুন খরচ এন্ট্রি</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" required value={expTitle} onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="খরচের বিবরণ (যেমন: জিপ ভাড়া)" 
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-campfire text-white"
                />
                <input 
                  type="number" required value={expAmount} onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="অ্যামাউন্ট ৳" 
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-campfire text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">কে টাকা দিয়েছে?</label>
                <select 
                  value={expPayer} onChange={(e) => setExpPayer(e.target.value)}
                  className="w-full bg-darkForest border border-white/10 rounded-xl px-4 py-2 focus:border-campfire text-white"
                >
                  <option value="fund">গ্রুপ ফান্ড থেকে (Group Fund)</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} এর পকেট থেকে</option>
                  ))}
                </select>
              </div>

              {/* Sub-Group Tagging Logic */}
              <div className="bg-darkForest p-4 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm text-gray-400">এই খরচটি কাদের জন্য প্রযোজ্য?</label>
                  <button type="button" onClick={handleSelectAllSplit} className="text-xs text-trail hover:text-white">
                    {expSplitAmong.length === members.length ? 'সবাইকে আনসিলেক্ট করুন' : 'সবাইকে সিলেক্ট করুন'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {members.map(m => (
                    <label key={m.id} className={`cursor-pointer px-3 py-1.5 rounded-lg border text-sm transition-all ${expSplitAmong.includes(m.id) ? 'bg-trail/20 border-trail text-white' : 'border-white/10 text-gray-500 hover:border-white/30'}`}>
                      <input type="checkbox" className="hidden" checked={expSplitAmong.includes(m.id)} onChange={() => toggleSplitMember(m.id)} />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full bg-campfire hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-all">
                খরচ যুক্ত করুন
              </button>
            </form>

            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-lg font-bold mb-4">খরচের লিস্ট</h3>
              <div className="space-y-3">
                {expenses.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">কোনো খরচের হিসাব নেই।</p>
                ) : (
                  expenses.map(e => {
                    const payerName = e.payer === 'fund' ? 'গ্রুপ ফান্ড' : members.find(m=>m.id === e.payer)?.name || 'Unknown';
                    const isForAll = e.splitAmong.length === members.length;
                    return (
                      <div key={e.id} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border-l-4 border-campfire">
                        <div>
                          <h4 className="font-medium text-white">{e.title} <span className="text-xs ml-2 bg-white/10 px-2 py-0.5 rounded-full text-gray-300">{isForAll ? 'সবার জন্য' : `${e.splitAmong.length} জনের জন্য`}</span></h4>
                          <p className="text-sm text-gray-400 mt-1">প্রদানকারী: <span className="text-orange-300">{payerName}</span></p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-lg">{e.amount} ৳</span>
                          <button onClick={() => deleteExpense(e.id)} className="text-red-400 hover:text-red-300 p-2">
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 3: SETTLEMENT --- */}
        {activeTab === 'settlement' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-panel p-5 rounded-2xl text-center border-t-4 border-trail">
                <p className="text-sm text-gray-400 mb-1">মোট ফান্ড সংগ্রহ</p>
                <p className="text-2xl font-bold text-white">{totalFundCollected} ৳</p>
              </div>
              <div className="glass-panel p-5 rounded-2xl text-center border-t-4 border-campfire">
                <p className="text-sm text-gray-400 mb-1">সর্বমোট খরচ</p>
                <p className="text-2xl font-bold text-white">{totalExpense} ৳</p>
              </div>
              <div className={`glass-panel p-5 rounded-2xl text-center border-t-4 ${remainingFund >= 0 ? 'border-blue-500' : 'border-red-500'}`}>
                <p className="text-sm text-gray-400 mb-1">ফান্ডে অবশিষ্ট আছে</p>
                <p className={`text-2xl font-bold ${remainingFund >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{remainingFund} ৳</p>
                {remainingFund < 0 && <p className="text-xs text-red-400 mt-1">ফান্ড শর্টেজ!</p>}
              </div>
            </div>

            {/* Individual Statements */}
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">ফাইনাল হিসাব (কে কত পাবে/দেবে)</h3>
              
              <div className="space-y-4">
                {calculatedMembers.map(m => (
                  <div key={m.id} className="bg-moss/50 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="w-full md:w-1/3">
                      <h4 className="text-lg font-bold text-white">{m.name}</h4>
                      <p className="text-xs text-gray-400 mt-1">টোটাল জমা: {m.deposit} ৳ {m.pocketPaid > 0 && `(+ পকেট থেকে ${m.pocketPaid} ৳)`}</p>
                    </div>
                    
                    <div className="w-full md:w-1/3 text-center bg-darkForest py-2 rounded-lg border border-white/5">
                      <p className="text-xs text-gray-500">তার আসল খরচ</p>
                      <p className="font-bold text-gray-200">{m.share.toFixed(2)} ৳</p>
                    </div>

                    <div className="w-full md:w-1/3 text-right">
                      {m.balance > 0 ? (
                         <div className="text-trail">
                           <p className="text-xs">ফান্ড থেকে ফেরত পাবে</p>
                           <p className="font-bold text-xl">+{m.balance.toFixed(2)} ৳</p>
                         </div>
                      ) : m.balance < 0 ? (
                         <div className="text-campfire">
                           <p className="text-xs">ফান্ডে আরও দিতে হবে</p>
                           <p className="font-bold text-xl">{m.balance.toFixed(2)} ৳</p>
                         </div>
                      ) : (
                         <div className="text-gray-400">
                           <p className="text-xs">হিসাব ক্লিয়ার</p>
                           <p className="font-bold text-xl">0 ৳</p>
                         </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
