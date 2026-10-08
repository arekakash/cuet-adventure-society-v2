"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import Link from "next/link";
import html2canvas from "html2canvas";
import AOS from "aos";
import "aos/dist/aos.css";
import Cropper from "react-easy-crop";

const geoUrl = "/bd-districts.topo.json";

// কালার প্যালেট অপশনস
const bgColors = [
  { name: "মিনিমাল ঘিয়া", value: "#fcf9f2" },
  { name: "ডার্ক ফরেস্ট", value: "#0a1c13" },
  { name: "ডিপ ওশান", value: "#0f172a" },
  { name: "পিওর হোয়াইট", value: "#ffffff" },
  { name: "অ্যাডভেঞ্চার গ্রিন", value: "#14532d" },
];

const unvisitedColors = [
  { name: "হালকা অ্যাশ", value: "#e2e8f0" },
  { name: "সফট পিচ", value: "#ffedd5" },
  { name: "হালকা নীল", value: "#e0f2fe" },
  { name: "মিন্ট গ্রিন", value: "#d1fae5" },
  { name: "সাদা", value: "#ffffff" },
  { name: "ডার্ক গ্রে (ডার্ক থিমের জন্য)", value: "#1e293b" }
];

const e2b = (num) => String(num).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);

const standardMap = {
  "Chapainababganj": "Chapainawabganj", "Nawabganj": "Chapainawabganj", "Netrakona": "Netrokona",
  "Panchagar": "Panchagarh", "Bramhanbaria": "Brahmanbaria", "Chittagong": "Chattogram", "Coxs Bazar": "Cox's Bazar"
};

const districtBn = {
  "Barguna": "বরগুনা", "Barishal": "বরিশাল", "Bhola": "ভোলা", "Jhalokati": "ঝালকাঠি", "Patuakhali": "পটুয়াখালী", "Pirojpur": "পিরোজপুর",
  "Bandarban": "বান্দরবান", "Brahmanbaria": "ব্রাহ্মণবাড়িয়া", "Chandpur": "চাঁদপুর", "Chattogram": "চট্টগ্রাম", "Coxs Bazar": "কক্সবাজার", "Cumilla": "কুমিল্লা", "Feni": "ফেনী", "Khagrachhari": "খাগড়াছড়ি", "Lakshmipur": "লক্ষ্মীপুর", "Noakhali": "নোয়াখালী", "Rangamati": "রাঙামাটি",
  "Dhaka": "ঢাকা", "Faridpur": "ফরিদপুর", "Gazipur": "গাজীপুর", "Gopalganj": "গোপালগঞ্জ", "Kishoreganj": "কিশোরগঞ্জ", "Madaripur": "মাদারীপুর", "Manikganj": "মানিকগঞ্জ", "Munshiganj": "মুন্সীগঞ্জ", "Narayanganj": "নারায়ণগঞ্জ", "Narsingdi": "নরসিংদী", "Rajbari": "রাজবাড়ী", "Shariatpur": "শরীয়তপুর", "Tangail": "টাঙ্গাইল",
  "Bagerhat": "বাগেরহাট", "Chuadanga": "চুয়াডাঙ্গা", "Jashore": "যশোর", "Jhenaidah": "ঝিনাইদহ", "Khulna": "খুলনা", "Kushtia": "কুষ্টিয়া", "Magura": "মাগুরা", "Meherpur": "মেহেরপুর", "Narail": "নড়াইল", "Satkhira": "সাতক্ষীরা",
  "Jamalpur": "জামালপুর", "Mymensingh": "ময়মনসিংহ", "Netrokona": "নেত্রকোনা", "Sherpur": "শেরপুর",
  "Bogura": "বগুড়া", "Chapainawabganj": "চাঁপাইনবাবগঞ্জ", "Joypurhat": "জয়পুরহাট", "Naogaon": "নওগাঁ", "Natore": "নাটোর", "Pabna": "পাবনা", "Rajshahi": "রাজশাহী", "Sirajganj": "সিরাজগঞ্জ",
  "Dinajpur": "দিনাজপুর", "Gaibandha": "গাইবান্ধা", "Kurigram": "কুড়িগ্রাম", "Lalmonirhat": "লালমনিরহাট", "Nilphamari": "নীলফামারী", "Panchagarh": "পঞ্চগড়", "Rangpur": "রংপুর", "Thakurgaon": "ঠাকুরগাঁও",
  "Habiganj": "হবিগঞ্জ", "Moulvibazar": "মৌলভীবাজার", "Sunamganj": "সুনামগঞ্জ", "Sylhet": "সিলেট"
};

// --- ক্লায়েন্ট সাইড ইমেজ কম্প্রেশন (Server Storage বাঁচানোর ম্যাজিক) ---
const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // রেজোলিউশন লিমিট করে দেওয়া হলো যাতে মেমোরি ক্র্যাশ না করে
  const maxSize = 800; 
  let targetWidth = pixelCrop.width;
  let targetHeight = pixelCrop.height;

  if (targetWidth > maxSize || targetHeight > maxSize) {
    const ratio = Math.min(maxSize / targetWidth, maxSize / targetHeight);
    targetWidth *= ratio;
    targetHeight *= ratio;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  // ব্রাউজারের মেমোরিতে Blob URL তৈরি (Zero Server Storage)
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(URL.createObjectURL(blob));
    }, "image/jpeg", 0.85); // 85% Quality JPEG for optimal performance
  });
};

export default function PhotoMapPage() {
  const [districtPhotos, setDistrictPhotos] = useState({}); // { "Dhaka": "blob:...", "Sylhet": "blob:..." }
  
  // Customization States
  const [bgColor, setBgColor] = useState(bgColors[0].value);
  const [unvisitedColor, setUnvisitedColor] = useState(unvisitedColors[0].value);
  
  // Cropper States
  const fileInputRef = useRef(null);
  const mapRef = useRef(null);
  const [activeDistrict, setActiveDistrict] = useState(null);
  const [rawImage, setRawImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  const [downloading, setDownloading] = useState(false);
  const [districtOptionsModal, setDistrictOptionsModal] = useState(null); // Clicked district name

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 });
  }, []);

  const handleMapClick = (geo) => {
    const rawName = geo.properties.adm2_name || geo.properties.ADM2_EN || geo.properties.NAME_2 || geo.properties.name || geo.properties.Dist_Name || geo.properties.district;
    const districtName = standardMap[rawName] || rawName;
    setDistrictOptionsModal(districtName);
  };

  const openFileSelector = () => {
    setActiveDistrict(districtOptionsModal);
    setDistrictOptionsModal(null);
    fileInputRef.current.click();
  };

  const removePhoto = () => {
    const updatedPhotos = { ...districtPhotos };
    if (updatedPhotos[districtOptionsModal]) {
      URL.revokeObjectURL(updatedPhotos[districtOptionsModal]); // Memory cleanup
      delete updatedPhotos[districtOptionsModal];
      setDistrictPhotos(updatedPhotos);
    }
    setDistrictOptionsModal(null);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setRawImage(reader.result);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
    e.target.value = null; // Reset input
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCrop = async () => {
    try {
      const croppedBlobUrl = await getCroppedImg(rawImage, croppedAreaPixels);
      
      // Memory cleanup for old photo if replacing
      if (districtPhotos[activeDistrict]) {
        URL.revokeObjectURL(districtPhotos[activeDistrict]);
      }

      setDistrictPhotos(prev => ({
        ...prev,
        [activeDistrict]: croppedBlobUrl
      }));
      
      setRawImage(null);
      setActiveDistrict(null);
    } catch (e) {
      console.error(e);
      alert("ছবি প্রসেস করতে সমস্যা হয়েছে।");
    }
  };

  const handleDownload4K = async () => {
    if (!mapRef.current) return;
    setDownloading(true);
    
    try {
      // 4K Resolution Magic: scale: 4 means it takes the container and multiplies pixels by 4
      const canvas = await html2canvas(mapRef.current, {
        backgroundColor: bgColor, 
        scale: 4, 
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const link = document.createElement("a");
      link.href = imgData;
      link.download = `My-Adventure-PhotoMap-CAS.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error("Download Error:", error);
      alert("৪কে ম্যাপটি ডাউনলোড করতে সমস্যা হয়েছে।");
    } finally {
      setDownloading(false);
    }
  };

  const isDarkBg = bgColor === "#0a1c13" || bgColor === "#0f172a" || bgColor === "#14532d";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-500">
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      {/* 🔴 Cropper Modal */}
      {rawImage && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col isolate">
          <div className="relative flex-1">
            <Cropper
              image={rawImage}
              crop={crop}
              zoom={zoom}
              aspect={1}
              showGrid={true}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="p-6 bg-gray-900 flex flex-wrap justify-between items-center gap-4 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] z-10 border-t border-white/10">
            <button onClick={() => {setRawImage(null); setActiveDistrict(null);}} className="px-5 py-2.5 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-colors">বাতিল</button>
            <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(e.target.value)} className="flex-1 min-w-[150px] accent-emerald-500" />
            <button onClick={handleSaveCrop} className="px-6 py-2.5 bg-campfire hover:bg-orange-600 text-white rounded-xl font-black shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
              <i className="fa-solid fa-crop-simple"></i> ক্রপ করুন
            </button>
          </div>
        </div>
      )}

      {/* 🔴 District Action Modal */}
      {districtOptionsModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDistrictOptionsModal(null)}></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm relative z-10 shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1 text-center">{districtBn[districtOptionsModal] || districtOptionsModal}</h3>
            <p className="text-xs text-gray-500 text-center mb-6">এই জেলার জন্য একটি একশন বেছে নিন</p>
            
            <div className="flex flex-col gap-3">
              <button onClick={openFileSelector} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors">
                <i className="fa-solid fa-camera"></i> {districtPhotos[districtOptionsModal] ? 'ছবি পরিবর্তন করুন' : 'ছবি আপলোড করুন'}
              </button>
              {districtPhotos[districtOptionsModal] && (
                <button onClick={removePhoto} className="w-full bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors border border-red-200 dark:border-transparent">
                  <i className="fa-solid fa-trash-can"></i> ছবি মুছে ফেলুন
                </button>
              )}
              <button onClick={() => setDistrictOptionsModal(null)} className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-3 rounded-xl font-bold mt-2 transition-colors">
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header & Settings Panel */}
        <div className="flex flex-col lg:flex-row gap-8 mb-8" data-aos="fade-down">
          
          <div className="flex-1">
            <Link href="/my-bangladesh" className="inline-flex items-center gap-2 text-gray-500 hover:text-campfire font-bold mb-4 text-sm transition-colors">
              <i className="fa-solid fa-arrow-left"></i> কালার ম্যাপে ফিরে যান
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">
              ফটো <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-blue-500">ম্যাপ</span> স্টুডিও
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">আপনার তোলা ছবি দিয়ে পুরো বাংলাদেশ সাজিয়ে নিন। ম্যাপে ক্লিক করে ছবি আপলোড করুন।</p>
          </div>

          {/* Customization Controls */}
          <div className="flex-1 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="mb-5">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3"><i className="fa-solid fa-fill-drip mr-1"></i> ম্যাপের ব্যাকগ্রাউন্ড কালার:</p>
              <div className="flex flex-wrap gap-3">
                {bgColors.map(color => (
                  <button 
                    key={color.value} 
                    onClick={() => setBgColor(color.value)} 
                    className={`w-8 h-8 rounded-full shadow-md transition-transform border-2 ${bgColor === color.value ? 'scale-125 border-gray-400 dark:border-white' : 'border-transparent hover:scale-110'}`} 
                    style={{ backgroundColor: color.value }} 
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3"><i className="fa-solid fa-palette mr-1"></i> ফাঁকা জেলার রং (আনভিজিটেড):</p>
              <div className="flex flex-wrap gap-3">
                {unvisitedColors.map(color => (
                  <button 
                    key={color.value} 
                    onClick={() => setUnvisitedColor(color.value)} 
                    className={`w-8 h-8 rounded-full shadow-sm transition-transform border-2 ${unvisitedColor === color.value ? 'scale-125 border-gray-400 dark:border-white' : 'border-gray-200 dark:border-gray-600 hover:scale-110'}`} 
                    style={{ backgroundColor: color.value }} 
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 🔴 THE 4K PHOTO MAP CONTAINER */}
        <div className="flex flex-col md:flex-row gap-6">
          
          <div className="flex-grow flex justify-center">
            {/* 
              This div is the one we capture for 4K. 
              Inline styles ensure html2canvas captures exact hex codes.
            */}
            <div 
              ref={mapRef} 
              className="w-full max-w-[600px] aspect-[4/5] relative rounded-3xl overflow-hidden shadow-2xl transition-colors duration-500 flex flex-col"
              style={{ backgroundColor: bgColor }}
              data-aos="zoom-in"
            >
              
              {/* Header inside Map for branding */}
              <div className="absolute top-6 left-0 right-0 z-20 flex flex-col items-center pointer-events-none px-4">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: isDarkBg ? '#ffffff' : '#1e293b' }}>
                  ৬৪ <span className="font-bold text-xl sm:text-2xl opacity-90">জেলা ভ্রমণ</span>
                </h2>
                <div className="h-1 w-12 rounded-full mt-2" style={{ backgroundColor: isDarkBg ? '#10b981' : '#e76f51' }}></div>
              </div>

              {/* The Interactive SVG Map */}
              <div className="w-full h-full flex items-center justify-center flex-1 mt-10">
                <ComposableMap
                  projection="geoMercator"
                  projectionConfig={{ scale: 6500, center: [90.35, 23.8] }}
                  className="w-full h-[110%] outline-none"
                >
                  {/* SVG Definitions for Image Masking */}
                  <defs>
                    {Object.entries(districtPhotos).map(([district, url]) => (
                      <pattern 
                        key={`pattern-${district}`} 
                        id={`pattern-${district}`} 
                        width="100%" 
                        height="100%" 
                        patternContentUnits="objectBoundingBox"
                      >
                        <image 
                          href={url} 
                          preserveAspectRatio="xMidYMid slice" 
                          width="1" 
                          height="1" 
                        />
                      </pattern>
                    ))}
                  </defs>

                  <Geographies geography={geoUrl}>
                    {({ geographies }) => (
                      <>
                        {geographies.map((geo) => {
                          const rawName = geo.properties.adm2_name || geo.properties.ADM2_EN || geo.properties.NAME_2 || geo.properties.name || geo.properties.Dist_Name || geo.properties.district;
                          const districtName = standardMap[rawName] || rawName;
                          const hasPhoto = !!districtPhotos[districtName];

                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              onClick={() => handleMapClick(geo)}
                              style={{
                                default: {
                                  // Magic: If photo exists, fill with SVG pattern url. Else fill with unvisitedColor.
                                  fill: hasPhoto ? `url(#pattern-${districtName})` : unvisitedColor,
                                  outline: "none",
                                  stroke: isDarkBg ? "rgba(255,255,255,0.4)" : "#ffffff",
                                  strokeWidth: hasPhoto ? 1.5 : 1,
                                  transition: "all 0.3s ease"
                                },
                                hover: {
                                  fill: hasPhoto ? `url(#pattern-${districtName})` : "#94a3b8",
                                  outline: "none",
                                  stroke: isDarkBg ? "#ffffff" : "#1e293b",
                                  strokeWidth: 2,
                                  cursor: "pointer"
                                }
                              }}
                            />
                          );
                        })}
                      </>
                    )}
                  </Geographies>
                </ComposableMap>
              </div>

              {/* Footer Quote inside Map */}
              <div className="absolute bottom-6 left-6 right-6 z-20 pointer-events-none">
                <p className="text-xs sm:text-sm font-bold leading-tight" style={{ color: isDarkBg ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)' }}>
                  ভ্রমণ ছিল অজুহাত, পথ বদলেছে বারবার—<br/>
                  আসল উদ্দেশ্য ছিল <span style={{ color: isDarkBg ? '#10b981' : '#e76f51' }}>আমার বাংলাদেশ</span> কে দেখা।
                </p>
                <p className="text-[8px] sm:text-[9px] font-black tracking-widest uppercase mt-3 opacity-60" style={{ color: isDarkBg ? '#ffffff' : '#000000' }}>
                  Generated by CUET Adventure Society
                </p>
              </div>

            </div>
          </div>

          {/* Right Action Panel */}
          <div className="w-full md:w-72 flex flex-col gap-4 shrink-0" data-aos="fade-left">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 text-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                <i className="fa-solid fa-images"></i>
              </div>
              <h3 className="text-4xl font-black text-gray-900 dark:text-white">{e2b(Object.keys(districtPhotos).length)}</h3>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">ছবি যুক্ত করা হয়েছে</p>
            </div>

            <button 
              onClick={handleDownload4K} 
              disabled={downloading || Object.keys(districtPhotos).length === 0}
              className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest flex justify-center items-center gap-2 transition-all shadow-md ${downloading || Object.keys(districtPhotos).length === 0 ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white hover:shadow-[0_5px_20px_rgba(16,185,129,0.4)] hover:-translate-y-0.5'}`}
            >
              {downloading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-download"></i>}
              {downloading ? "প্রসেসিং হচ্ছে..." : "৪কে (4K) ডাউনলোড"}
            </button>

            {Object.keys(districtPhotos).length > 0 && (
              <button 
                onClick={() => {
                  if(window.confirm("আপনি কি নিশ্চিত যে সব ছবি মুছে ফেলতে চান?")) {
                    Object.values(districtPhotos).forEach(url => URL.revokeObjectURL(url));
                    setDistrictPhotos({});
                  }
                }}
                className="w-full py-3 rounded-xl font-bold text-xs text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors border border-red-200 dark:border-transparent"
              >
                <i className="fa-solid fa-trash-can mr-1"></i> সব ছবি মুছে ফেলুন
              </button>
            )}

            <div className="bg-yellow-50 dark:bg-yellow-500/10 p-4 rounded-xl border border-yellow-200 dark:border-yellow-500/30 mt-auto">
              <p className="text-xs text-yellow-800 dark:text-yellow-500 font-medium leading-relaxed">
                <i className="fa-solid fa-lightbulb text-yellow-500 mr-1"></i> <strong>টিপস:</strong> ম্যাপের যেকোনো জেলার উপর ক্লিক করে আপনার ওই জেলার সেরা ছবিটি আপলোড করুন। আপনার ডিভাইস রিস্টার্ট বা পেজ রিলোড দিলে ছবিগুলো মুছে যাবে।
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
