"use client";
import { useState, useEffect, useRef, useCallback, memo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import Link from "next/link";
import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";
import AOS from "aos";
import "aos/dist/aos.css";
import Cropper from "react-easy-crop";

const geoUrl = "/bd-districts.topo.json";

const bgColors = [
  { name: "ক্লাসিক হোয়াইট", value: "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)", isDark: false },
  { name: "ডার্ক ফরেস্ট", value: "linear-gradient(135deg, #0f3420 0%, #06180e 100%)", isDark: true },
  { name: "ডিপ ওশান", value: "linear-gradient(135deg, #0f172a 0%, #020617 100%)", isDark: true },
  { name: "সানসেট অরেঞ্জ", value: "linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)", isDark: false },
  { name: "রয়্যাল ব্লু", value: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)", isDark: true },
  { name: "চেরি রেড", value: "linear-gradient(135deg, #870000 0%, #190a05 100%)", isDark: true },
  { name: "ম্যাজিক পার্পল", value: "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)", isDark: true },
  { name: "ন্যাচার গ্রিন", value: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)", isDark: false },
];

const unvisitedColors = [
  { name: "হালকা অ্যাশ", value: "#e2e8f0" },
  { name: "সফট পিচ", value: "#ffedd5" },
  { name: "হালকা নীল", value: "#e0f2fe" },
  { name: "মিন্ট গ্রিন", value: "#d1fae5" },
  { name: "সাদা", value: "#ffffff" },
  { name: "ডার্ক গ্রে", value: "#1e293b" }
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

const bangladeshDivisions = [
  { name: "ঢাকা", districts: ["Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail"] },
  { name: "চট্টগ্রাম", districts: ["Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cox's Bazar", "Cumilla", "Feni", "Khagrachhari", "Lakshmipur", "Noakhali", "Rangamati"] },
  { name: "সিলেট", districts: ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"] },
  { name: "খুলনা", districts: ["Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna", "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira"] },
  { name: "রাজশাহী", districts: ["Bogura", "Chapainawabganj", "Joypurhat", "Naogaon", "Natore", "Pabna", "Rajshahi", "Sirajganj"] },
  { name: "রংপুর", districts: ["Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon"] },
  { name: "বরিশাল", districts: ["Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"] },
  { name: "ময়মনসিংহ", districts: ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"] }
];

const loadImageWithEXIF = async (file) => {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.95);
  } catch (err) {
    console.warn("createImageBitmap not supported, using fallback", err);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }
};

const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const maxSize = 1200; 
  let targetWidth = pixelCrop.width;
  let targetHeight = pixelCrop.height;

  if (targetWidth > maxSize || targetHeight > maxSize) {
    const ratio = Math.min(maxSize / targetWidth, maxSize / targetHeight);
    targetWidth *= ratio;
    targetHeight *= ratio;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, targetWidth, targetHeight);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(URL.createObjectURL(blob));
    }, "image/jpeg", 0.92);
  });
};

const blobToBase64 = async (blobUrl) => {
  try {
    const response = await fetch(blobUrl);
    if (!response.ok) throw new Error("Fetch failed for " + blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("blobToBase64 error:", err);
    return null;
  }
};

const MemoizedGeography = memo(({ geo, districtName, hasPhoto, unvisitedColor, isDarkBg, onClick }) => {
  // 🔴 FIX: বর্ডার ভিজিবিলিটি ফিক্স করা হয়েছে। আনভিজিটেড কালার ডার্ক হলে বর্ডার সাদা, নাহলে হালকা কালো হবে।
  const isDarkUnvisited = unvisitedColor === "#1e293b"; 
  const strokeColor = hasPhoto ? "rgba(255,255,255,0.8)" : (isDarkUnvisited ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.2)");

  return (
    <Geography
      geography={geo}
      onClick={() => onClick(geo, districtName)}
      style={{
        default: {
          fill: hasPhoto ? `url(#pattern-${districtName})` : unvisitedColor,
          outline: "none",
          stroke: strokeColor,
          strokeWidth: hasPhoto ? 1.5 : 0.8,
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
}, (prevProps, nextProps) => {
  return prevProps.geo === nextProps.geo &&
         prevProps.hasPhoto === nextProps.hasPhoto && 
         prevProps.unvisitedColor === nextProps.unvisitedColor && 
         prevProps.isDarkBg === nextProps.isDarkBg;
});
MemoizedGeography.displayName = 'MemoizedGeography';

export default function PhotoMapPage() {
  const [districtPhotos, setDistrictPhotos] = useState({}); 
  const photosRef = useRef(districtPhotos); 
  
  const [bgColor, setBgColor] = useState(bgColors[0].value);
  const [unvisitedColor, setUnvisitedColor] = useState(unvisitedColors[0].value);
  
  const fileInputRef = useRef(null);
  const mapRef = useRef(null);
  const [activeDistrict, setActiveDistrict] = useState(null);
  const [rawImage, setRawImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  const [downloading, setDownloading] = useState(false);
  const [districtOptionsModal, setDistrictOptionsModal] = useState(null); 
  const [mapZoom, setMapZoom] = useState(1);

  const isDarkBg = bgColors.find(c => c.value === bgColor)?.isDark ?? true;

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 });
    return () => {
      Object.values(photosRef.current).forEach(url => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, []);

  useEffect(() => {
    photosRef.current = districtPhotos;
  }, [districtPhotos]);

  const handleMapClick = useCallback((geo, districtName) => {
    setDistrictOptionsModal(districtName);
  }, []);

  const openFileSelector = () => {
    setActiveDistrict(districtOptionsModal);
    setDistrictOptionsModal(null);
    fileInputRef.current.click();
  };

  const removePhoto = () => {
    const updatedPhotos = { ...districtPhotos };
    const target = updatedPhotos[districtOptionsModal];

    if (target) {
      if (target.startsWith('blob:')) {
        URL.revokeObjectURL(target);
      }
      delete updatedPhotos[districtOptionsModal];
      setDistrictPhotos(updatedPhotos);
    }
    setDistrictOptionsModal(null);
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 8 * 1024 * 1024) {
        alert("ফাইল সাইজ ৮ MB এর কম হতে হবে।");
        e.target.value = null;
        return;
      }
      
      const correctedImage = await loadImageWithEXIF(file);
      setRawImage(correctedImage);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
    e.target.value = null; 
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCrop = async () => {
    try {
      const blobUrl = await getCroppedImg(rawImage, croppedAreaPixels);
      
      if (districtPhotos[activeDistrict] && districtPhotos[activeDistrict].startsWith('blob:')) {
        URL.revokeObjectURL(districtPhotos[activeDistrict]); 
      }

      setDistrictPhotos(prev => ({ ...prev, [activeDistrict]: blobUrl }));
      setRawImage(null);
      setActiveDistrict(null);
    } catch (e) {
      console.error(e);
      alert("ছবি প্রসেস করতে সমস্যা হয়েছে।");
    }
  };

  // 🔴 FIX: JPG এবং PDF ডাউনলোডের ব্যবস্থা
  const handleDownloadMap = async (format) => {
    if (!mapRef.current) return;
    setDownloading(true);
    
    const originalUrls = { ...districtPhotos };
    const originalZoom = mapZoom; 
    setMapZoom(1); 
    
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    try {
      const base64Photos = {};
      for (const district in originalUrls) {
        if (originalUrls[district].startsWith('blob:')) {
          const b64 = await blobToBase64(originalUrls[district]);
          if (b64) base64Photos[district] = b64;
        } else {
          base64Photos[district] = originalUrls[district];
        }
      }
      
      setDistrictPhotos(base64Photos);
      await new Promise(resolve => setTimeout(resolve, 800)); 

      const imgData = await toJpeg(mapRef.current, {
        quality: 1.0,
        backgroundColor: "transparent",
        pixelRatio: 4, 
        cacheBust: false,
      });
      
      const fileName = `My-Adventure-PhotoMap-CAS`;

      if (format === 'jpg') {
        const link = document.createElement("a");
        link.href = imgData;
        link.download = `${fileName}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (format === 'pdf') {
        // PDF Export Logic
        const canvasWidth = mapRef.current.offsetWidth * 4;
        const canvasHeight = mapRef.current.offsetHeight * 4;
        const pdf = new jsPDF({
          orientation: canvasWidth > canvasHeight ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvasWidth, canvasHeight]
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, canvasWidth, canvasHeight);
        pdf.save(`${fileName}.pdf`);
      }
      
    } catch (error) {
      console.error("Download Error:", error);
      alert("ম্যাপটি ডাউনলোড করতে সমস্যা হয়েছে।");
    } finally {
      setDistrictPhotos(originalUrls);
      setMapZoom(originalZoom); 
      setDownloading(false);
    }
  };

  const handleZoomIn = () => setMapZoom(prev => Math.min(prev + 0.3, 3));
  const handleZoomOut = () => setMapZoom(prev => Math.max(prev - 0.3, 1));

  const resetColors = () => {
    setBgColor(bgColors[0].value);
    setUnvisitedColor(unvisitedColors[0].value);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-500">
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      {/* Cropper Modal */}
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
              objectFit="contain"
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

      {/* District Action Modal */}
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

      <div className="max-w-6xl mx-auto relative z-10 flex flex-col gap-10">
        
        {/* 🔴 সেকশন ১: ইন্ট্রো এবং সেটিংস */}
        <div className="flex flex-col lg:flex-row gap-8" data-aos="fade-down">
          <div className="flex-1">
            <Link href="/my-bangladesh" className="inline-flex items-center gap-2 text-gray-500 hover:text-campfire font-bold mb-4 text-sm transition-colors">
              <i className="fa-solid fa-arrow-left"></i> কালার ম্যাপে ফিরে যান
            </Link>
            <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tight leading-tight">
              আপনার নিজস্ব <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-blue-500">ফটো ম্যাপ</span> তৈরি করুন
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <i className="fa-solid fa-circle-info text-blue-500 mr-2"></i>
              নিচের তালিকা থেকে আপনার ভ্রমণ করা জেলাগুলো নির্বাচন করে সেরা স্মৃতিগুলো আপলোড করুন। এরপর সবার নিচে থাকা ম্যাপ থেকে আপনার কাস্টমাইজড 4K ছবি বা PDF ডাউনলোড করে নিন!
            </p>
          </div>

          <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-200 dark:border-gray-700 relative">
            <div className="mb-6">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3"><i className="fa-solid fa-fill-drip mr-1"></i> ম্যাপের ব্যাকগ্রাউন্ড কালার:</p>
              <div className="flex flex-wrap gap-3">
                {bgColors.map(color => (
                  <button 
                    key={color.value} 
                    onClick={() => setBgColor(color.value)} 
                    className={`w-9 h-9 rounded-full shadow-md transition-transform border-2 ${bgColor === color.value ? 'scale-125 border-gray-400 dark:border-white' : 'border-transparent hover:scale-110'}`} 
                    style={{ background: color.value }} 
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest"><i className="fa-solid fa-palette mr-1"></i> ফাঁকা জেলার রং:</p>
                <button onClick={resetColors} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center">
                  <i className="fa-solid fa-rotate-left mr-1"></i> রিসেট
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {unvisitedColors.map(color => (
                  <button 
                    key={color.value} 
                    onClick={() => setUnvisitedColor(color.value)} 
                    className={`w-9 h-9 rounded-full shadow-sm transition-transform border-2 ${unvisitedColor === color.value ? 'scale-125 border-gray-400 dark:border-white' : 'border-gray-200 dark:border-gray-600 hover:scale-110'}`} 
                    style={{ backgroundColor: color.value }} 
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 🔴 সেকশন ২: জেলা নির্বাচনের তালিকা (ইউজার ফ্লো ফিক্স) */}
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-[2rem] border border-gray-200 dark:border-gray-700 shadow-sm" data-aos="fade-up">
          <h3 className="text-xl font-black mb-6 text-gray-900 dark:text-white flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
            <i className="fa-solid fa-list-check text-emerald-500"></i> জেলা নির্বাচন করে ছবি দিন
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {bangladeshDivisions.map((division) => {
              const divVisitedCount = division.districts.filter(d => !!districtPhotos[d]).length;
              
              return (
                <div key={division.name} className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-3">
                    <h4 className="font-black text-gray-800 dark:text-white text-lg">{division.name}</h4>
                    <span className="text-xs font-bold px-2 py-1 rounded-md bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm">
                      <span className={divVisitedCount > 0 ? 'text-emerald-500' : ''}>{e2b(divVisitedCount)}</span> / {e2b(division.districts.length)}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {division.districts.map(dist => {
                      const hasPhoto = !!districtPhotos[dist];
                      const bngName = districtBn[dist] || dist;
                      
                      return (
                        <button 
                          key={dist} 
                          onClick={() => setDistrictOptionsModal(dist)}
                          className={`flex items-center gap-2 cursor-pointer group px-3 py-1.5 rounded-full border transition-all duration-300 ${hasPhoto ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 shadow-sm' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500/50'}`}
                        >
                          <div className={`flex items-center justify-center ${hasPhoto ? 'text-emerald-500' : 'text-gray-400 group-hover:text-emerald-400'}`}>
                            {hasPhoto ? <i className="fa-solid fa-circle-check text-xs"></i> : <i className="fa-solid fa-camera text-[10px]"></i>}
                          </div>
                          <span className={`text-xs font-bold ${hasPhoto ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200'}`}>
                            {bngName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 🔴 সেকশন ৩: জেনারেটেড ম্যাপ এবং ডাউনলোড (সবার নিচে) */}
        <div className="flex flex-col md:flex-row gap-6 items-start" data-aos="fade-up">
          <div className="flex-grow flex justify-center relative w-full">
            
            <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
              <button onClick={handleZoomIn} className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 hover:bg-gray-50">
                <i className="fa-solid fa-plus"></i>
              </button>
              <button onClick={handleZoomOut} className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 hover:bg-gray-50">
                <i className="fa-solid fa-minus"></i>
              </button>
            </div>

            <div 
              ref={mapRef} 
              className="w-full max-w-[650px] aspect-[4/5] relative rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500 flex flex-col"
              style={{ background: bgColor }}
            >
              <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none z-0" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)' }}></div>
              <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none z-0" style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 70%)' }}></div>

              <div className="absolute top-6 left-0 right-0 z-20 flex flex-col items-center pointer-events-none px-4">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: isDarkBg ? '#ffffff' : '#1e293b' }}>
                  ৬৪ <span className="font-bold text-xl sm:text-2xl opacity-90">জেলা ভ্রমণ</span>
                </h2>
                <div className="h-1 w-12 rounded-full mt-2" style={{ backgroundColor: isDarkBg ? '#10b981' : '#e76f51' }}></div>
              </div>

              <div className="w-full h-full flex items-center justify-center flex-1 mt-10 z-10 relative">
                <div 
                  className="w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
                  style={{ transform: `scale(${mapZoom})`, transformOrigin: "center" }}
                >
                  <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{ scale: 6500, center: [90.35, 23.8] }}
                    className="w-full h-[110%] outline-none"
                  >
                    <defs>
                      {Object.entries(districtPhotos).map(([district, url]) => (
                        <pattern key={`pattern-${district}`} id={`pattern-${district}`} width="100%" height="100%" patternContentUnits="objectBoundingBox" preserveAspectRatio="xMidYMid slice">
                          <image href={url} preserveAspectRatio="xMidYMid slice" width="1" height="1" />
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
                              <MemoizedGeography
                                key={geo.rsmKey}
                                geo={geo}
                                districtName={districtName}
                                hasPhoto={hasPhoto}
                                unvisitedColor={unvisitedColor}
                                isDarkBg={isDarkBg}
                                onClick={handleMapClick}
                              />
                            );
                          })}
                        </>
                      )}
                    </Geographies>
                  </ComposableMap>
                </div>
              </div>

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

          <div className="w-full md:w-80 flex flex-col gap-4 shrink-0">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 text-center">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                <i className="fa-solid fa-map-location-dot"></i>
              </div>
              <h3 className="text-4xl font-black text-gray-900 dark:text-white">{e2b(Object.keys(districtPhotos).length)} <span className="text-base text-gray-400">/ ৬৪</span></h3>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">জেলায় ছবি যুক্ত হয়েছে</p>
            </div>

            <button 
              onClick={() => handleDownloadMap('jpg')} 
              disabled={downloading || Object.keys(districtPhotos).length === 0}
              className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest flex justify-center items-center gap-2 transition-all shadow-md ${downloading || Object.keys(districtPhotos).length === 0 ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white hover:shadow-[0_5px_20px_rgba(16,185,129,0.4)] hover:-translate-y-0.5'}`}
            >
              {downloading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-image"></i>}
              {downloading ? "প্রসেসিং হচ্ছে..." : "JPG ডাউনলোড"}
            </button>

            <button 
              onClick={() => handleDownloadMap('pdf')} 
              disabled={downloading || Object.keys(districtPhotos).length === 0}
              className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest flex justify-center items-center gap-2 transition-all shadow-md ${downloading || Object.keys(districtPhotos).length === 0 ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-[0_5px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5'}`}
            >
              {downloading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-file-pdf"></i>}
              {downloading ? "প্রসেসিং হচ্ছে..." : "PDF ডাউনলোড"}
            </button>

            {Object.keys(districtPhotos).length > 0 && (
              <button 
                onClick={() => {
                  if(window.confirm("আপনি কি নিশ্চিত যে সব ছবি মুছে ফেলতে চান?")) {
                    Object.values(districtPhotos).forEach(url => {
                      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                    });
                    setDistrictPhotos({});
                  }
                }}
                className="w-full py-3 rounded-xl font-bold text-xs text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors border border-red-200 dark:border-transparent mt-2"
              >
                <i className="fa-solid fa-trash-can mr-1"></i> সব ছবি মুছে ফেলুন
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
