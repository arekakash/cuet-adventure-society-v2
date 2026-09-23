"use client";
import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `তুমি হচ্ছো "চুয়েট অ্যাডভেঞ্চার সোসাইটি (CUET AS)"-এর অফিশিয়াল এআই গাইড। তোমার নাম "ক্যাম্পফায়ার এআই (Campfire AI)"। 
তুমি ইউজারদের ট্যুর প্ল্যানিং এবং ওয়েবসাইট ব্যবহারে সাহায্য করবে। তুমি সবসময় বাংলায়, খুব বন্ধুত্বপূর্ণ, এক্সাইটিং এবং সম্মানজনক টোনে কথা বলবে। 

ওয়েবসাইটের গঠন ও ফাংশন:
১. হোমপেজ: অ্যাডভেঞ্চার স্লাইডার, উদ্দেশ্য, এবং লিডারবোর্ড। 
২. সাইনআপ ও লগইন: গুগল বা ফেসবুক দিয়ে অথবা ম্যানুয়ালি। চুয়েট আইডি অবশ্যই ৭ ডিজিটের হতে হবে। 
৩. ড্যাশবোর্ড: ট্যাকটিক্যাল ডেটা এবং এডিট প্রোফাইল বাটন। 
৪. ইভেন্ট বুকিংস: ড্যাশবোর্ডে ইভেন্ট লিস্ট থাকে। 
৫. স্টোর: ট্রেকিং গিয়ার রেন্ট বা কেনার সুবিধা। 
৬. লিডারবোর্ড: মেম্বারদের র‍্যাংকিং।
৭. পাস্ট ইভেন্টস: পুরনো ট্যুরের আর্কাইভ।`;

export default function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "ai", text: "হ্যালো! আমি ক্যাম্পফায়ার এআই 🔥। ট্যুর প্ল্যানিং বা ওয়েবসাইটের কোনো ফিচার নিয়ে সাহায্য লাগবে?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (!apiKey) {
        setMessages((prev) => [...prev, { role: "ai", text: "⚠️ এপিআই চাবি পাওয়া যায়নি!" }]);
        setIsLoading(false);
        return;
      }

      // 🔴 প্রথমে আমরা gemini-1.5-flash ট্রাই করছি
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\nইউজারের প্রশ্ন: ${userMessage}\nতোমার উত্তর:` }] }]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // 🔴 যদি মডেল খুঁজে না পায়, তাহলে গুগলের কাছ থেকে ডাইরেক্ট লিস্ট চেয়ে নেব!
        if (data.error?.message?.includes("is not found")) {
            const modelRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const modelData = await modelRes.json();
            
            if (modelData.models) {
                const modelNames = modelData.models
                    .filter(m => m.supportedGenerationMethods.includes("generateContent"))
                    .map(m => m.name.replace('models/', ''))
                    .join("\n👉 ");
                throw new Error(`আপনার চাবিতে নিচের মডেলগুলোর নাম সাপোর্ট করছে:\n\n👉 ${modelNames}`);
            }
        }
        throw new Error(data.error?.message || "Failed to generate");
      }

      const responseText = data.candidates[0].content.parts[0].text;
      setMessages((prev) => [...prev, { role: "ai", text: responseText }]);

    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "ai", text: `⚠️ ডায়াগনস্টিক রিপোর্ট:\n${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      {isOpen && (
        <div className="bg-[#0a1c13]/95 backdrop-blur-xl border border-[#e76f51]/30 w-[320px] sm:w-[350px] h-[450px] mb-4 rounded-2xl shadow-[0_0_40px_rgba(231,111,81,0.15)] flex flex-col overflow-hidden animate-fade-in-up">
          <div className="bg-gradient-to-r from-[#e76f51] to-orange-600 p-4 flex justify-between items-center text-white shadow-md">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-robot text-xl"></i>
              <div>
                <h3 className="font-black text-sm leading-tight">ক্যাম্পফায়ার এআই</h3>
                <p className="text-[9px] font-medium opacity-80">CUET AS 24/7 Assistant</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 w-8 h-8 rounded-full transition-colors flex items-center justify-center">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#050b08]/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${msg.role === "user" ? "bg-[#2d6a4f] text-white rounded-tr-sm" : "bg-white/10 text-gray-200 border border-white/5 rounded-tl-sm"}`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 border border-white/5 p-3 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-[#e76f51] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[#e76f51] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-2 h-2 bg-[#e76f51] rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-3 bg-[#0a1c13] border-t border-white/10 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="আপনার প্রশ্ন লিখুন..."
              className="flex-grow bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#e76f51] transition-colors"
            />
            <button type="submit" disabled={isLoading || !input.trim()} className="bg-[#e76f51] hover:bg-orange-600 disabled:opacity-50 text-white w-11 h-11 rounded-xl flex items-center justify-center transition-colors shrink-0">
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(231,111,81,0.4)] transition-transform duration-300 hover:scale-110 ${isOpen ? "bg-gray-800 text-gray-400" : "bg-[#e76f51] text-white animate-bounce-slow"}`}
      >
        <i className={`fa-solid ${isOpen ? "fa-xmark text-xl" : "fa-robot text-2xl"}`}></i>
      </button>
    </div>
  );
}
