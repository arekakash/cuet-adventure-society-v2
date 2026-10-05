// app/my-bangladesh/page.js
import MapClient from "./MapClient";

export const metadata = {
  title: 'My Bangladesh - CUET AS',
};

export default async function MyBangladesh() {
  let mapData = null;
  
  try {
    // 🔴 ক্লাউডফ্লেয়ার সার্ভার থেকে ডেটা ফেচ হচ্ছে! ব্রাউজারের কোনো শিল্ড একে আটকাতে পারবে না।
    const res = await fetch(
      "https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/bangladesh/bangladesh-districts.json", 
      { cache: "force-cache" }
    );
    mapData = await res.json();
  } catch (error) {
    console.error("Server fetch error:", error);
  }

  // ক্লায়েন্ট কম্পোনেন্টে রেডিমেড ডেটা পাঠিয়ে দেওয়া হলো
  return <MapClient mapData={mapData} />;
}
