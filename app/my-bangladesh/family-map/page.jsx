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

// ============================================
// LOCAL STORAGE
// ============================================
const STORAGE_KEY = "family-map-data-v1";
const STORAGE_LIMIT_MB = 4.5;

const loadFromStorage = () => {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Storage load failed:", e);
    return null;
  }
};

const saveToStorage = (data) => {
  try {
    const json = JSON.stringify(data);
    const sizeMB = new Blob([json]).size / (1024 * 1024);
    if (sizeMB > STORAGE_LIMIT_MB) return { success: false, reason: "quota", size: sizeMB };
    localStorage.setItem(STORAGE_KEY, json);
    return { success: true, size: sizeMB };
  } catch (e) {
    if (e.name === "QuotaExceededError") return { success: false, reason: "quota" };
    return { success: false, reason: "unknown", error: e.message };
  }
};

const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch { return false; }
};

const getStorageSize = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    return new Blob([raw]).size / (1024 * 1024);
  } catch { return 0; }
};

// ============================================
// BACKGROUND COLORS
// ============================================
const bgColors = [
  { name: "ক্লাসিক হোয়াইট", value: "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)", isDark: false },
  { name: "সফট ক্লাউড", value: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)", isDark: false },
  { name: "সানরাইজ পিচ", value: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)", isDark: false },
  { name: "ফ্রেশ মিন্ট", value: "linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)", isDark: false },
  { name: "রোজ মিল্ক", value: "linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)", isDark: false },
  { name: "ন্যাচার গ্রিন", value: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)", isDark: false },
  { name: "সানসেট অরেঞ্জ", value: "linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)", isDark: false },
  { name: "রয়্যাল ব্লু", value: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)", isDark: true },
  { name: "ডার্ক ফরেস্ট", value: "linear-gradient(135deg, #0f3420 0%, #06180e 100%)", isDark: true },
  { name: "ডিপ ওশান", value: "linear-gradient(135deg, #0f172a 0%, #020617 100%)", isDark: true },
  { name: "ম্যাজিক পার্পল", value: "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)", isDark: true },
  { name: "চেরি রেড", value: "linear-gradient(135deg, #870000 0%, #190a05 100%)", isDark: true },
];

const unvisitedColors = [
  { name: "হালকা অ্যাশ", value: "#e2e8f0" },
  { name: "সফট পিচ", value: "#ffedd5" },
  { name: "হালকা নীল", value: "#e0f2fe" },
  { name: "মিন্ট গ্রিন", value: "#d1fae5" },
  { name: "সাদা", value: "#ffffff" },
  { name: "ডার্ক গ্রে", value: "#1e293b" }
];

// ============================================
// FAMILY SIDES
// ============================================
const sideColors = {
  paternal: { value: "#3b82f6", label: "বাবার দিকের আত্মীয়" },
  maternal: { value: "#ec4899", label: "মায়ের দিকের আত্মীয়" },
  both:     { value: "#a855f7", label: "উভয় দিকের আত্মীয়" },
  own:      { value: "#10b981", label: "নিজ প্রজন্মের আত্মীয়" },
  in_law:   { value: "#f59e0b", label: "শ্বশুরবাড়ির আত্মীয়" },
  other:    { value: "#64748b", label: "অন্যান্য আত্মীয়" },
};

// ============================================
// FAMILY RELATIONS
// ============================================
const familyRelations = [
  { key: "father",       bn: "বাবা",   side: "paternal" },
  { key: "grandfather_p",bn: "দাদা",   side: "paternal" },
  { key: "grandmother_p",bn: "দাদি",   side: "paternal" },
  { key: "uncle_p",      bn: "চাচা",   side: "paternal" },
  { key: "aunt_p",       bn: "চাচি",   side: "paternal" },
  { key: "aunt_p2",      bn: "ফুফু",   side: "paternal" },
  { key: "uncle_p2",     bn: "ফুফা",   side: "paternal" },
  { key: "mother",       bn: "মা",     side: "maternal" },
  { key: "grandfather_m",bn: "নানা",   side: "maternal" },
  { key: "grandmother_m",bn: "নানি",   side: "maternal" },
  { key: "uncle_m",      bn: "মামা",   side: "maternal" },
  { key: "aunt_m",       bn: "মামি",   side: "maternal" },
  { key: "aunt_m2",      bn: "খালা",   side: "maternal" },
  { key: "uncle_m2",     bn: "খালু",   side: "maternal" },
  { key: "brother",      bn: "ভাই",    side: "own" },
  { key: "sister",       bn: "বোন",    side: "own" },
  { key: "cousin",       bn: "কাজিন",  side: "own" },
  { key: "father_in_law",bn: "শ্বশুর",  side: "in_law" },
  { key: "mother_in_law",bn: "শাশুড়ি", side: "in_law" },
  { key: "other",        bn: "অন্যান্য",side: "other" },
];

const getRelationLabel = (key) => familyRelations.find(r => r.key === key)?.bn || key;
const getRelationSide = (key) => familyRelations.find(r => r.key === key)?.side || "other";

// ============================================
// HELPERS
// ============================================
const e2b = (num) => String(num).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const safeSvgId = (name) => String(name).replace(/[^a-zA-Z0-9]/g, '_');

const standardMap = {
  "Chapainababganj": "Chapainawabganj", "Nawabganj": "Chapainawabganj", "Netrakona": "Netrokona",
  "Panchagar": "Panchagarh", "Bramhanbaria": "Brahmanbaria", "Chittagong": "Chattogram", "Coxs Bazar": "Cox's Bazar"
};

const districtBn = {
  "Barguna": "বরগুনা", "Barishal": "বরিশাল", "Bhola": "ভোলা", "Jhalokati": "ঝালকাঠি", "Patuakhali": "পটুয়াখালী", "Pirojpur": "পিরোজপুর",
  "Bandarban": "বান্দরবান", "Brahmanbaria": "ব্রাহ্মণবাড়িয়া", "Chandpur": "চাঁদপুর", "Chattogram": "চট্টগ্রাম", "Cox's Bazar": "কক্সবাজার", "Cumilla": "কুমিল্লা", "Feni": "ফেনী", "Khagrachhari": "খাগড়াছড়ি", "Lakshmipur": "লক্ষ্মীপুর", "Noakhali": "নোয়াখালী", "Rangamati": "রাঙামাটি",
  "Dhaka": "ঢাকা", "Faridpur": "ফরিদপুর", "Gazipur": "গাজীপুর", "Gopalganj": "গোপালগঞ্জ", "Kishoreganj": "কিশোরগঞ্জ", "Madaripur": "মাদারীপুর", "Manikganj": "মানিকগঞ্জ", "Munshiganj": "মুন্সীগঞ্জ", "Narayanganj": "নারায়ণগঞ্জ", "Narsingdi": "নরসিংদী", "Rajbari": "রাজবাড়ী", "Shariatpur": "শরীয়তপুর", "Tangail": "টাঙ্গাইল",
  "Bagerhat": "বাগেরহাট", "Chuadanga": "চুয়াডাঙ্গা", "Jashore": "যশোর", "Jhenaidah": "ঝিনাইদহ", "Khulna": "খুলনা", "Kushtia": "কুষ্টিয়া", "Magura": "মাগুরা", "Meherpur": "মেহেরপুর", "Narail": "নড়াইল", "Satkhira": "সাতক্ষীরা",
  "Jamalpur": "জামালপুর", "Mymensingh": "ময়মনসিংহ", "Netrokona": "নেত্রকোনা", "Sherpur": "শেরপুর",
  "Bogura": "বগুড়া", "Chapainawabganj": "চাঁপাইনবাবগঞ্জ", "Joypurhat": "জয়পুরহাট", "Naogaon": "নওগাঁ", "Natore": "নাটোর", "Pabna": "পাবনা", "Rajshahi": "রাজশাহী", "Sirajganj": "সিরাজগঞ্জ",
  "Dinajpur": "দিনাজপুর", "Gaibandha": "গাইবান্ধা", "Kurigram": "কুড়িগ্রাম", "Lalmonirhat": "লালমনিরহাট", "Nilphamari": "নীলফামারী", "Panchagarh": "পঞ্চগড়", "Rangpur": "রংপুর", "Thakurgaon": "ঠাকুরগাঁও",
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
  { name: "ময়মনসিংহ", districts: ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"] }
];

// ============================================
// IMAGE PROCESSING
// ============================================
const loadImageWithEXIF = async (file) => {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.95);
  } catch (err) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }
};

const getCroppedImg = async (imageSrc, pixelCrop, maxSize = 300, quality = 0.75) => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

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

  return canvas.toDataURL("image/jpeg", quality);
};

// ============================================
// DOMINANT SIDE
// ============================================
const getDominantSide = (members) => {
  if (!members || members.length === 0) return null;
  const sides = new Set(members.map(m => getRelationSide(m.relation)));
  if (sides.has("paternal") && sides.has("maternal")) return "both";
  if (sides.has("paternal")) return "paternal";
  if (sides.has("maternal")) return "maternal";
  if (sides.has("own")) return "own";
  if (sides.has("in_law")) return "in_law";
  if (sides.has("other")) return "other";
  return null;
};

// ============================================
// MEMOIZED GEOGRAPHY
// ============================================
const MemoizedGeography = memo(({ geo, districtName, fillColor, patternUrl, strokeColor, isDarkBg, onClick, hoverStroke }) => {
  const fill = patternUrl ? `url(#pattern-${safeSvgId(districtName)})` : fillColor;

  return (
    <Geography
      geography={geo}
      onClick={() => onClick(districtName)}
      style={{
        default: {
          fill,
          outline: "none",
          stroke: strokeColor,
          strokeWidth: patternUrl ? 1.2 : 0.7,
          transition: "all 0.3s ease"
        },
        hover: {
          fill: patternUrl ? `url(#pattern-${safeSvgId(districtName)})` : "#475569",
          outline: "none",
          stroke: hoverStroke,
          strokeWidth: 2,
          cursor: "pointer"
        }
      }}
    />
  );
}, (prev, next) => {
  return prev.geo === next.geo &&
         prev.fillColor === next.fillColor &&
         prev.patternUrl === next.patternUrl &&
         prev.strokeColor === next.strokeColor &&
         prev.isDarkBg === next.isDarkBg;
});
MemoizedGeography.displayName = 'MemoizedGeography';

// ============================================
// MAIN COMPONENT
// ============================================
export default function FamilyMapPage() {
  const [familyData, setFamilyData] = useState({});
  const isInitialMount = useRef(true);
  const saveTimeoutRef = useRef(null);
  const [storageStatus, setStorageStatus] = useState({ size: 0, error: null });

  const [bgColor, setBgColor] = useState(bgColors[0].value);
  const [unvisitedColor, setUnvisitedColor] = useState(unvisitedColors[0].value);
  const [viewMode, setViewMode] = useState("sides");

  const fileInputRef = useRef(null);
  const mapRef = useRef(null);
  const [mapZoom, setMapZoom] = useState(1);

  const [familyModalDistrict, setFamilyModalDistrict] = useState(null);
  const [modalMode, setModalMode] = useState("list");
  const [editingId, setEditingId] = useState(null);

  const [formName, setFormName] = useState("");
  const [formRelation, setFormRelation] = useState("father");
  const [formPhoto, setFormPhoto] = useState(null);

  const [rawImage, setRawImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [downloading, setDownloading] = useState(false);

  const isDarkBg = bgColors.find(c => c.value === bgColor)?.isDark ?? true;

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 });
    const saved = loadFromStorage();
    if (saved && typeof saved === "object") {
      setFamilyData(saved);
      setStorageStatus({ size: getStorageSize(), error: null });
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const result = saveToStorage(familyData);
      if (result.success) {
        setStorageStatus({ size: result.size, error: null });
      } else {
        setStorageStatus(prev => ({ ...prev, error: result.reason }));
      }
    }, 800);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [familyData]);

  const stats = (() => {
    let total = 0, paternal = 0, maternal = 0, own = 0, inLaw = 0;
    Object.values(familyData).forEach(members => {
      members.forEach(m => {
        total++;
        const side = getRelationSide(m.relation);
        if (side === "paternal") paternal++;
        else if (side === "maternal") maternal++;
        else if (side === "own") own++;
        else if (side === "in_law") inLaw++;
      });
    });
    return { total, paternal, maternal, own, inLaw, districts: Object.keys(familyData).length };
  })();

  const percentage = Math.round((stats.districts / 64) * 100);

  const openDistrictModal = useCallback((districtName) => {
    setFamilyModalDistrict(districtName);
    setModalMode("list");
    setEditingId(null);
  }, []);

  const closeModal = () => {
    setFamilyModalDistrict(null);
    setModalMode("list");
    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setFormName("");
    setFormRelation("father");
    setFormPhoto(null);
    setEditingId(null);
  };

  const startAddMember = () => {
    resetForm();
    setModalMode("form");
  };

  const startEditMember = (member) => {
    setFormName(member.name);
    setFormRelation(member.relation);
    setFormPhoto(member.photo);
    setEditingId(member.id);
    setModalMode("form");
  };

  const saveMember = () => {
    if (!formName.trim()) {
      alert("আত্মীয়ের নাম দিন");
      return;
    }
    const district = familyModalDistrict;
    setFamilyData(prev => {
      const existing = prev[district] || [];
      if (editingId) {
        return {
          ...prev,
          [district]: existing.map(m => m.id === editingId ? { ...m, name: formName.trim(), relation: formRelation, photo: formPhoto } : m)
        };
      } else {
        const newMember = {
          id: Date.now().toString(),
          name: formName.trim(),
          relation: formRelation,
          photo: formPhoto
        };
        return { ...prev, [district]: [...existing, newMember] };
      }
    });
    setModalMode("list");
    resetForm();
  };

  const deleteMember = (memberId) => {
    if (!window.confirm("এই আত্মীয়কে মুছে ফেলবেন?")) return;
    const district = familyModalDistrict;
    setFamilyData(prev => {
      const existing = prev[district] || [];
      const updated = existing.filter(m => m.id !== memberId);
      const newData = { ...prev };
      if (updated.length === 0) delete newData[district];
      else newData[district] = updated;
      return newData;
    });
  };

  const deleteAllInDistrict = () => {
    if (!window.confirm("এই জেলার সব আত্মীয় মুছে ফেলবেন?")) return;
    const district = familyModalDistrict;
    setFamilyData(prev => {
      const nd = { ...prev };
      delete nd[district];
      return nd;
    });
    closeModal();
  };

  const handlePhotoClick = () => fileInputRef.current.click();

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 8 * 1024 * 1024) {
        alert("ফাইল সাইজ ৮ MB এর কম হতে হবে।");
        e.target.value = null;
        return;
      }
      const corrected = await loadImageWithEXIF(file);
      setRawImage(corrected);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
    e.target.value = null;
  };

  const onCropComplete = useCallback((ca, cap) => setCroppedAreaPixels(cap), []);

  const handleSaveCrop = async () => {
    try {
      const base64Image = await getCroppedImg(rawImage, croppedAreaPixels, 300, 0.75);
      setFormPhoto(base64Image);
      setRawImage(null);
    } catch (e) {
      alert("ছবি প্রসেস করতে সমস্যা হয়েছে।");
    }
  };

  const removeFormPhoto = () => setFormPhoto(null);

  const handleDownload = async (format) => {
    if (!mapRef.current) return;
    setDownloading(true);
    const originalZoom = mapZoom;
    setMapZoom(1);
    await new Promise(r => setTimeout(r, 500));

    try {
      const imgData = await toJpeg(mapRef.current, {
        quality: 1.0,
        backgroundColor: "transparent",
        pixelRatio: 5,
        cacheBust: false,
      });

      const fileName = `My-Family-Map-CAS`;

      if (format === 'jpg') {
        const link = document.createElement("a");
        link.href = imgData;
        link.download = `${fileName}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const w = mapRef.current.offsetWidth * 5;
        const h = mapRef.current.offsetHeight * 5;
        const pdf = new jsPDF({
          orientation: w > h ? 'landscape' : 'portrait',
          unit: 'px',
          format: [w, h]
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, w, h);
        pdf.save(`${fileName}.pdf`);
      }
    } catch (e) {
      alert("ডাউনলোড করতে সমস্যা হয়েছে।");
    } finally {
      setMapZoom(originalZoom);
      setDownloading(false);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(familyData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `family-map-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed && typeof parsed === "object") {
          setFamilyData(parsed);
          alert("✅ ডেটা সফলভাবে লোড হয়েছে!");
        } else {
          alert("❌ ফাইলের format সঠিক নয়");
        }
      } catch (err) {
        alert("❌ ফাইলটি পড়া যায়নি");
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleZoomIn = () => setMapZoom(p => Math.min(p + 0.3, 3));
  const handleZoomOut = () => setMapZoom(p => Math.max(p - 0.3, 1));
  const resetColors = () => { setBgColor(bgColors[0].value); setUnvisitedColor(unvisitedColors[0].value); };

  const handleClearAll = () => {
    if (window.confirm("আপনি কি নিশ্চিত যে সব আত্মীয় মুছে ফেলতে চান?")) {
      setFamilyData({});
      clearStorage();
      setStorageStatus({ size: 0, error: null });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-500">
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      {/* CROPPER MODAL */}
      {rawImage && (
        <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-sm flex flex-col isolate">
          <div className="bg-gray-900 text-center py-3 text-white border-b border-white/10 z-10 shadow-md">
            <h3 className="font-black text-lg">{formName || "আত্মীয়ের ছবি"}</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">ছবি টেনে এবং জুম করে পজিশন ঠিক করুন</p>
          </div>
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
          <div className="p-5 sm:p-6 bg-gray-900 flex flex-wrap justify-between items-center gap-4 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] z-10 border-t border-white/10">
            <button onClick={() => setRawImage(null)} className="px-5 py-2.5 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-colors border border-gray-700">বাতিল</button>
            <div className="flex-1 min-w-[150px] flex items-center gap-3">
              <i className="fa-solid fa-magnifying-glass-minus text-gray-400 text-xs"></i>
              <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(e.target.value)} className="flex-1 accent-emerald-500" />
              <i className="fa-solid fa-magnifying-glass-plus text-gray-400 text-xs"></i>
            </div>
            <button onClick={handleSaveCrop} className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-black shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2">
              <i className="fa-solid fa-check"></i> কনফার্ম
            </button>
          </div>
        </div>
      )}

      {/* FAMILY MODAL */}
      {familyModalDistrict && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl relative z-10 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{districtBn[familyModalDistrict] || familyModalDistrict}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {modalMode === "form" ? (editingId ? "আত্মীয় সম্পাদনা" : "নতুন আত্মীয় যোগ করুন") : `${e2b((familyData[familyModalDistrict] || []).length)} জন আত্মীয়`}
                </p>
              </div>
              <button onClick={closeModal} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors">
                <i className="fa-solid fa-xmark text-gray-600 dark:text-gray-300"></i>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {modalMode === "list" ? (
                <MemberList
                  members={familyData[familyModalDistrict] || []}
                  onEdit={startEditMember}
                  onDelete={deleteMember}
                  onDeleteAll={deleteAllInDistrict}
                />
              ) : (
                <MemberForm
                  formName={formName}
                  setFormName={setFormName}
                  formRelation={formRelation}
                  setFormRelation={setFormRelation}
                  formPhoto={formPhoto}
                  onPhotoClick={handlePhotoClick}
                  onRemovePhoto={removeFormPhoto}
                  onSave={saveMember}
                  onCancel={() => { setModalMode("list"); resetForm(); }}
                  isEditing={!!editingId}
                />
              )}
            </div>
            {modalMode === "list" && (
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                  onClick={startAddMember}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-3 rounded-xl font-black shadow-lg hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2"
                >
                  <i className="fa-solid fa-user-plus"></i> নতুন আত্মীয় যোগ করুন
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto relative z-10 flex flex-col gap-10">

        {/* HERO */}
        <div className="flex flex-col mb-4" data-aos="fade-down">
          <div className="w-full">
            <Link href="/my-bangladesh" className="inline-flex items-center gap-2 text-gray-500 hover:text-campfire font-bold mb-4 text-sm transition-colors">
              <i className="fa-solid fa-arrow-left"></i> My Bangladesh হোম
            </Link>
            <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tight leading-tight">
              আমার <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">পরিবার ম্যাপ</span>
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm inline-block">
              <i className="fa-solid fa-people-roof text-blue-500 mr-2"></i>
              আপনার পুরো পরিবার দেশের কোথায় কোথায় ছড়িয়ে আছে? জেলায় ক্লিক করে বাবা-মা, দাদা-দাদি, নানা-নানি, চাচা-মামা, খালা-ফুফু — সবাইকে ম্যাপে যোগ করুন। আপনার data স্বয়ংক্রিয়ভাবে ব্রাউজারে save হবে — refresh করলেও থাকবে!
            </p>
          </div>
        </div>

        {/* DISTRICT LIST */}
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-[2rem] border border-gray-200 dark:border-gray-700 shadow-sm" data-aos="fade-up">
          <h3 className="text-xl font-black mb-6 text-gray-900 dark:text-white flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
            <i className="fa-solid fa-sitemap text-emerald-500"></i> জেলা অনুযায়ী আত্মীয় যোগ করুন
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {bangladeshDivisions.map((division) => {
              const divFamilyCount = division.districts.reduce((acc, d) => acc + ((familyData[d] || []).length), 0);
              const divDistrictCount = division.districts.filter(d => (familyData[d] || []).length > 0).length;

              return (
                <div key={division.name} className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-3">
                    <h4 className="font-black text-gray-800 dark:text-white text-lg">{division.name}</h4>
                    <span className="text-xs font-bold px-2 py-1 rounded-md bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm">
                      <span className={divFamilyCount > 0 ? 'text-emerald-500' : ''}>{e2b(divFamilyCount)}</span> জন / {e2b(divDistrictCount)} জেলা
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {division.districts.map(dist => {
                      const members = familyData[dist] || [];
                      const count = members.length;
                      const side = getDominantSide(members);
                      const bngName = districtBn[dist] || dist;
                      const sideColor = side ? sideColors[side].value : null;

                      return (
                        <button
                          key={dist}
                          onClick={() => openDistrictModal(dist)}
                          className={`flex items-center gap-2 cursor-pointer group px-3 py-1.5 rounded-full border transition-all duration-300 ${
                            count > 0 
                              ? 'bg-white dark:bg-gray-800 shadow-sm' 
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-400'
                          }`}
                          style={count > 0 ? { borderColor: sideColor } : {}}
                        >
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-black"
                            style={{ background: count > 0 ? sideColor : '#cbd5e1' }}
                          >
                            {count > 0 ? e2b(count) : ''}
                          </div>
                          <span className={`text-xs font-bold ${count > 0 ? 'text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
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

        {/* MAP + SIDEBAR */}
        <div className="flex flex-col md:flex-row gap-8 items-start" data-aos="fade-up">

          {/* MAP CARD — FULLY BLENDED */}
          <div className="flex-grow flex justify-center relative w-full">
            <div
              ref={mapRef}
              className="w-full max-w-[650px] aspect-[4/5] relative rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500"
              style={{ background: bgColor }}
            >
              {/* Decorative glows */}
              <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none z-0" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)' }}></div>
              <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none z-0" style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 70%)' }}></div>

              {/* ===== MAP — fills entire card ===== */}
              <div
                className="absolute inset-0 z-0 flex items-center justify-center transition-transform duration-300 ease-out"
                style={{ transform: `scale(${mapZoom})`, transformOrigin: "center" }}
              >
                <div
                  style={{
                    filter: isDarkBg
                      ? 'drop-shadow(0px 25px 35px rgba(0,0,0,0.6)) drop-shadow(0px 10px 15px rgba(0,0,0,0.4))'
                      : 'drop-shadow(0px 25px 35px rgba(0,0,0,0.25)) drop-shadow(0px 10px 15px rgba(0,0,0,0.15))'
                  }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{ scale: 6500, center: [90.35, 23.8] }}
                    className="w-full h-full outline-none"
                  >
                    <defs>
                      {viewMode === "photos" && Object.entries(familyData).map(([district, members]) => {
                        const photo = members.find(m => m.photo)?.photo;
                        if (!photo) return null;
                        return (
                          <pattern
                            key={`pattern-${district}`}
                            id={`pattern-${safeSvgId(district)}`}
                            width="100%"
                            height="100%"
                            patternContentUnits="objectBoundingBox"
                            preserveAspectRatio="xMidYMid slice"
                          >
                            <image href={photo} preserveAspectRatio="xMidYMid slice" width="1" height="1" />
                          </pattern>
                        );
                      })}
                    </defs>

                    <Geographies geography={geoUrl}>
                      {({ geographies }) => (
                        <>
                          {geographies.map((geo) => {
                            const rawName = geo.properties.adm2_name || geo.properties.ADM2_EN || geo.properties.NAME_2 || geo.properties.name || geo.properties.Dist_Name || geo.properties.district;
                            const districtName = standardMap[rawName] || rawName;
                            const members = familyData[districtName] || [];
                            const hasMembers = members.length > 0;
                            const side = getDominantSide(members);
                            const sideColor = side ? sideColors[side].value : unvisitedColor;
                            const photoPatternUrl = viewMode === "photos" ? members.find(m => m.photo)?.photo : null;

                            return (
                              <MemoizedGeography
                                key={geo.rsmKey}
                                geo={geo}
                                districtName={districtName}
                                fillColor={hasMembers ? sideColor : unvisitedColor}
                                patternUrl={photoPatternUrl}
                                strokeColor={isDarkBg ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)"}
                                isDarkBg={isDarkBg}
                                hoverStroke={isDarkBg ? "#ffffff" : "#1e293b"}
                                onClick={openDistrictModal}
                              />
                            );
                          })}
                        </>
                      )}
                    </Geographies>
                  </ComposableMap>
                </div>
              </div>

              {/* ===== HEADER OVERLAY — blended, no card ===== */}
              <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-4 flex justify-between items-start gap-3 pointer-events-none">
                {/* Legend — tiny */}
                <div className="flex flex-col gap-0.5">
                  {Object.entries(sideColors).map(([key, c]) => {
                    if (key === "other") return null;
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-1 text-[7px] font-bold leading-tight"
                        style={{ color: isDarkBg ? 'rgba(255,255,255,0.7)' : 'rgba(30,41,59,0.65)' }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.value }}></span>
                        <span>{c.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Title */}
                <div className="text-right shrink-0">
                  <h2
                    className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-md leading-none whitespace-nowrap"
                    style={{ color: isDarkBg ? '#ffffff' : '#1e293b' }}
                  >
                    আমার <span className="font-bold opacity-90">পরিবার</span>
                  </h2>
                  <div
                    className="h-1 w-16 rounded-full mt-2 ml-auto shadow-sm"
                    style={{ background: 'linear-gradient(90deg, #3b82f6, #ec4899)' }}
                  ></div>
                </div>
              </div>

              {/* ===== ZOOM BUTTONS — below title ===== */}
              <div className="absolute top-20 right-4 z-30 flex flex-col gap-2" data-html2canvas-ignore="true">
                <button
                  onClick={handleZoomIn}
                  className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 bg-white/90 dark:bg-gray-800/90 backdrop-blur text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700"
                >
                  <i className="fa-solid fa-plus text-sm"></i>
                </button>
                <button
                  onClick={handleZoomOut}
                  className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 bg-white/90 dark:bg-gray-800/90 backdrop-blur text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700"
                >
                  <i className="fa-solid fa-minus text-sm"></i>
                </button>
              </div>

              {/* ===== FOOTER OVERLAY — blended, minimal ===== */}
              <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-2 pointer-events-none">
                <p
                  className="text-[9px] sm:text-[10px] font-bold leading-tight mb-1"
                  style={{ color: isDarkBg ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)' }}
                >
                  আপনার শিকড় বাংলাদেশের{' '}
                  <span
                    className="inline-block px-1.5 py-0.5 rounded-md font-black mx-0.5 align-middle"
                    style={{
                      background: 'linear-gradient(90deg, #3b82f6, #ec4899)',
                      color: '#ffffff',
                      fontSize: '0.95em',
                      lineHeight: 1
                    }}
                  >
                    {e2b(percentage)}%
                  </span>{' '}
                  জায়গা জুড়ে বিস্তৃত
                </p>
                <div
                  className="h-1 rounded-full overflow-hidden mb-1.5"
                  style={{ background: isDarkBg ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.max(percentage, stats.districts > 0 ? 3 : 0)}%`,
                      background: 'linear-gradient(90deg, #3b82f6, #a855f7, #ec4899)'
                    }}
                  ></div>
                </div>
                <p
                  className="text-[6px] font-black tracking-widest uppercase opacity-50"
                  style={{ color: isDarkBg ? '#ffffff' : '#000000' }}
                >
                  Generated by CUET Adventure Society
                </p>
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="w-full md:w-[350px] flex flex-col gap-6 shrink-0">

            <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex gap-1">
              <button
                onClick={() => setViewMode("sides")}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${viewMode === "sides" ? 'bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <i className="fa-solid fa-people-roof"></i> পরিবার মোড
              </button>
              <button
                onClick={() => setViewMode("photos")}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${viewMode === "photos" ? 'bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <i className="fa-solid fa-image"></i> ছবি মোড
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  <i className="fa-solid fa-database mr-1 text-emerald-500"></i> ব্রাউজার স্টোরেজ
                </p>
                <span className={`text-xs font-black ${
                  storageStatus.error === "quota" 
                    ? "text-red-500" 
                    : storageStatus.size > 3.5 
                      ? "text-orange-500" 
                      : "text-emerald-500"
                }`}>
                  {storageStatus.size.toFixed(2)} MB / 5 MB
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    storageStatus.size > 3.5 
                      ? "bg-gradient-to-r from-orange-400 to-red-500" 
                      : "bg-gradient-to-r from-emerald-400 to-emerald-500"
                  }`}
                  style={{ width: `${Math.min((storageStatus.size / 5) * 100, 100)}%` }}
                ></div>
              </div>
              {storageStatus.error === "quota" && (
                <p className="text-[10px] text-red-500 font-bold mt-2">
                  <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                  স্টোরেজ ভরে গেছে! কিছু আত্মীয় মুছে ফেলুন।
                </p>
              )}
              {storageStatus.size > 0 && !storageStatus.error && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                  <i className="fa-solid fa-circle-check mr-1 text-emerald-500"></i>
                  ব্রাউজারে save আছে — refresh করলেও থাকবে
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleExport}
                disabled={stats.total === 0}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  stats.total === 0
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20"
                }`}
              >
                <i className="fa-solid fa-download"></i> Export
              </button>
              <label className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20">
                <i className="fa-solid fa-upload"></i> Import
                <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
              </label>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="mb-6">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3"><i className="fa-solid fa-fill-drip mr-1 text-blue-500"></i> ব্যাকগ্রাউন্ড:</p>
                <div className="flex flex-wrap gap-2.5">
                  {bgColors.map(color => (
                    <button key={color.value} onClick={() => setBgColor(color.value)}
                      className={`w-8 h-8 rounded-full shadow-md transition-all border border-gray-300 dark:border-gray-600 ${bgColor === color.value ? 'scale-125 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-gray-800' : 'hover:scale-110'}`}
                      style={{ background: color.value }} title={color.name} />
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest"><i className="fa-solid fa-palette mr-1 text-purple-500"></i> খালি জেলার রং:</p>
                  <button onClick={resetColors} className="text-[10px] font-bold text-gray-400 hover:text-emerald-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                    <i className="fa-solid fa-rotate-left mr-1"></i> রিসেট
                  </button>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {unvisitedColors.map(color => (
                    <button key={color.value} onClick={() => setUnvisitedColor(color.value)}
                      className={`w-8 h-8 rounded-full shadow-sm transition-all border border-gray-300 dark:border-gray-600 ${unvisitedColor === color.value ? 'scale-125 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-gray-800' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color.value }} title={color.name} />
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-center mb-5">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-2xl shadow-lg">
                  <i className="fa-solid fa-people-roof"></i>
                </div>
                <h3 className="text-4xl font-black text-gray-900 dark:text-white">{e2b(stats.total)}</h3>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">মোট আত্মীয়</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">ছড়িয়ে আছে {e2b(stats.districts)} টি জেলায়</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg p-2.5 text-center" style={{ background: sideColors.paternal.value + '20' }}>
                  <p className="text-lg font-black" style={{ color: sideColors.paternal.value }}>{e2b(stats.paternal)}</p>
                  <p className="text-[9px] font-bold text-gray-600 dark:text-gray-400">বাবার দিক</p>
                </div>
                <div className="rounded-lg p-2.5 text-center" style={{ background: sideColors.maternal.value + '20' }}>
                  <p className="text-lg font-black" style={{ color: sideColors.maternal.value }}>{e2b(stats.maternal)}</p>
                  <p className="text-[9px] font-bold text-gray-600 dark:text-gray-400">মায়ের দিক</p>
                </div>
                <div className="rounded-lg p-2.5 text-center" style={{ background: sideColors.own.value + '20' }}>
                  <p className="text-lg font-black" style={{ color: sideColors.own.value }}>{e2b(stats.own)}</p>
                  <p className="text-[9px] font-bold text-gray-600 dark:text-gray-400">নিজ প্রজন্ম</p>
                </div>
                <div className="rounded-lg p-2.5 text-center" style={{ background: sideColors.in_law.value + '20' }}>
                  <p className="text-lg font-black" style={{ color: sideColors.in_law.value }}>{e2b(stats.inLaw)}</p>
                  <p className="text-[9px] font-bold text-gray-600 dark:text-gray-400">শ্বশুরবাড়ি</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleDownload('jpg')}
                disabled={downloading || stats.total === 0}
                className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest flex justify-center items-center gap-2 transition-all shadow-md ${downloading || stats.total === 0 ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white hover:shadow-[0_8px_25px_rgba(168,85,247,0.4)] hover:-translate-y-1'}`}
              >
                {downloading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-image"></i>}
                {downloading ? "প্রসেসিং..." : "JPG ডাউনলোড"}
              </button>
              <button
                onClick={() => handleDownload('pdf')}
                disabled={downloading || stats.total === 0}
                className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest flex justify-center items-center gap-2 transition-all shadow-md ${downloading || stats.total === 0 ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-[0_8px_25px_rgba(37,99,235,0.4)] hover:-translate-y-1'}`}
              >
                {downloading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-file-pdf"></i>}
                {downloading ? "প্রসেসিং..." : "PDF ডাউনলোড"}
              </button>
            </div>

            {stats.total > 0 && (
              <button
                onClick={handleClearAll}
                className="w-full py-3 rounded-xl font-bold text-xs text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors border border-red-200 dark:border-transparent flex justify-center items-center gap-2"
              >
                <i className="fa-solid fa-trash-can"></i> সব ডেটা মুছে ফেলুন
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MEMBER LIST
// ============================================
function MemberList({ members, onEdit, onDelete, onDeleteAll }) {
  if (members.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-100 to-pink-100 dark:from-blue-500/10 dark:to-pink-500/10 rounded-full flex items-center justify-center mb-4">
          <i className="fa-solid fa-people-roof text-3xl text-blue-500 dark:text-blue-400"></i>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">এই জেলায় এখনো কোনো আত্মীয় যোগ করা হয়নি</p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">নিচের বাটনে ক্লিক করে শুরু করুন</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {members.map((member) => {
        const side = getRelationSide(member.relation);
        const color = sideColors[side].value;
        return (
          <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
            <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 shadow-md border-2" style={{ borderColor: color }}>
              {member.photo ? (
                <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-black text-xl" style={{ background: color }}>
                  {member.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900 dark:text-white text-sm truncate">{member.name}</p>
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 text-white" style={{ background: color }}>
                {getRelationLabel(member.relation)}
              </span>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => onEdit(member)} className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors flex items-center justify-center">
                <i className="fa-solid fa-pen text-xs"></i>
              </button>
              <button onClick={() => onDelete(member.id)} className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex items-center justify-center">
                <i className="fa-solid fa-trash text-xs"></i>
              </button>
            </div>
          </div>
        );
      })}

      {members.length > 1 && (
        <button onClick={onDeleteAll} className="mt-3 text-xs text-red-500 hover:text-red-600 font-bold flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
          <i className="fa-solid fa-trash-can"></i> সব মুছে ফেলুন
        </button>
      )}
    </div>
  );
}

// ============================================
// MEMBER FORM
// ============================================
function MemberForm({ formName, setFormName, formRelation, setFormRelation, formPhoto, onPhotoClick, onRemovePhoto, onSave, onCancel, isEditing }) {
  const selectedSide = getRelationSide(formRelation);
  const selectedColor = sideColors[selectedSide].value;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3">
        {formPhoto ? (
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg border-4" style={{ borderColor: selectedColor }}>
              <img src={formPhoto} alt="preview" className="w-full h-full object-cover" />
            </div>
            <button onClick={onRemovePhoto} className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 flex items-center justify-center">
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          </div>
        ) : (
          <button onClick={onPhotoClick} className="w-24 h-24 rounded-full border-4 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-1 hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors bg-gray-50 dark:bg-gray-900/50">
            <i className="fa-solid fa-camera text-gray-400 text-xl"></i>
            <span className="text-[9px] font-bold text-gray-500">ছবি দিন</span>
          </button>
        )}
        {formPhoto && (
          <button onClick={onPhotoClick} className="text-xs font-bold text-blue-500 hover:text-blue-600">
            <i className="fa-solid fa-pen mr-1"></i> ছবি পরিবর্তন
          </button>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
          আত্মীয়ের নাম <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="যেমন: করিম উদ্দিন"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
          সম্পর্ক
        </label>
        <select
          value={formRelation}
          onChange={(e) => setFormRelation(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
        >
          <optgroup label="বাবার দিকের আত্মীয়">
            {familyRelations.filter(r => r.side === "paternal").map(r => (
              <option key={r.key} value={r.key}>{r.bn}</option>
            ))}
          </optgroup>
          <optgroup label="মায়ের দিকের আত্মীয়">
            {familyRelations.filter(r => r.side === "maternal").map(r => (
              <option key={r.key} value={r.key}>{r.bn}</option>
            ))}
          </optgroup>
          <optgroup label="নিজ প্রজন্মের আত্মীয়">
            {familyRelations.filter(r => r.side === "own").map(r => (
              <option key={r.key} value={r.key}>{r.bn}</option>
            ))}
          </optgroup>
          <optgroup label="শ্বশুরবাড়ির আত্মীয়">
            {familyRelations.filter(r => r.side === "in_law").map(r => (
              <option key={r.key} value={r.key}>{r.bn}</option>
            ))}
          </optgroup>
          <optgroup label="অন্যান্য">
            {familyRelations.filter(r => r.side === "other").map(r => (
              <option key={r.key} value={r.key}>{r.bn}</option>
            ))}
          </optgroup>
        </select>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-full" style={{ background: selectedColor }}></span>
          <span className="font-bold text-gray-600 dark:text-gray-400">{sideColors[selectedSide].label}</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          বাতিল
        </button>
        <button onClick={onSave} className="flex-1 py-3 rounded-xl font-black text-white shadow-lg transition-all hover:-translate-y-0.5" style={{ background: `linear-gradient(135deg, ${selectedColor}, ${selectedColor}dd)` }}>
          <i className="fa-solid fa-check mr-1.5"></i> {isEditing ? "আপডেট" : "যোগ করুন"}
        </button>
      </div>
    </div>
  );
}
