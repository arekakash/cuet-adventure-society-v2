"use client";
import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { geoCentroid, geoMercator, geoContains } from "d3-geo";
import * as topojson from "topojson-client";
import Link from "next/link";
import { toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";
import AOS from "aos";
import "aos/dist/aos.css";

const geoUrl = "/bd-upazilas.topo.json";

// ============================================
// PROJECTION
// ============================================
const PROJECTION_CONFIG = { scale: 6500, center: [90.35, 23.8] };

const baseProjection = geoMercator()
  .scale(PROJECTION_CONFIG.scale)
  .center(PROJECTION_CONFIG.center)
  .translate([0, 0]);

const getScreenDelta = (from, to) => {
  const p1 = baseProjection(from);
  const p2 = baseProjection(to);
  if (!p1 || !p2) return [0, 0];
  return [p2[0] - p1[0], p2[1] - p1[1]];
};

// ============================================
// HELPERS
// ============================================
const e2b = (num) => String(num).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);

const haversine = (p1, p2) => {
  const R = 6371;
  const [lng1, lat1] = p1;
  const [lng2, lat2] = p2;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ---- Robust name extractor ----
const getUpazilaName = (props) => {
  if (!props || typeof props !== "object") return "উপজেলা";
  const keys = [
    "adm3_name", "ADM3_NAME", "ADM3_EN", "adm3_en",
    "UPZ_NAME", "UPZ_EN", "UPZ_NAME_B", "UPZ_BND_NAME",
    "upazila_name", "upazilaName", "upazila", "Upazila",
    "NAME_3", "name", "Name", "NAME",
    "UPAZILA", "UPAZILLA", "Upzilla", "upazilla",
    "ADM3", "adm3", "UPZ", "upz", "UP_NAME"
  ];
  for (const k of keys) {
    const v = props[k];
    if (typeof v === "string" && v.trim() && v.length < 60) return v.trim();
  }
  for (const k of Object.keys(props)) {
    const v = props[k];
    if (typeof v === "string" && v.trim() && v.length < 60) return v.trim();
  }
  return "উপজেলা";
};

// ============================================
// DIVISION MAPPING
// ============================================
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

const divisionOfDistrict = (districtName) => {
  for (const div of bangladeshDivisions) {
    if (div.districts.includes(districtName)) return div.name;
  }
  return "অন্যান্য বিভাগ";
};

// ============================================
// QUOTE PRESETS
// ============================================
const quotePresets = [
  { key: "default", text: "ভ্রমণ ছিল অজুহাত, পথ বদলেছে বারবার—আসল উদ্দেশ্য ছিল আমার বাংলাদেশ কে দেখা।" },
  { key: "cycle", text: "প্রতিটা প্যাডেল, প্রতিটা মাইল—একটা নতুন গল্প।" },
  { key: "road", text: "রাস্তা যেখানে শেষ, গল্প সেখানে শুরু।" },
  { key: "foot", text: "হাঁটার কোনো তাড়া নেই, শুধু পথ আর পথ।" },
];

// ============================================
// COLORS
// ============================================
const bgColors = [
  { name: "ক্লাসিক হোয়াইট", value: "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)", isDark: false },
  { name: "সফট ক্লাউড", value: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)", isDark: false },
  { name: "সানরাইজ পিচ", value: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)", isDark: false },
  { name: "ফ্রেশ মিন্ট", value: "linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)", isDark: false },
  { name: "রোজ মিল্ক", value: "linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)", isDark: false },
  { name: "ডিপ ওশান", value: "linear-gradient(135deg, #0f172a 0%, #020617 100%)", isDark: true },
  { name: "ডার্ক ফরেস্ট", value: "linear-gradient(135deg, #0f3420 0%, #06180e 100%)", isDark: true },
  { name: "ম্যাজিক পার্পল", value: "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)", isDark: true },
];

const routeColors = [
  { name: "Crimson", value: "#ef4444" },
  { name: "Emerald", value: "#10b981" },
  { name: "Sky Blue", value: "#3b82f6" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Purple", value: "#a855f7" },
  { name: "Rose", value: "#ec4899" },
];

const upazilaBaseColors = [
  { name: "Ash", value: "#e2e8f0" },
  { name: "Cream", value: "#fef3c7" },
  { name: "Ice", value: "#e0f2fe" },
  { name: "Mint", value: "#d1fae5" },
  { name: "White", value: "#ffffff" },
  { name: "Slate", value: "#334155" },
];

// ============================================
// MEMOIZED UPAZILA
// ============================================
const MemoizedUpazila = memo(
  ({ geo, name, hasWaypoint, isHovered, fillColor, upazilaColor, strokeColor, hoverFill, onClick, onHover }) => {
    const baseFill = hasWaypoint ? fillColor : upazilaColor;

    return (
      <Geography
        geography={geo}
        onClick={(e) => onClick(geo, name, e)}
        onMouseEnter={() => onHover(name)}
        onMouseLeave={() => onHover("")}
        style={{
          default: {
            fill: baseFill,
            outline: "none",
            stroke: strokeColor,
            strokeWidth: hasWaypoint ? 0.8 : 0.25,
            transition: "all 0.15s ease",
            cursor: "pointer"
          },
          hover: {
            fill: hasWaypoint ? fillColor : hoverFill,
            outline: "none",
            stroke: strokeColor,
            strokeWidth: 0.8,
            cursor: "pointer"
          },
          pressed: { outline: "none" }
        }}
      />
    );
  },
  (prev, next) =>
    prev.geo === next.geo &&
    prev.hasWaypoint === next.hasWaypoint &&
    prev.isHovered === next.isHovered &&
    prev.fillColor === next.fillColor &&
    prev.upazilaColor === next.upazilaColor &&
    prev.strokeColor === next.strokeColor
);
MemoizedUpazila.displayName = "MemoizedUpazila";

// ============================================
// HIERARCHY EXPLORER (ACCORDION)
// ============================================
function HierarchyExplorer({ hierarchy, waypointKeysByRsmKey, onToggleUpazila, routeColor }) {
  const [openDivision, setOpenDivision] = useState(null);
  const [openDistrict, setOpenDistrict] = useState(null);

  const divisions = useMemo(() => {
    return Object.keys(hierarchy).sort((a, b) => a.localeCompare(b, "bn"));
  }, [hierarchy]);

  if (divisions.length === 0) {
    return (
      <div className="text-center py-8">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400"></i>
        <p className="text-xs text-gray-500 mt-3">উপজেলা তালিকা লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
      {divisions.map((divisionName) => {
        const districts = hierarchy[divisionName];
        const isDivOpen = openDivision === divisionName;
        const totalUpz = Object.values(districts).reduce((s, arr) => s + arr.length, 0);
        const districtNames = Object.keys(districts).sort((a, b) => a.localeCompare(b, "bn"));

        return (
          <div
            key={divisionName}
            className={`rounded-xl overflow-hidden border transition-colors ${
              isDivOpen
                ? "border-orange-400 dark:border-orange-500/50 shadow-sm"
                : "border-gray-200 dark:border-gray-700"
            }`}
          >
            <button
              onClick={() => {
                setOpenDivision(isDivOpen ? null : divisionName);
                setOpenDistrict(null);
              }}
              className={`w-full px-3 py-2.5 flex items-center justify-between gap-2 transition-all ${
                isDivOpen
                  ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md"
                  : "bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <i className={`fa-solid fa-chevron-${isDivOpen ? "down" : "right"} text-[10px] transition-transform shrink-0`}></i>
                <span className="font-black text-xs truncate">{divisionName}</span>
              </div>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${isDivOpen ? "bg-white/25" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"}`}>
                {e2b(totalUpz)}
              </span>
            </button>

            {isDivOpen && (
              <div className="bg-white dark:bg-gray-800 p-2 flex flex-col gap-1.5">
                {districtNames.map((districtName) => {
                  const upazilas = districts[districtName];
                  const isDistOpen = openDistrict === districtName;
                  const sortedUpz = [...upazilas].sort((a, b) =>
                    a.name.localeCompare(b.name, "bn")
                  );

                  return (
                    <div key={districtName}>
                      <button
                        onClick={() => setOpenDistrict(isDistOpen ? null : districtName)}
                        className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 transition-all ${
                          isDistOpen
                            ? "bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-400 border border-pink-200 dark:border-pink-500/30"
                            : "bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900/60"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <i className={`fa-solid fa-chevron-${isDistOpen ? "down" : "right"} text-[8px] shrink-0`}></i>
                          <span className="font-bold text-[11px] truncate">{districtName}</span>
                        </div>
                        <span className="text-[9px] font-bold opacity-60 shrink-0">
                          {e2b(upazilas.length)}
                        </span>
                      </button>

                      {isDistOpen && (
                        <div className="flex flex-wrap gap-1 mt-1.5 mb-1 pl-2 pr-1 max-h-[240px] overflow-y-auto">
                          {sortedUpz.map((u) => {
                            const wpIdx = waypointKeysByRsmKey[u.rsmKey];
                            const isActive = !!wpIdx;
                            return (
                              <button
                                key={u.rsmKey}
                                onClick={() => onToggleUpazila(u)}
                                className={`px-2 py-1 rounded-full text-[9px] font-bold border transition-all flex items-center gap-1 ${
                                  isActive
                                    ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white border-transparent shadow-sm"
                                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-500/50"
                                }`}
                                title={u.name}
                              >
                                {isActive && (
                                  <span className="w-3.5 h-3.5 rounded-full bg-white/30 text-white text-[8px] font-black flex items-center justify-center shrink-0">
                                    {e2b(wpIdx)}
                                  </span>
                                )}
                                <span className="truncate max-w-[110px]">{u.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function TripPlannerPage() {
  const [waypoints, setWaypoints] = useState([]);
  const [bgColor, setBgColor] = useState(bgColors[0].value);
  const [routeColor, setRouteColor] = useState(routeColors[4].value);
  const [upazilaColor, setUpazilaColor] = useState(upazilaBaseColors[0].value);
  const [hoveredUpazila, setHoveredUpazila] = useState("");
  const [quoteOption, setQuoteOption] = useState("default");
  const [customQuote, setCustomQuote] = useState("");
  const [tripTitle, setTripTitle] = useState("আমার ট্রিপ প্ল্যান");
  const [downloading, setDownloading] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);

  // Hierarchy state
  const [hierarchy, setHierarchy] = useState({});
  const [districtLookup, setDistrictLookup] = useState(null);
  const hierarchyBuilt = useRef(false);

  const mapRef = useRef(null);

  const isDarkBg = bgColors.find((c) => c.value === bgColor)?.isDark ?? false;
  const isDarkUpazila = upazilaColor === "#334155";

  useEffect(() => {
    AOS.init({ once: true, offset: 50, duration: 800 });
  }, []);

  // 🔴 Load district topojson for lookup
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/bd-districts.topo.json");
        const topo = await res.json();
        const key = Object.keys(topo.objects)[0];
        const features = topojson.feature(topo, topo.objects[key]).features;
        const lookup = features.map((f) => {
          const props = f.properties || {};
          const rawName =
            props.adm2_name ||
            props.ADM2_EN ||
            props.NAME_2 ||
            props.name ||
            props.Dist_Name ||
            props.district ||
            "Unknown";
          const name = rawName === "Coxs Bazar" ? "Cox's Bazar" : rawName;
          return { name, geometry: f };
        });
        setDistrictLookup(lookup);
        console.log("[Trip Planner] Districts loaded:", lookup.length);
      } catch (err) {
        console.error("District lookup failed:", err);
      }
    })();
  }, []);

  // ============ STATS ============
  const stats = useMemo(() => {
    let totalDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalDistance += haversine(waypoints[i].coordinates, waypoints[i + 1].coordinates);
    }
    const totalDays = waypoints.reduce((s, w) => s + (Number(w.days) || 1), 0);
    return { totalDistance, totalDays, count: waypoints.length };
  }, [waypoints]);

  const displayQuote = (() => {
    if (quoteOption === "custom") return customQuote.trim() || quotePresets[0].text;
    return quotePresets.find((q) => q.key === quoteOption)?.text || quotePresets[0].text;
  })();

  const waypointKeysByRsmKey = useMemo(() => {
    const map = {};
    waypoints.forEach((w, i) => {
      map[w.id_key] = i + 1;
    });
    return map;
  }, [waypoints]);

  // ============ TOGGLE WAYPOINT ============
  const handleToggleWaypoint = useCallback((geoOrUpz, name) => {
    let rsmKey, coordinates, upzName;

    if (geoOrUpz && typeof geoOrUpz === "object" && "rsmKey" in geoOrUpz) {
      rsmKey = geoOrUpz.rsmKey;
      coordinates = geoOrUpz.coordinates;
      upzName = geoOrUpz.name;
    } else {
      const centroid = geoCentroid(geoOrUpz);
      if (!centroid || !isFinite(centroid[0])) return;
      rsmKey = geoOrUpz.rsmKey;
      coordinates = centroid;
      upzName = name;
    }

    setWaypoints((prev) => {
      const exists = prev.find((w) => w.id_key === rsmKey);
      if (exists) return prev.filter((w) => w.id_key !== rsmKey);
      return [
        ...prev,
        {
          id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
          id_key: rsmKey,
          name: upzName,
          coordinates,
          days: 1,
        },
      ];
    });
  }, []);

  const handleRemoveWaypoint = (id) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  };

  const handleMoveWaypoint = (id, direction) => {
    setWaypoints((prev) => {
      const idx = prev.findIndex((w) => w.id === id);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const updated = [...prev];
      [updated[idx], updated[targetIdx]] = [updated[targetIdx], updated[idx]];
      return updated;
    });
  };

  const handleClearAll = () => {
    if (window.confirm("সব waypoint মুছে ফেলবেন?")) setWaypoints([]);
  };

  const handleZoomIn = () => setMapZoom((p) => Math.min(p + 0.3, 4));
  const handleZoomOut = () => setMapZoom((p) => Math.max(p - 0.3, 1));

  // ============ DOWNLOAD ============
  const handleDownload = async (format) => {
    if (!mapRef.current) return;
    setDownloading(true);
    const originalZoom = mapZoom;
    setMapZoom(1);
    await new Promise((r) => setTimeout(r, 500));

    try {
      const imgData = await toJpeg(mapRef.current, {
        quality: 1.0,
        backgroundColor: "transparent",
        pixelRatio: 5,
        cacheBust: false,
      });

      const fileName = `My-Trip-Plan-CAS`;

      if (format === "jpg") {
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
          orientation: w > h ? "landscape" : "portrait",
          unit: "px",
          format: [w, h],
        });
        pdf.addImage(imgData, "JPEG", 0, 0, w, h);
        pdf.save(`${fileName}.pdf`);
      }
    } catch (e) {
      alert("ডাউনলোড করতে সমস্যা হয়েছে।");
    } finally {
      setMapZoom(originalZoom);
      setDownloading(false);
    }
  };

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050b08] pt-24 pb-16 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-500">
      <div className="max-w-6xl mx-auto relative z-10 flex flex-col gap-10">

        {/* HERO */}
        <div className="flex flex-col mb-4" data-aos="fade-down">
          <div className="w-full">
            <Link
              href="/my-bangladesh"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-campfire font-bold mb-4 text-sm transition-colors"
            >
              <i className="fa-solid fa-arrow-left"></i> My Bangladesh হোম
            </Link>
            <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tight leading-tight">
              ট্রিপ{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-pink-500">
                প্ল্যানার
              </span>
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm inline-block">
              <i className="fa-solid fa-route text-orange-500 mr-2"></i>
              বিভাগ → জেলা → উপজেলা — তিন স্তরে ঘুরে আপনার যাত্রাপথ তৈরি করুন। ম্যাপে সরাসরি উপজেলাতেও ক্লিক করতে পারবেন। প্রতিটা waypoint সংখ্যাযুক্ত marker হবে এবং তীরচিহ্ন দিয়ে রুট দেখা যাবে।
            </p>
          </div>
        </div>

        {/* MAP + SIDEBAR */}
        <div className="flex flex-col md:flex-row gap-8 items-start" data-aos="fade-up">

          {/* MAP CARD */}
          <div className="flex-grow flex justify-center relative w-full">
            <div
              ref={mapRef}
              className="w-full max-w-[650px] aspect-[4/5] relative rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500 flex flex-col"
              style={{ background: bgColor }}
            >
              <div
                className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none z-0"
                style={{ background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)" }}
              ></div>
              <div
                className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none z-0"
                style={{ background: "radial-gradient(circle, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 70%)" }}
              ></div>

              {/* HEADER */}
              <div className="relative z-20 px-4 pt-4 pb-2 flex justify-between items-start gap-3 shrink-0">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={tripTitle}
                    onChange={(e) => setTripTitle(e.target.value.slice(0, 40))}
                    data-html2canvas-ignore="true"
                    className="w-full bg-transparent border-b border-dashed text-sm sm:text-base font-black focus:outline-none"
                    style={{
                      color: isDarkBg ? "#ffffff" : "#1e293b",
                      borderColor: isDarkBg ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)",
                    }}
                    placeholder="ট্রিপের নাম..."
                  />
                  <p
                    data-html2canvas-ignore="true"
                    className="text-[9px] font-bold mt-1 opacity-60"
                    style={{ color: isDarkBg ? "#ffffff" : "#1e293b" }}
                  >
                    <i className="fa-solid fa-edit mr-1"></i>নাম পরিবর্তন করতে এখানে ক্লিক করুন
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <h2
                    className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-md leading-none whitespace-nowrap"
                    style={{ color: isDarkBg ? "#ffffff" : "#1e293b" }}
                  >
                    {e2b(stats.count)}{" "}
                    <span className="font-bold opacity-90 text-sm sm:text-lg">স্টপ</span>
                  </h2>
                  <div
                    className="h-1 w-16 rounded-full mt-2 ml-auto shadow-sm"
                    style={{ background: `linear-gradient(90deg, ${routeColor}, ${routeColor}80)` }}
                  ></div>
                </div>
              </div>

              {/* MAP AREA */}
              <div className="flex-1 relative z-10 overflow-hidden">
                <div className="absolute top-3 right-3 z-30 flex flex-col gap-2" data-html2canvas-ignore="true">
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

                {hoveredUpazila && (
                  <div
                    data-html2canvas-ignore="true"
                    className="absolute top-3 left-3 z-30 px-3 py-1.5 rounded-full text-[10px] font-black shadow-lg backdrop-blur-md border max-w-[60%] truncate"
                    style={{
                      background: isDarkBg ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.85)",
                      color: isDarkBg ? "#ffffff" : "#1e293b",
                      borderColor: isDarkBg ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)",
                    }}
                  >
                    <i className="fa-solid fa-location-dot mr-1" style={{ color: routeColor }}></i>
                    {hoveredUpazila}
                  </div>
                )}

                <div
                  className="w-full h-full flex items-center justify-center transition-transform duration-300 ease-out"
                  style={{ transform: `scale(${mapZoom})`, transformOrigin: "center" }}
                >
                  <div
                    style={{
                      filter: isDarkBg
                        ? "drop-shadow(0px 25px 35px rgba(0,0,0,0.6)) drop-shadow(0px 10px 15px rgba(0,0,0,0.4))"
                        : "drop-shadow(0px 25px 35px rgba(0,0,0,0.25)) drop-shadow(0px 10px 15px rgba(0,0,0,0.15))",
                    }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <ComposableMap
                      projection="geoMercator"
                      projectionConfig={PROJECTION_CONFIG}
                      className="w-full h-full outline-none"
                    >
                      <defs>
                        <marker
                          id="trip-arrowhead"
                          markerWidth="8"
                          markerHeight="8"
                          refX="6.5"
                          refY="3"
                          orient="auto"
                          markerUnits="strokeWidth"
                        >
                          <polygon points="0 0, 7 3, 0 6" fill={routeColor} />
                        </marker>
                      </defs>

                      <Geographies geography={geoUrl}>
                        {({ geographies }) => {
                          // ---- Build hierarchy ONCE (with district lookup via geoContains) ----
                          if (!hierarchyBuilt.current && geographies.length > 0 && districtLookup) {
                            hierarchyBuilt.current = true;
                            const h = {};

                            geographies.forEach((g) => {
                              const upz = getUpazilaName(g.properties);
                              const centroid = geoCentroid(g);
                              if (!centroid || !isFinite(centroid[0])) return;

                              // Find containing district
                              let districtName = "অন্যান্য জেলা";
                              for (const d of districtLookup) {
                                try {
                                  if (geoContains(d.geometry, centroid)) {
                                    districtName = d.name;
                                    break;
                                  }
                                } catch (e) {}
                              }

                              const divisionName = divisionOfDistrict(districtName);

                              if (!h[divisionName]) h[divisionName] = {};
                              if (!h[divisionName][districtName]) h[divisionName][districtName] = [];

                              h[divisionName][districtName].push({
                                name: upz,
                                rsmKey: g.rsmKey,
                                coordinates: centroid,
                              });
                            });

                            if (process.env.NODE_ENV !== "production") {
                              console.log("[Trip Planner] Hierarchy divisions:", Object.keys(h));
                              Object.keys(h).forEach((div) => {
                                console.log(`  ${div}: ${Object.keys(h[div]).length} districts`);
                              });
                            }

                            setTimeout(() => setHierarchy(h), 0);
                          }

                          return geographies.map((geo) => {
                            const name = getUpazilaName(geo.properties);
                            const isWaypoint = waypointKeysByRsmKey[geo.rsmKey] !== undefined;

                            return (
                              <MemoizedUpazila
                                key={geo.rsmKey}
                                geo={geo}
                                name={name}
                                hasWaypoint={isWaypoint}
                                isHovered={hoveredUpazila === name}
                                fillColor={routeColor}
                                upazilaColor={upazilaColor}
                                strokeColor={
                                  isDarkBg || isDarkUpazila
                                    ? "rgba(255,255,255,0.15)"
                                    : "rgba(0,0,0,0.12)"
                                }
                                hoverFill={
                                  isDarkBg || isDarkUpazila ? "#475569" : "#94a3b8"
                                }
                                onClick={handleToggleWaypoint}
                                onHover={setHoveredUpazila}
                              />
                            );
                          });
                        }}
                      </Geographies>

                      {/* Route lines */}
                      {waypoints.slice(0, -1).map((wp, i) => {
                        const next = waypoints[i + 1];
                        const [dx, dy] = getScreenDelta(wp.coordinates, next.coordinates);
                        return (
                          <Marker key={`line-${wp.id}`} coordinates={wp.coordinates}>
                            <line
                              x1={0}
                              y1={0}
                              x2={dx}
                              y2={dy}
                              stroke={routeColor}
                              strokeWidth={1.6}
                              strokeDasharray="4 2"
                              markerEnd="url(#trip-arrowhead)"
                              style={{
                                filter: `drop-shadow(0px 0px 3px ${routeColor}80)`,
                              }}
                            />
                          </Marker>
                        );
                      })}

                      {/* Waypoint markers */}
                      {waypoints.map((wp, i) => {
                        const isStart = i === 0;
                        const isEnd = i === waypoints.length - 1 && waypoints.length > 1;
                        const markerFill = isStart
                          ? "#10b981"
                          : isEnd
                          ? "#ef4444"
                          : routeColor;
                        return (
                          <Marker key={wp.id} coordinates={wp.coordinates}>
                            <circle
                              r={6}
                              fill={markerFill}
                              stroke="#ffffff"
                              strokeWidth={1.2}
                            />
                            <text
                              textAnchor="middle"
                              dy="0.32em"
                              fill="#ffffff"
                              fontSize={5.5}
                              fontWeight="900"
                              style={{ pointerEvents: "none", userSelect: "none" }}
                            >
                              {e2b(i + 1)}
                            </text>
                          </Marker>
                        );
                      })}
                    </ComposableMap>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="relative z-20 px-4 pb-4 pt-2 flex flex-col gap-1.5 shrink-0">
                <p
                  className="text-[10px] sm:text-[11px] font-bold leading-tight drop-shadow-md"
                  style={{ color: isDarkBg ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.85)" }}
                >
                  {displayQuote}
                </p>
                <p
                  className="text-[6px] sm:text-[7px] font-black tracking-widest uppercase opacity-60 drop-shadow-sm"
                  style={{ color: isDarkBg ? "#ffffff" : "#000000" }}
                >
                  Generated by CUET Adventure Society
                </p>

                {waypoints.length > 0 && (
                  <div className="mt-1 bg-white/30 dark:bg-black/40 backdrop-blur-md rounded-xl px-3 py-2 border border-white/30 dark:border-white/10 shadow-lg">
                    <div className="flex justify-between items-center gap-2">
                      <div>
                        <p className="text-[8px] font-bold uppercase tracking-wider opacity-70" style={{ color: isDarkBg ? "#ffffff" : "#1e293b" }}>
                          দূরত্ব
                        </p>
                        <p className="text-sm font-black" style={{ color: routeColor }}>
                          {e2b(Math.round(stats.totalDistance))}{" "}
                          <span className="text-[9px]">কি.মি.</span>
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] font-bold uppercase tracking-wider opacity-70" style={{ color: isDarkBg ? "#ffffff" : "#1e293b" }}>
                          স্টপ
                        </p>
                        <p className="text-sm font-black" style={{ color: isDarkBg ? "#ffffff" : "#1e293b" }}>
                          {e2b(stats.count)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-bold uppercase tracking-wider opacity-70" style={{ color: isDarkBg ? "#ffffff" : "#1e293b" }}>
                          সম্ভাব্য দিন
                        </p>
                        <p className="text-sm font-black" style={{ color: routeColor }}>
                          {e2b(stats.totalDays)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="w-full md:w-[380px] flex flex-col gap-6 shrink-0">

            {/* Route List */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  <i className="fa-solid fa-route mr-1 text-orange-500"></i> যাত্রাপথ
                </p>
                {waypoints.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-md"
                  >
                    <i className="fa-solid fa-trash text-[9px]"></i> রিসেট
                  </button>
                )}
              </div>

              {waypoints.length === 0 ? (
                <div className="text-center py-6">
                  <div
                    className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3"
                    style={{ background: `${routeColor}15` }}
                  >
                    <i className="fa-solid fa-map-pin text-xl" style={{ color: routeColor }}></i>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    এখনো কোনো waypoint যোগ করা হয়নি
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    নিচের তালিকা থেকে উপজেলা বেছে নিন
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {waypoints.map((wp, i) => {
                    const isStart = i === 0;
                    const isEnd = i === waypoints.length - 1 && waypoints.length > 1;
                    const markerColor = isStart ? "#10b981" : isEnd ? "#ef4444" : routeColor;
                    const prevWp = waypoints[i - 1];
                    const segmentDist = prevWp
                      ? haversine(prevWp.coordinates, wp.coordinates)
                      : 0;

                    return (
                      <div
                        key={wp.id}
                        className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700"
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-sm"
                          style={{ background: markerColor }}
                        >
                          {e2b(i + 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-gray-800 dark:text-gray-100 truncate">
                            {wp.name}
                          </p>
                          {prevWp ? (
                            <p className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">
                              <i className="fa-solid fa-arrow-up mr-1 text-[8px]"></i>
                              {e2b(segmentDist.toFixed(1))} কি.মি. আগের স্টপ থেকে
                            </p>
                          ) : (
                            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-bold">
                              যাত্রা শুরু
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            onClick={() => handleMoveWaypoint(wp.id, "up")}
                            disabled={i === 0}
                            className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-20 disabled:cursor-not-allowed"
                          >
                            <i className="fa-solid fa-chevron-up text-[8px]"></i>
                          </button>
                          <button
                            onClick={() => handleMoveWaypoint(wp.id, "down")}
                            disabled={i === waypoints.length - 1}
                            className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-20 disabled:cursor-not-allowed"
                          >
                            <i className="fa-solid fa-chevron-down text-[8px]"></i>
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveWaypoint(wp.id)}
                          className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 flex items-center justify-center shrink-0"
                        >
                          <i className="fa-solid fa-xmark text-[10px]"></i>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* HIERARCHY EXPLORER */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                <i className="fa-solid fa-sitemap mr-1 text-emerald-500"></i> এলাকা বেছে নিন
              </p>
              <HierarchyExplorer
                hierarchy={hierarchy}
                waypointKeysByRsmKey={waypointKeysByRsmKey}
                onToggleUpazila={(u) => handleToggleWaypoint(u, u.name)}
                routeColor={routeColor}
              />
            </div>

            {/* Colors */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="mb-5">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
                  <i className="fa-solid fa-fill-drip mr-1 text-blue-500"></i> ব্যাকগ্রাউন্ড
                </p>
                <div className="flex flex-wrap gap-2">
                  {bgColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setBgColor(color.value)}
                      className={`w-7 h-7 rounded-full shadow-sm transition-all border border-gray-300 dark:border-gray-600 ${
                        bgColor === color.value
                          ? "scale-125 ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-gray-800"
                          : "hover:scale-110"
                      }`}
                      style={{ background: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
                  <i className="fa-solid fa-route mr-1 text-red-500"></i> রুটের রং
                </p>
                <div className="flex flex-wrap gap-2">
                  {routeColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setRouteColor(color.value)}
                      className={`w-7 h-7 rounded-full shadow-sm transition-all border border-gray-300 dark:border-gray-600 ${
                        routeColor === color.value
                          ? "scale-125 ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-gray-800"
                          : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
                  <i className="fa-solid fa-map mr-1 text-purple-500"></i> উপজেলার রং
                </p>
                <div className="flex flex-wrap gap-2">
                  {upazilaBaseColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setUpazilaColor(color.value)}
                      className={`w-7 h-7 rounded-full shadow-sm transition-all border border-gray-300 dark:border-gray-600 ${
                        upazilaColor === color.value
                          ? "scale-125 ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-gray-800"
                          : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Quote */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                <i className="fa-solid fa-quote-left mr-1 text-pink-500"></i> কোটেশন
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {quotePresets.map((q) => (
                  <button
                    key={q.key}
                    onClick={() => setQuoteOption(q.key)}
                    className={`px-2.5 py-1 rounded-full text-[9px] font-bold border transition-all leading-tight ${
                      quoteOption === q.key
                        ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white border-transparent shadow-sm"
                        : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-pink-300"
                    }`}
                  >
                    {q.text.length > 22 ? q.text.slice(0, 22) + "..." : q.text}
                  </button>
                ))}
                <button
                  onClick={() => setQuoteOption("custom")}
                  className={`px-2.5 py-1 rounded-full text-[9px] font-bold border transition-all flex items-center gap-1 ${
                    quoteOption === "custom"
                      ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white border-transparent shadow-sm"
                      : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-pink-300"
                  }`}
                >
                  <i className="fa-solid fa-pencil text-[8px]"></i> কাস্টম
                </button>
              </div>
              {quoteOption === "custom" && (
                <>
                  <textarea
                    value={customQuote}
                    onChange={(e) => setCustomQuote(e.target.value.slice(0, 120))}
                    placeholder="আপনার কোটেশন..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                    rows={2}
                  />
                  <p className="text-[9px] text-gray-400 mt-1 text-right">
                    {e2b(customQuote.length)} / ১২০
                  </p>
                </>
              )}
            </div>

            {/* Download */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleDownload("jpg")}
                disabled={downloading || waypoints.length < 2}
                className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest flex justify-center items-center gap-2 transition-all shadow-md ${
                  downloading || waypoints.length < 2
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white hover:shadow-[0_8px_25px_rgba(239,68,68,0.4)] hover:-translate-y-1"
                }`}
              >
                {downloading ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-image"></i>
                )}
                {downloading ? "প্রসেসিং..." : "JPG ডাউনলোড"}
              </button>
              <button
                onClick={() => handleDownload("pdf")}
                disabled={downloading || waypoints.length < 2}
                className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest flex justify-center items-center gap-2 transition-all shadow-md ${
                  downloading || waypoints.length < 2
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-500 text-white hover:shadow-[0_8px_25px_rgba(37,99,235,0.4)] hover:-translate-y-1"
                }`}
              >
                {downloading ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-file-pdf"></i>
                )}
                {downloading ? "প্রসেসিং..." : "PDF ডাউনলোড"}
              </button>
              {waypoints.length < 2 && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
                  ডাউনলোড করতে অন্তত ২টা waypoint লাগবে
                </p>
              )}
            </div>

            {/* Tips */}
            <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-xl border border-amber-200 dark:border-amber-500/30">
              <p className="text-[11px] text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
                <i className="fa-solid fa-lightbulb text-amber-500 mr-1"></i>
                <strong>টিপস:</strong> বিভাগে ক্লিক করলে ঐ বিভাগের জেলা দেখাবে, জেলায় ক্লিক করলে উপজেলা। উপজেলায় ক্লিক করলে waypoint হিসেবে যোগ/বাদ হবে।
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
