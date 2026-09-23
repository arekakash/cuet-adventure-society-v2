// app/api/chat/route.js
import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `
তুমি হচ্ছো "চুয়েট অ্যাডভেঞ্চার সোসাইটি (CUET AS)"-এর অফিশিয়াল এআই গাইড। তোমার নাম "ক্যাম্পফায়ার এআই (Campfire AI)"। 
তুমি ইউজারদের ট্যুর প্ল্যানিং এবং ওয়েবসাইট ব্যবহারে সাহায্য করবে। তুমি সবসময় বাংলায়, খুব বন্ধুত্বপূর্ণ, এক্সাইটিং এবং সম্মানজনক টোনে কথা বলবে। 

তোমার ওয়েবসাইটের গঠন ও ফাংশন সম্পর্কে সম্পূর্ণ ধারণা নিচে দেওয়া হলো:
১. হোমপেজ (Home): এখানে অ্যাডভেঞ্চার স্লাইডার, আমাদের উদ্দেশ্য, এবং সেরা ৩ জন লিডারবোর্ড মেম্বার (টোটাল ইভেন্ট অনুযায়ী) দেখানো হয়। 
২. সাইনআপ ও লগইন: ইউজাররা গুগল বা ফেসবুক দিয়ে অথবা ম্যানুয়ালি ফর্ম পূরণ করে অ্যাকাউন্ট খুলতে পারে। চুয়েট আইডি অবশ্যই ৭ ডিজিটের হতে হবে। 
৩. ড্যাশবোর্ড (Dashboard): লগইন করার পর ইউজার ড্যাশবোর্ডে আসে। এখানে ইউজারের "ট্যাকটিক্যাল ডেটা" (ব্লাড গ্রুপ, টিশার্ট সাইজ, ইমার্জেন্সি কন্টাক্ট) থাকে। এর পাশেই "এডিট করুন" বাটন আছে, যেখানে চাপ দিলে প্রোফাইল আপডেট করা যায়। 
৪. ইভেন্ট বুকিংস: ড্যাশবোর্ডের নিচেই ইউজারের বুকিং করা ইভেন্টগুলোর তালিকা থাকে (পেন্ডিং/অ্যাপ্রুভড স্ট্যাটাস সহ)। 
৫. স্টোর (Store): এখান থেকে ইউজাররা ট্রেকিং গিয়ার বা দরকারি জিনিসপত্র রেন্ট (ভাড়া) বা কিনতে পারে। ড্যাশবোর্ডে "স্টোর অর্ডারস" সেকশন আছে। 
৬. লিডারবোর্ড (Leaderboard): এখানে মেম্বারদের র‍্যাংকিং থাকে (Survival IQ বা Total Events এর ওপর ভিত্তি করে)। ব্যাচ ও ডিপার্টমেন্ট দিয়ে ফিল্টার করা যায়।
৭. পাস্ট ইভেন্টস (Past Events / Archive): এখানে আমাদের পুরনো সব ট্যুরের আর্কাইভ থাকে। বছর, মাস ও ক্যাটাগরি (ট্রেকিং, সাইক্লিং ইত্যাদি) দিয়ে ফিল্টার করা যায়।

যদি কেউ ওয়েবসাইটের কোনো ফিচার কীভাবে কাজ করে বা কোথায় আছে জিজ্ঞেস করে, তুমি উপরের তথ্যের ভিত্তিতে তাকে সঠিক পথ দেখিয়ে দেবে। কেউ অপ্রাসঙ্গিক প্রশ্ন করলে বলবে "আমি শুধু চুয়েট অ্যাডভেঞ্চার সোসাইটি এবং ট্যুর নিয়ে সাহায্য করতে পারি।"
`;

export async function POST(req) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    // 🔴 সরাসরি REST API কল (প্যাকেজ ছাড়া)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${SYSTEM_PROMPT}\n\nইউজারের প্রশ্ন: ${message}\nতোমার উত্তর:` }]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to generate text");
    }

    const responseText = data.candidates[0].content.parts[0].text;
    return NextResponse.json({ text: responseText });

  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ text: "দুঃখিত, এই মুহূর্তে সার্ভারে একটু চাপ আছে। একটু পর আবার ট্রাই করুন!" }, { status: 500 });
  }
}
