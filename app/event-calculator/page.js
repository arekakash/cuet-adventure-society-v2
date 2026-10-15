"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

// --- Mathematical Helpers ---
const EPSILON = 0.01;
const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

const formatMoney = (num) => {
  const val = round2(num || 0);
  return Number.isInteger(val) ? val.toString() : val.toFixed(2);
};

export default function EventCalculator() {
  const [isMounted, setIsMounted] = useState(false);
  const receiptRef = useRef(null);
  const expenseFormRef = useRef(null);

  // --- Multi-Event Archive State ---
  const [savedEvents, setSavedEvents] = useState([]);
  const [currentEventId, setCurrentEventId] = useState(null);

  // --- Current Active Event States ---
  const [eventData, setEventData] = useState({ name: "", date: "" });
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // --- UI States ---
  const [activeTab, setActiveTab] = useState("setup"); // setup, members, expenses, settlement
  const [newMemberName, setNewMemberName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  // --- Expense Form State ---
  const [expenseForm, setExpenseForm] = useState({
    desc: "",
    amount: "",
    paymentMethod: "group", // 'group', 'single', 'multiple'
    singlePayerId: "",
    multiPayers: {}, // { memberId: amountStr }
    consumers: [],
  });

  // --- 1. Load & Migrate LocalStorage Data ---
  useEffect(() => {
    AOS.init({ duration: 600, once: true });

    try {
      const savedListRaw = localStorage.getItem("cas_event_calc_list");
      const savedActiveId = localStorage.getItem("cas_event_calc_active_id");
      const legacySingleRaw = localStorage.getItem("cas_event_calc");

      let list = savedListRaw ? JSON.parse(savedListRaw) : [];

      // Legacy Migration: যদি আগের সিঙ্গেল স্টোরেজে ডেটা থাকে, তা লিস্টে মাইগ্রেট হবে
      if (list.length === 0 && legacySingleRaw) {
        const legacy = JSON.parse(legacySingleRaw);
        if (legacy?.eventData?.name || legacy?.members?.length > 0) {
          const migratedId = "evt_" + Date.now().toString();
          const migratedEvent = {
            id: migratedId,
            eventData: legacy.eventData || { name: "Unnamed Event", date: "" },
            members: legacy.members || [],
            expenses: legacy.expenses || [],
            updatedAt: new Date().toISOString(),
          };
          list = [migratedEvent];
          localStorage.setItem("cas_event_calc_list", JSON.stringify(list));
          localStorage.setItem("cas_event_calc_active_id", migratedId);
        }
      }

      setSavedEvents(list);

      if (savedActiveId) {
        const activeEvt = list.find((e) => e.id === savedActiveId);
        if (activeEvt) {
          setCurrentEventId(activeEvt.id);
          setEventData(activeEvt.eventData || { name: "", date: "" });
          setMembers(activeEvt.members || []);
          setExpenses(activeEvt.expenses || []);
          if (activeEvt.eventData?.name) setActiveTab("members");
        }
      } else if (list.length > 0) {
        const latest = list[0];
        setCurrentEventId(latest.id);
        setEventData(latest.eventData || { name: "", date: "" });
        setMembers(latest.members || []);
        setExpenses(latest.expenses || []);
        if (latest.eventData?.name) setActiveTab("members");
      }
    } catch (err) {
      console.error("Failed to load event calculator storage:", err);
    }

    setIsMounted(true);
  }, []);

  // --- 2. Auto-Sync Current Event to Archive List ---
  useEffect(() => {
    if (!isMounted || !currentEventId) return;

    setSavedEvents((prevList) => {
      const updatedEvent = {
        id: currentEventId,
        eventData,
        members,
        expenses,
        updatedAt: new Date().toISOString(),
      };

      const exists = prevList.some((e) => e.id === currentEventId);
      const nextList = exists
        ? prevList.map((e) => (e.id === currentEventId ? updatedEvent : e))
        : [updatedEvent, ...prevList];

      localStorage.setItem("cas_event_calc_list", JSON.stringify(nextList));
      localStorage.setItem("cas_event_calc_active_id", currentEventId);
      // Legacy fallback sync
      localStorage.setItem(
        "cas_event_calc",
        JSON.stringify({ eventData, members, expenses })
      );

      return nextList;
    });
  }, [eventData, members, expenses, currentEventId, isMounted]);

  // --- Event Session Handlers ---
  const handleStartEvent = (e) => {
    e.preventDefault();
    if (!eventData.name.trim()) return alert("ইভেন্টের নাম দিন!");

    if (!currentEventId) {
      const newId = "evt_" + Date.now().toString();
      setCurrentEventId(newId);
    }
    setActiveTab("members");
  };

  const handleLoadSavedEvent = (evt) => {
    setCurrentEventId(evt.id);
    setEventData(evt.eventData || { name: "", date: "" });
    setMembers(evt.members || []);
    setExpenses(evt.expenses || []);
    setEditingExpenseId(null);
    localStorage.setItem("cas_event_calc_active_id", evt.id);
    setActiveTab("members");
  };

  const handleCreateNewEvent = () => {
    setCurrentEventId(null);
    setEventData({ name: "", date: "" });
    setMembers([]);
    setExpenses([]);
    setEditingExpenseId(null);
    localStorage.removeItem("cas_event_calc_active_id");
    setActiveTab("setup");
  };

  const handleDeleteSavedEvent = (id, name) => {
    if (
      window.confirm(
        `"${name || "Unnamed Event"}" এর সম্পূর্ণ হিসাব মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না!`
      )
    ) {
      const updated = savedEvents.filter((e) => e.id !== id);
      setSavedEvents(updated);
      localStorage.setItem("cas_event_calc_list", JSON.stringify(updated));

      if (currentEventId === id) {
        handleCreateNewEvent();
      }
    }
  };

  // --- Member Handlers ---
  const handleAddMember = (e) => {
    e.preventDefault();
    const trimmed = newMemberName.trim();
    if (!trimmed) return;

    if (members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      return alert("এই নামের একজন মেম্বার ইতিমধ্যে যুক্ত আছেন! আলাদা নাম বা ডাকনাম ব্যবহার করুন।");
    }

    const newMember = {
      id: "mem_" + Date.now().toString() + "_" + Math.random().toString(36).slice(2, 6),
      name: trimmed,
      deposit: 0,
    };

    const nextMembers = [...members, newMember];
    setMembers(nextMembers);
    setNewMemberName("");

    // নতুন মেম্বার যুক্ত হলে এবং এডিট মোডে না থাকলে কনজিউমার লিস্টে তাকেও যুক্ত করে নেওয়া
    if (!editingExpenseId) {
      setExpenseForm((prev) => ({
        ...prev,
        consumers: [...prev.consumers, newMember.id],
      }));
    }
  };

  const handleUpdateDeposit = (id, amount) => {
    const parsed = parseFloat(amount);
    const cleanDeposit = !isNaN(parsed) && parsed >= 0 ? round2(parsed) : 0;
    setMembers(
      members.map((m) => (m.id === id ? { ...m, deposit: cleanDeposit } : m))
    );
  };

  // Referential Integrity & Zero-Consumer Prevention
  const handleRemoveMember = (id) => {
    const targetMember = members.find((m) => m.id === id);
    if (!targetMember) return;

    // 1. Check if member is the SOLE consumer in any expense (prevents Divide-by-Zero)
    const soleConsumerExpenses = expenses.filter(
      (exp) => exp.consumers.length === 1 && exp.consumers[0] === id
    );
    if (soleConsumerExpenses.length > 0) {
      const names = soleConsumerExpenses.map((e) => `"${e.desc}"`).join(", ");
      return alert(
        `সতর্কতা: "${targetMember.name}" কে ডিলিট করা যাবে না!\n\nসে নিচের খরচগুলোর একমাত্র ভোগকারী: ${names}।\nতাকে ডিলিট করলে এই খরচের কোনো অংশীদার থাকবে না (Divide-by-Zero Error)। আগে খরচটি ডিলিট বা এডিট করুন।`
      );
    }

    // 2. Check if member paid for any expense (Single or Multiple Payer)
    const payerExpenses = expenses.filter(
      (exp) =>
        (exp.paymentMethod === "single" && exp.singlePayerId === id) ||
        (exp.paymentMethod === "multiple" &&
          parseFloat(exp.multiPayers?.[id] || 0) > 0)
    );
    if (payerExpenses.length > 0) {
      const names = payerExpenses.map((e) => `"${e.desc}"`).join(", ");
      return alert(
        `সতর্কতা: "${targetMember.name}" নিজ পকেট থেকে নিচের খরচগুলো পরিশোধ করেছে: ${names}।\n\nতাকে ডিলিট করলে মোট খরচের সাথে পেমেন্টের হিসাব মিলবে না। আগে ওই খরচগুলো এডিট বা ডিলিট করুন।`
      );
    }

    // 3. Warn if member has a deposit
    const confirmMsg =
      targetMember.deposit > 0
        ? `"${targetMember.name}" এর নামে ৳${formatMoney(
            targetMember.deposit
          )} ফান্ডে জমা আছে। তাকে রিমুভ করলে মোট ফান্ড কালেকশন কমে যাবে। তবুও রিমুভ করবেন?`
        : `"${targetMember.name}" কে মেম্বার লিস্ট থেকে রিমুভ করবেন?`;

    if (window.confirm(confirmMsg)) {
      setMembers(members.filter((m) => m.id !== id));
      setExpenses(
        expenses.map((exp) => ({
          ...exp,
          consumers: exp.consumers.filter((cId) => cId !== id),
        }))
      );
      setExpenseForm((prev) => ({
        ...prev,
        singlePayerId: prev.singlePayerId === id ? "" : prev.singlePayerId,
        consumers: prev.consumers.filter((cId) => cId !== id),
      }));
    }
  };

  // --- Expense Handlers (Add & Edit) ---
  const resetExpenseForm = () => {
    setEditingExpenseId(null);
    setExpenseForm({
      desc: "",
      amount: "",
      paymentMethod: "group",
      singlePayerId: members[0]?.id || "",
      multiPayers: {},
      consumers: members.map((m) => m.id),
    });
  };

  const handleSaveExpense = (e) => {
    e.preventDefault();
    const amountNum = round2(parseFloat(expenseForm.amount));

    if (!expenseForm.desc.trim() || isNaN(amountNum) || amountNum <= 0) {
      return alert("খরচের বিবরণ ও সঠিক টাকার পরিমাণ (০ এর বেশি) দিন!");
    }
    if (expenseForm.consumers.length === 0) {
      return alert("অন্তত একজনকে সিলেক্ট করুন যার জন্য খরচটি হয়েছে!");
    }

    if (expenseForm.paymentMethod === "single" && !expenseForm.singlePayerId) {
      return alert("কে টাকা দিয়েছে তা সিলেক্ট করুন!");
    }

    // Floating-point safe validation for Multiple Payers
    let cleanedMultiPayers = {};
    if (expenseForm.paymentMethod === "multiple") {
      let sumOfMultiPayers = 0;
      Object.entries(expenseForm.multiPayers).forEach(([mId, val]) => {
        const parsedVal = round2(parseFloat(val) || 0);
        if (parsedVal < 0) {
          return alert("মেম্বারের প্রদত্ত টাকার পরিমাণ ঋণাত্মক হতে পারে না!");
        }
        if (parsedVal > 0) {
          cleanedMultiPayers[mId] = parsedVal;
          sumOfMultiPayers = round2(sumOfMultiPayers + parsedVal);
        }
      });

      if (Math.abs(sumOfMultiPayers - amountNum) > EPSILON) {
        const diff = round2(amountNum - sumOfMultiPayers);
        return alert(
          `হিসাব মিলছে না!\nমোট খরচ: ৳${formatMoney(amountNum)}\nমেম্বারদের দেওয়া টাকার যোগফল: ৳${formatMoney(
            sumOfMultiPayers
          )}\nপার্থক্য: ৳${formatMoney(Math.abs(diff))} (${
            diff > 0 ? "কম দেওয়া হয়েছে" : "বেশি দেওয়া হয়েছে"
          })`
        );
      }
    }

    const expensePayload = {
      id: editingExpenseId || "exp_" + Date.now().toString(),
      desc: expenseForm.desc.trim(),
      amount: amountNum,
      paymentMethod: expenseForm.paymentMethod,
      singlePayerId:
        expenseForm.paymentMethod === "single" ? expenseForm.singlePayerId : "",
      multiPayers:
        expenseForm.paymentMethod === "multiple" ? cleanedMultiPayers : {},
      consumers: expenseForm.consumers,
    };

    if (editingExpenseId) {
      setExpenses(
        expenses.map((exp) =>
          exp.id === editingExpenseId ? expensePayload : exp
        )
      );
    } else {
      setExpenses([expensePayload, ...expenses]);
    }

    resetExpenseForm();
  };

  const handleEditExpense = (exp) => {
    setEditingExpenseId(exp.id);
    setExpenseForm({
      desc: exp.desc,
      amount: exp.amount.toString(),
      paymentMethod: exp.paymentMethod,
      singlePayerId: exp.singlePayerId || members[0]?.id || "",
      multiPayers: exp.multiPayers ? { ...exp.multiPayers } : {},
      consumers: [...exp.consumers],
    });
    if (expenseFormRef.current) {
      expenseFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleRemoveExpense = (id) => {
    if (window.confirm("খরচটি ডিলিট করবেন?")) {
      setExpenses(expenses.filter((e) => e.id !== id));
      if (editingExpenseId === id) {
        resetExpenseForm();
      }
    }
  };

  // --- Core Financial Calculations ---
  const totalCollected = useMemo(
    () => round2(members.reduce((sum, m) => sum + (Number(m.deposit) || 0), 0)),
    [members]
  );

  const totalExpense = useMemo(
    () => round2(expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)),
    [expenses]
  );

  const groupExpensesTotal = useMemo(
    () =>
      round2(
        expenses
          .filter((e) => e.paymentMethod === "group")
          .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
      ),
    [expenses]
  );

  const groupFundBalance = useMemo(
    () => round2(totalCollected - groupExpensesTotal),
    [totalCollected, groupExpensesTotal]
  );

  // --- Settlement & Splitwise Debt Simplification Algorithm ---
  const { settlementData, transactions } = useMemo(() => {
    const balances = {};
    members.forEach((m) => {
      balances[m.id] = {
        id: m.id,
        name: m.name,
        deposit: round2(m.deposit || 0),
        pocketPaid: 0,
        paid: round2(m.deposit || 0),
        consumed: 0,
        net: 0,
      };
    });

    expenses.forEach((exp) => {
      // Defensive guard against zero consumers
      const validConsumers = exp.consumers.filter((cId) => balances[cId]);
      if (validConsumers.length === 0) return;

      const perHead = exp.amount / validConsumers.length;
      validConsumers.forEach((cId) => {
        balances[cId].consumed += perHead;
      });

      if (exp.paymentMethod === "single" && balances[exp.singlePayerId]) {
        balances[exp.singlePayerId].pocketPaid += exp.amount;
        balances[exp.singlePayerId].paid += exp.amount;
      } else if (exp.paymentMethod === "multiple" && exp.multiPayers) {
        Object.entries(exp.multiPayers).forEach(([pId, amtStr]) => {
          const amt = parseFloat(amtStr) || 0;
          if (balances[pId]) {
            balances[pId].pocketPaid += amt;
            balances[pId].paid += amt;
          }
        });
      }
    });

    // Finalize rounded net balances per member
    Object.keys(balances).forEach((id) => {
      balances[id].pocketPaid = round2(balances[id].pocketPaid);
      balances[id].paid = round2(balances[id].paid);
      balances[id].consumed = round2(balances[id].consumed);
      balances[id].net = round2(balances[id].paid - balances[id].consumed);
    });

    // --- Splitwise Cash-Flow Graph Construction ---
    // Payers (যারা টাকা দেবে) & Receivers (যারা টাকা পাবে)
    const payers = [];
    const receivers = [];

    Object.values(balances).forEach((b) => {
      if (b.net < -EPSILON) {
        payers.push({
          id: b.id,
          name: b.name,
          amount: round2(Math.abs(b.net)),
          isFund: false,
        });
      } else if (b.net > EPSILON) {
        receivers.push({
          id: b.id,
          name: b.name,
          amount: round2(b.net),
          isFund: false,
        });
      }
    });

    // Integrating Group Fund Cash Box into the Settlement Graph
    // যদি গ্রুপ ফান্ডে টাকা বেঁচে থাকে (> 0), তবে ফান্ড নিজেই পাওনাদার মেম্বারদের টাকা ফেরত দেবে (Payer)
    // যদি গ্রুপ ফান্ডে ঘাটতি থাকে (< 0), তবে মেম্বাররা ফান্ডে টাকা দিয়ে ঘাটতি পূরণ করবে (Receiver)
    if (groupFundBalance > EPSILON) {
      payers.push({
        id: "GROUP_FUND",
        name: "গ্রুপ ফান্ড (ক্যাশ ব্যালেন্স)",
        amount: round2(groupFundBalance),
        isFund: true,
      });
    } else if (groupFundBalance < -EPSILON) {
      receivers.push({
        id: "GROUP_FUND",
        name: "গ্রুপ ফান্ড (ক্যাশ ঘাটতি)",
        amount: round2(Math.abs(groupFundBalance)),
        isFund: true,
      });
    }

    // Greedy Matching Algorithm to minimize number of transactions
    const settlementTx = [];
    let safetyCounter = 0;

    while (payers.length > 0 && receivers.length > 0 && safetyCounter < 1000) {
      safetyCounter++;
      // Sort descending by amount so largest debts settle first
      payers.sort((a, b) => b.amount - a.amount);
      receivers.sort((a, b) => b.amount - a.amount);

      const payer = payers[0];
      const receiver = receivers[0];
      const settledAmount = round2(Math.min(payer.amount, receiver.amount));

      if (settledAmount > EPSILON) {
        settlementTx.push({
          from: payer.name,
          to: receiver.name,
          fromIsFund: payer.isFund,
          toIsFund: receiver.isFund,
          amount: settledAmount,
        });
      }

      payer.amount = round2(payer.amount - settledAmount);
      receiver.amount = round2(receiver.amount - settledAmount);

      if (payer.amount <= EPSILON) payers.shift();
      if (receiver.amount <= EPSILON) receivers.shift();
    }

    return { settlementData: balances, transactions: settlementTx };
  }, [members, expenses, groupFundBalance]);

  // Live sum helper for multiple payers input UI
  const currentMultiPayerSum = useMemo(() => {
    if (expenseForm.paymentMethod !== "multiple") return 0;
    return round2(
      Object.values(expenseForm.multiPayers).reduce(
        (sum, val) => sum + (parseFloat(val) || 0),
        0
      )
    );
  }, [expenseForm.multiPayers, expenseForm.paymentMethod]);

  // --- Generate High-Res Image ---
  const downloadReceipt = async () => {
    setIsGenerating(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const element = receiptRef.current;

      const isDarkMode = document.documentElement.classList.contains("dark");
      const bgColor = isDarkMode ? "#0a1c13" : "#fdfbf7";

      const canvas = await html2canvas(element, {
        scale: 3,
        backgroundColor: bgColor,
        useCORS: true,
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `CAS-Event-Slip-${(eventData.name || "Event").replace(
        /\s+/g,
        "-"
      )}.png`;
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
        <div className="text-center mb-6" data-aos="fade-down">
          <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white mb-2 tracking-tight transition-colors">
            ইভেন্ট{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
              ক্যালকুলেটর
            </span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
            ট্যুরের যাবতীয় হিসাব-নিকাশের ম্যাজিক সমাধান
          </p>
        </div>

        {/* Active Event Bar (Allows switching/creating events anytime) */}
        {activeTab !== "setup" && (
          <div className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm dark:shadow-none transition-colors">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <div>
                <p className="text-xs font-black text-gray-900 dark:text-white">
                  {eventData.name || "Unnamed Event"}
                </p>
                {eventData.date && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    তারিখ: {eventData.date}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("setup")}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-500/20 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
              >
                <i className="fa-solid fa-folder-open mr-1.5"></i>ইভেন্ট পরিবর্তন / আর্কাইভ ({savedEvents.length})
              </button>
              <button
                onClick={handleCreateNewEvent}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-colors"
              >
                <i className="fa-solid fa-plus mr-1"></i>নতুন ইভেন্ট
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        {activeTab !== "setup" && (
          <div className="flex flex-wrap justify-center gap-2 bg-white dark:bg-white/5 p-2 rounded-2xl mb-6 border border-gray-200 dark:border-white/10 shadow-soft dark:shadow-none transition-colors duration-500">
            <button
              onClick={() => setActiveTab("members")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm dark:shadow-none ${
                activeTab === "members"
                  ? "bg-purple-500 text-white dark:shadow-glow"
                  : "bg-gray-50 text-gray-600 dark:bg-transparent dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
              }`}
            >
              <i className="fa-solid fa-users mr-2"></i>মেম্বার ও ফান্ড
            </button>
            <button
              onClick={() => {
                setActiveTab("expenses");
                if (!editingExpenseId && expenseForm.consumers.length === 0) {
                  setExpenseForm((p) => ({
                    ...p,
                    singlePayerId: p.singlePayerId || members[0]?.id || "",
                    consumers: members.map((m) => m.id),
                  }));
                }
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm dark:shadow-none ${
                activeTab === "expenses"
                  ? "bg-pink-500 text-white dark:shadow-glow"
                  : "bg-gray-50 text-gray-600 dark:bg-transparent dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
              }`}
            >
              <i className="fa-solid fa-money-bill-wave mr-2"></i>খরচের খাতা
            </button>
            <button
              onClick={() => setActiveTab("settlement")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm dark:shadow-none ${
                activeTab === "settlement"
                  ? "bg-emerald-500 text-white dark:shadow-glow"
                  : "bg-gray-50 text-gray-600 dark:bg-transparent dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
              }`}
            >
              <i className="fa-solid fa-check-double mr-2"></i>ফাইনাল সেটেলমেন্ট
            </button>
          </div>
        )}

        {/* TAB 1: SETUP & ARCHIVE */}
        {activeTab === "setup" && (
          <div className="space-y-8" data-aos="zoom-in">
            <div className="bg-white dark:bg-[#0a1c13] border border-gray-200 dark:border-white/10 rounded-3xl p-8 max-w-md mx-auto shadow-soft dark:shadow-2xl transition-colors duration-500">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-200 dark:border-purple-500/40 text-purple-600 dark:text-purple-400 text-2xl transition-colors">
                <i className="fa-solid fa-compass"></i>
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white text-center mb-6 transition-colors">
                {currentEventId ? "ইভেন্টের তথ্য আপডেট করুন" : "নতুন ইভেন্ট শুরু করুন"}
              </h2>
              <form onSubmit={handleStartEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 transition-colors">
                    ইভেন্টের নাম *
                  </label>
                  <input
                    required
                    type="text"
                    value={eventData.name}
                    onChange={(e) =>
                      setEventData({ ...eventData, name: e.target.value })
                    }
                    placeholder="e.g. Sajek Tour 2026"
                    className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-purple-500 outline-none transition-colors shadow-sm dark:shadow-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 transition-colors">
                    তারিখ
                  </label>
                  <input
                    type="date"
                    value={eventData.date}
                    onChange={(e) =>
                      setEventData({ ...eventData, date: e.target.value })
                    }
                    className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-purple-500 outline-none dark:[color-scheme:dark] transition-colors shadow-sm dark:shadow-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3.5 rounded-xl font-black tracking-widest mt-4 transition-colors shadow-md hover:-translate-y-1"
                >
                  {currentEventId ? "হিসাবে ফিরে যান" : "হিসাব শুরু করুন"}{" "}
                  <i className="fa-solid fa-arrow-right ml-2"></i>
                </button>
              </form>
            </div>

            {/* Saved Events History List (Solves Bug #4: Single Storage Overwrite) */}
            {savedEvents.length > 0 && (
              <div className="bg-white dark:bg-[#0a1c13] border border-gray-200 dark:border-white/10 rounded-3xl p-6 max-w-2xl mx-auto shadow-soft dark:shadow-xl transition-colors">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3 mb-4">
                  <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-wider">
                    <i className="fa-solid fa-clock-rotate-left mr-2 text-purple-500"></i>
                    সংরক্ষিত ইভেন্ট সমূহ ({savedEvents.length})
                  </h3>
                  {currentEventId && (
                    <button
                      onClick={handleCreateNewEvent}
                      className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      + নতুন আরেকটি খুলুন
                    </button>
                  )}
                </div>
                <div className="space-y-2.5">
                  {savedEvents.map((evt) => {
                    const isCurrent = evt.id === currentEventId;
                    const evtTotalExp = round2(
                      (evt.expenses || []).reduce(
                        (s, x) => s + (Number(x.amount) || 0),
                        0
                      )
                    );
                    return (
                      <div
                        key={evt.id}
                        className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                          isCurrent
                            ? "bg-purple-50/70 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/40"
                            : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 dark:text-white text-sm">
                              {evt.eventData?.name || "Unnamed Event"}
                            </p>
                            {isCurrent && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-600 text-white font-bold">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            মেম্বার: {evt.members?.length || 0} জন • মোট খরচ: ৳
                            {formatMoney(evtTotalExp)}
                            {evt.eventData?.date ? ` • তারিখ: ${evt.eventData.date}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => handleLoadSavedEvent(evt)}
                            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors"
                          >
                            ওপেন করুন
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteSavedEvent(evt.id, evt.eventData?.name)
                            }
                            className="p-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-transparent transition-colors"
                            title="ইভেন্ট ডিলিট করুন"
                          >
                            <i className="fa-solid fa-trash text-xs"></i>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MEMBERS & FUND */}
        {activeTab === "members" && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 dark:bg-gradient-to-br dark:from-emerald-900/40 dark:to-emerald-900/10 border border-emerald-200 dark:border-emerald-500/30 p-5 rounded-2xl text-center shadow-sm dark:shadow-none transition-colors duration-500">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-1 transition-colors">
                  মোট ফান্ড কালেকশন
                </p>
                <p className="text-3xl font-black text-emerald-900 dark:text-white transition-colors">
                  ৳{formatMoney(totalCollected)}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-gradient-to-br dark:from-purple-900/40 dark:to-purple-900/10 border border-purple-200 dark:border-purple-500/30 p-5 rounded-2xl text-center shadow-sm dark:shadow-none transition-colors duration-500">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-bold mb-1 transition-colors">
                  মেম্বার সংখ্যা
                </p>
                <p className="text-3xl font-black text-purple-900 dark:text-white transition-colors">
                  {members.length} জন
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0a1c13] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-soft dark:shadow-xl transition-colors duration-500">
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-white/5 pb-3 transition-colors">
                মেম্বার ও ফান্ড জমা যুক্ত করুন
              </h3>
              <form onSubmit={handleAddMember} className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="মেম্বারের নাম লিখুন..."
                  className="flex-1 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-purple-500 outline-none transition-colors shadow-sm dark:shadow-none"
                />
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white px-6 rounded-xl font-bold transition-colors shadow-md hover:-translate-y-0.5"
                >
                  <i className="fa-solid fa-plus"></i>
                </button>
              </form>

              <div className="space-y-3">
                {members.length === 0 ? (
                  <p className="text-center text-gray-500 py-4 text-sm transition-colors">
                    কোনো মেম্বার যুক্ত করা হয়নি।
                  </p>
                ) : null}
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none"
                  >
                    <span className="font-bold text-gray-800 dark:text-white pl-2 transition-colors">
                      {member.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400 font-semibold mr-1">
                        ফান্ডে জমা:
                      </span>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-400">
                          ৳
                        </span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={member.deposit || ""}
                          onChange={(e) =>
                            handleUpdateDeposit(member.id, e.target.value)
                          }
                          placeholder="0"
                          className="w-32 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg pl-7 pr-3 py-2 text-emerald-600 dark:text-emerald-400 font-bold focus:border-emerald-500 outline-none transition-colors shadow-inner dark:shadow-none"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/30 p-2 rounded-lg transition-colors border border-red-200 dark:border-transparent"
                        title="মেম্বার রিমুভ করুন"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
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
            <div className="bg-pink-50 dark:bg-gradient-to-br dark:from-pink-900/40 dark:to-pink-900/10 border border-pink-200 dark:border-pink-500/30 p-5 rounded-2xl flex flex-wrap justify-between items-center gap-4 shadow-sm dark:shadow-none transition-colors duration-500">
              <div>
                <p className="text-xs text-pink-600 dark:text-pink-400 font-bold mb-1 transition-colors">
                  মোট খরচ (সকল মাধ্যম)
                </p>
                <p className="text-3xl font-black text-pink-900 dark:text-white text-left transition-colors">
                  ৳{formatMoney(totalExpense)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1 transition-colors">
                  গ্রুপ ফান্ডের ক্যাশ ব্যালেন্স
                </p>
                <p
                  className={`text-xl font-black transition-colors ${
                    groupFundBalance < -EPSILON
                      ? "text-red-500"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  ৳{formatMoney(groupFundBalance)}
                </p>
                {groupFundBalance < -EPSILON && (
                  <p className="text-[10px] text-red-500 font-bold mt-0.5">
                    (ফান্ড জমার চেয়ে ৳{formatMoney(Math.abs(groupFundBalance))} বেশি খরচ হয়েছে)
                  </p>
                )}
              </div>
            </div>

            <div
              ref={expenseFormRef}
              className="bg-white dark:bg-[#0a1c13] border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-soft dark:shadow-xl transition-colors duration-500"
            >
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-white/5 pb-3">
                <h3 className="text-lg font-black text-gray-900 dark:text-white transition-colors">
                  {editingExpenseId ? (
                    <span className="text-amber-500">
                      <i className="fa-solid fa-pen-to-square mr-2"></i>খরচ এডিট করুন
                    </span>
                  ) : (
                    "খরচের এন্ট্রি করুন"
                  )}
                </h3>
                {editingExpenseId && (
                  <button
                    type="button"
                    onClick={resetExpenseForm}
                    className="text-xs font-bold px-3 py-1 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-red-100 hover:text-red-600 transition-colors"
                  >
                    <i className="fa-solid fa-xmark mr-1"></i>এডিট বাতিল করুন
                  </button>
                )}
              </div>

              {members.length === 0 ? (
                <div className="text-center py-6 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-200 dark:border-amber-500/20">
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-2">
                    খরচ যুক্ত করার আগে অন্তত একজন মেম্বার যুক্ত করুন!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("members")}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold"
                  >
                    মেম্বার ট্যাবে যান
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSaveExpense}
                  className={`space-y-4 mb-8 p-5 rounded-2xl border transition-colors ${
                    editingExpenseId
                      ? "bg-amber-50/40 dark:bg-amber-900/10 border-amber-300 dark:border-amber-500/40"
                      : "bg-gray-50 dark:bg-black/30 border-gray-200 dark:border-white/5"
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 transition-colors">
                        কীসে খরচ হলো? *
                      </label>
                      <input
                        type="text"
                        value={expenseForm.desc}
                        onChange={(e) =>
                          setExpenseForm({ ...expenseForm, desc: e.target.value })
                        }
                        placeholder="যেমন: বাসের ভাড়া, দুপুরের খাবার"
                        className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:border-pink-500 outline-none transition-colors shadow-sm dark:shadow-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 transition-colors">
                        টাকার পরিমাণ (৳) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={expenseForm.amount}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            amount: e.target.value,
                          })
                        }
                        placeholder="0"
                        className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:border-pink-500 outline-none font-bold transition-colors shadow-sm dark:shadow-none"
                      />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none transition-colors">
                    <label className="block text-xs font-bold text-pink-500 dark:text-pink-400 mb-3 uppercase tracking-widest transition-colors">
                      <i className="fa-solid fa-wallet mr-1"></i> টাকাটা কে দিয়েছে?
                    </label>
                    <div className="flex gap-2 flex-wrap mb-4">
                      <label
                        className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                          expenseForm.paymentMethod === "group"
                            ? "bg-pink-100 dark:bg-pink-500/20 border-pink-300 dark:border-pink-500 text-pink-600 dark:text-pink-400"
                            : "bg-gray-50 dark:bg-black/50 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payMethod"
                          className="hidden"
                          checked={expenseForm.paymentMethod === "group"}
                          onChange={() =>
                            setExpenseForm({
                              ...expenseForm,
                              paymentMethod: "group",
                            })
                          }
                        />
                        গ্রুপ ফান্ড
                      </label>
                      <label
                        className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                          expenseForm.paymentMethod === "single"
                            ? "bg-pink-100 dark:bg-pink-500/20 border-pink-300 dark:border-pink-500 text-pink-600 dark:text-pink-400"
                            : "bg-gray-50 dark:bg-black/50 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payMethod"
                          className="hidden"
                          checked={expenseForm.paymentMethod === "single"}
                          onChange={() =>
                            setExpenseForm({
                              ...expenseForm,
                              paymentMethod: "single",
                              singlePayerId:
                                expenseForm.singlePayerId || members[0]?.id || "",
                            })
                          }
                        />
                        একজন মেম্বার (নিজ পকেট)
                      </label>
                      <label
                        className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                          expenseForm.paymentMethod === "multiple"
                            ? "bg-pink-100 dark:bg-pink-500/20 border-pink-300 dark:border-pink-500 text-pink-600 dark:text-pink-400"
                            : "bg-gray-50 dark:bg-black/50 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payMethod"
                          className="hidden"
                          checked={expenseForm.paymentMethod === "multiple"}
                          onChange={() =>
                            setExpenseForm({
                              ...expenseForm,
                              paymentMethod: "multiple",
                            })
                          }
                        />
                        একাধিক মেম্বার (Custom)
                      </label>
                    </div>

                    {expenseForm.paymentMethod === "single" && (
                      <select
                        value={expenseForm.singlePayerId}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            singlePayerId: e.target.value,
                          })
                        }
                        className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-800 dark:text-white focus:border-pink-500 outline-none mt-2 transition-colors"
                      >
                        <option value="">-- মেম্বার সিলেক্ট করুন --</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} নিজের পকেট থেকে দিয়েছে
                          </option>
                        ))}
                      </select>
                    )}

                    {expenseForm.paymentMethod === "multiple" && (
                      <div className="space-y-3 mt-3">
                        <div className="flex justify-between items-center text-xs bg-gray-100 dark:bg-black/40 px-3 py-2 rounded-lg">
                          <span className="text-gray-500 dark:text-gray-400 font-bold">
                            মেম্বারদের দেওয়া টাকার যোগফল:
                          </span>
                          <span
                            className={`font-black ${
                              Math.abs(
                                currentMultiPayerSum -
                                  (parseFloat(expenseForm.amount) || 0)
                              ) <= EPSILON
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            ৳{formatMoney(currentMultiPayerSum)} / ৳
                            {formatMoney(parseFloat(expenseForm.amount) || 0)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {members.map((m) => (
                            <div
                              key={m.id}
                              className="bg-gray-50 dark:bg-black/40 p-2 rounded-lg border border-gray-200 dark:border-white/5 transition-colors"
                            >
                              <span className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1 truncate transition-colors">
                                {m.name}
                              </span>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="৳ 0"
                                value={expenseForm.multiPayers[m.id] ?? ""}
                                onChange={(e) =>
                                  setExpenseForm({
                                    ...expenseForm,
                                    multiPayers: {
                                      ...expenseForm.multiPayers,
                                      [m.id]: e.target.value,
                                    },
                                  })
                                }
                                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded px-2 py-1 text-xs text-gray-800 dark:text-white focus:border-pink-500 outline-none transition-colors shadow-inner dark:shadow-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 transition-colors">
                        এই খরচটি কাদের জন্য প্রযোজ্য? ({expenseForm.consumers.length}/
                        {members.length} জন)
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setExpenseForm({
                            ...expenseForm,
                            consumers:
                              expenseForm.consumers.length === members.length
                                ? []
                                : members.map((m) => m.id),
                          })
                        }
                        className="text-[10px] text-pink-600 dark:text-pink-400 hover:text-pink-500 dark:hover:text-pink-300 font-bold bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-transparent px-2 py-1 rounded transition-colors"
                      >
                        {expenseForm.consumers.length === members.length
                          ? "সবাইকে আনসিলেক্ট করুন"
                          : "সবাইকে সিলেক্ট করুন"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {members.map((m) => {
                        const isSelected = expenseForm.consumers.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              const newConsumers = isSelected
                                ? expenseForm.consumers.filter((id) => id !== m.id)
                                : [...expenseForm.consumers, m.id];
                              setExpenseForm({
                                ...expenseForm,
                                consumers: newConsumers,
                              });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm dark:shadow-none ${
                              isSelected
                                ? "bg-pink-100 dark:bg-pink-500/20 border-pink-400 dark:border-pink-500 text-pink-600 dark:text-pink-400"
                                : "bg-gray-50 dark:bg-black/50 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                            }`}
                          >
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`w-full text-white py-3.5 rounded-xl font-bold uppercase tracking-widest transition-all mt-4 shadow-md hover:-translate-y-0.5 ${
                      editingExpenseId
                        ? "bg-amber-600 hover:bg-amber-500"
                        : "bg-pink-600 hover:bg-pink-500"
                    }`}
                  >
                    <i
                      className={`fa-solid ${
                        editingExpenseId ? "fa-floppy-disk" : "fa-check"
                      } mr-2`}
                    ></i>
                    {editingExpenseId ? "খরচ আপডেট করুন" : "খরচ যুক্ত করুন"}
                  </button>
                </form>
              )}

              {/* Expense List */}
              <div className="space-y-3">
                {expenses.length === 0 ? (
                  <p className="text-center text-gray-500 py-4 text-sm transition-colors">
                    কোনো খরচের হিসাব নেই।
                  </p>
                ) : null}
                {expenses.map((exp, i) => {
                  let payerName = "";
                  if (exp.paymentMethod === "group") payerName = "গ্রুপ ফান্ড";
                  else if (exp.paymentMethod === "single")
                    payerName =
                      members.find((m) => m.id === exp.singlePayerId)?.name ||
                      "Unknown";
                  else payerName = "একাধিক মেম্বার";

                  const isBeingEdited = editingExpenseId === exp.id;
                  const perPersonShare =
                    exp.consumers.length > 0
                      ? formatMoney(exp.amount / exp.consumers.length)
                      : "0";

                  return (
                    <div
                      key={exp.id}
                      className={`border p-4 rounded-xl flex justify-between items-center gap-3 transition-colors relative group overflow-hidden shadow-sm dark:shadow-none ${
                        isBeingEdited
                          ? "bg-amber-50/60 dark:bg-amber-500/10 border-amber-400 dark:border-amber-500/50"
                          : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10"
                      }`}
                    >
                      {exp.paymentMethod === "multiple" && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-400 dark:bg-purple-500"></div>
                      )}
                      <div className="pl-2">
                        <p className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm sm:text-base transition-colors">
                          <span className="bg-white dark:bg-white/10 border border-gray-200 dark:border-transparent text-[10px] px-2 py-0.5 rounded-md text-gray-500 dark:text-gray-400 shadow-sm dark:shadow-none">
                            {expenses.length - i}
                          </span>{" "}
                          {exp.desc}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">
                          পেমেন্ট:{" "}
                          <span className="text-blue-500 dark:text-blue-400 font-bold">
                            {payerName}
                          </span>{" "}
                          • ভোগকারী:{" "}
                          {exp.consumers.length === members.length
                            ? "সকলে"
                            : `${exp.consumers.length} জন`}{" "}
                          (জনপ্রতি ৳{perPersonShare})
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base sm:text-lg font-black text-pink-500 dark:text-pink-400 transition-colors">
                          ৳{formatMoney(exp.amount)}
                        </p>
                        <div className="flex items-center justify-end gap-3 mt-1">
                          <button
                            onClick={() => handleEditExpense(exp)}
                            className="text-[10px] text-amber-600 dark:text-amber-400 hover:text-amber-500 font-bold uppercase transition-colors"
                          >
                            <i className="fa-solid fa-pen mr-1"></i>এডিট
                          </button>
                          <button
                            onClick={() => handleRemoveExpense(exp.id)}
                            className="text-[10px] text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 font-bold uppercase transition-colors"
                          >
                            <i className="fa-solid fa-trash mr-1"></i>ডিলিট
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FINAL SETTLEMENT & SLIP GENERATION */}
        {activeTab === "settlement" && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div
              ref={receiptRef}
              className="bg-white dark:bg-gradient-to-b dark:from-[#0a1c13] dark:to-[#050b08] border border-gray-200 dark:border-white/10 rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-soft dark:shadow-2xl transition-colors duration-500"
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-5"></div>

              {/* Slip Header */}
              <div className="text-center border-b border-dashed border-gray-300 dark:border-white/20 pb-6 mb-6 relative transition-colors">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200 dark:border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-xl transition-colors">
                  <i className="fa-solid fa-receipt"></i>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-widest uppercase mb-1 transition-colors">
                  CAS Final Slip
                </h2>
                <h3 className="text-base sm:text-lg text-emerald-600 dark:text-emerald-400 font-bold mb-2 transition-colors">
                  {eventData.name || "Unnamed Event"}
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 transition-colors">
                  {eventData.date
                    ? `তারিখ: ${eventData.date}`
                    : `জেনারেট করা হয়েছে: ${new Date().toLocaleDateString("en-GB")}`}
                </p>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-3 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10 mb-8 relative transition-colors shadow-inner dark:shadow-none">
                <div className="text-center border-r border-gray-200 dark:border-white/10 px-1 transition-colors">
                  <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 transition-colors">
                    ফান্ড সংগ্রহ
                  </p>
                  <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 transition-colors">
                    ৳{formatMoney(totalCollected)}
                  </p>
                </div>
                <div className="text-center border-r border-gray-200 dark:border-white/10 px-1 transition-colors">
                  <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 transition-colors">
                    মোট খরচ
                  </p>
                  <p className="text-lg sm:text-2xl font-black text-pink-600 dark:text-pink-400 transition-colors">
                    ৳{formatMoney(totalExpense)}
                  </p>
                </div>
                <div className="text-center px-1">
                  <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 transition-colors">
                    ফান্ডে অবশিষ্ট ক্যাশ
                  </p>
                  <p
                    className={`text-lg sm:text-2xl font-black transition-colors ${
                      groupFundBalance < -EPSILON
                        ? "text-red-500"
                        : "text-purple-600 dark:text-purple-400"
                    }`}
                  >
                    ৳{formatMoney(groupFundBalance)}
                  </p>
                </div>
              </div>

              {/* Individual Member Breakdown */}
              <div className="space-y-3 relative mb-8">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mb-4 transition-colors">
                  ১. ব্যক্তিগত হিসাব নিকাশ:
                </p>
                {Object.keys(settlementData).map((id) => {
                  const data = settlementData[id];
                  const net = data.net;
                  const isReceivable = net > EPSILON;
                  const isPayable = net < -EPSILON;

                  return (
                    <div
                      key={id}
                      className="bg-white dark:bg-black/40 p-3 sm:p-4 rounded-xl flex justify-between items-center border border-gray-100 dark:border-transparent border-l-4 shadow-sm dark:shadow-none transition-colors"
                      style={{
                        borderLeftColor: isReceivable
                          ? "#10b981"
                          : isPayable
                          ? "#ef4444"
                          : "#6b7280",
                      }}
                    >
                      <div>
                        <p className="font-bold text-gray-800 dark:text-white text-sm transition-colors">
                          {data.name}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 mt-1 transition-colors">
                          ফান্ডে জমা: ৳{formatMoney(data.deposit)} | পকেট থেকে: ৳
                          {formatMoney(data.pocketPaid)} | মোট খরচ: ৳
                          {formatMoney(data.consumed)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        {isReceivable ? (
                          <div className="bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/20 transition-colors">
                            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-0.5 transition-colors">
                              ফেরত পাবে
                            </p>
                            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 transition-colors">
                              +৳{formatMoney(net)}
                            </p>
                          </div>
                        ) : isPayable ? (
                          <div className="bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/20 transition-colors">
                            <p className="text-[9px] text-red-600 dark:text-red-400 uppercase tracking-widest mb-0.5 transition-colors">
                              আরও দেবে
                            </p>
                            <p className="text-sm font-black text-red-600 dark:text-red-500 transition-colors">
                              -৳{formatMoney(Math.abs(net))}
                            </p>
                          </div>
                        ) : (
                          <div className="px-3 py-1.5">
                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors">
                              <i className="fa-solid fa-check-circle mr-1"></i>
                              ক্লিয়ার
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Splitwise Simplified Transactions (Who pays Whom) */}
              <div className="relative pt-6 border-t border-dashed border-gray-300 dark:border-white/20">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-black uppercase tracking-widest mb-4 transition-colors flex items-center gap-2">
                  <i className="fa-solid fa-money-bill-transfer"></i>
                  ২. চূড়ান্ত লেনদেন নির্দেশিকা (কে কাকে কত টাকা দেবে):
                </p>

                {transactions.length === 0 ? (
                  <div className="bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 text-center">
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      <i className="fa-solid fa-circle-check mr-1.5"></i>
                      সবার হিসাব সম্পূর্ণ ক্লিয়ার! কারো সাথে কারো কোনো লেনদেন বাকি নেই।
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {transactions.map((tx, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3.5 rounded-xl flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs sm:text-sm">
                          <span
                            className={`font-black px-2.5 py-1 rounded-lg ${
                              tx.fromIsFund
                                ? "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300"
                                : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
                            }`}
                          >
                            {tx.from}
                          </span>
                          <span className="text-gray-400 dark:text-gray-500 text-xs font-bold flex items-center gap-1">
                            দেবে <i className="fa-solid fa-arrow-right"></i>
                          </span>
                          <span
                            className={`font-black px-2.5 py-1 rounded-lg ${
                              tx.toIsFund
                                ? "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300"
                                : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {tx.to}-কে
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm sm:text-base font-black text-gray-900 dark:text-white bg-white dark:bg-black/40 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10">
                            ৳{formatMoney(tx.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-center mt-10 pt-6 border-t border-gray-200 dark:border-white/10 opacity-70 transition-colors">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest transition-colors">
                  Calculated by CUET Adventure Society
                </p>
                <p className="text-[8px] text-gray-400 dark:text-gray-600 mt-1 transition-colors">
                  www.cuetas.com
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={downloadReceipt}
                disabled={isGenerating}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-md hover:-translate-y-1 flex justify-center items-center gap-2"
              >
                {isGenerating ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-download"></i>
                )}
                {isGenerating ? "স্লিপ তৈরি হচ্ছে..." : "এইচডি স্লিপ ডাউনলোড"}
              </button>

              <button
                onClick={handleCreateNewEvent}
                className="bg-purple-50 dark:bg-purple-900/40 hover:bg-purple-100 dark:hover:bg-purple-900/70 border border-purple-200 dark:border-purple-500/40 text-purple-700 dark:text-purple-300 px-6 py-4 rounded-xl font-bold transition-all text-xs uppercase shadow-sm dark:shadow-lg"
              >
                <i className="fa-solid fa-plus mr-2"></i>নতুন আরেকটি ইভেন্ট খুলুন
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
