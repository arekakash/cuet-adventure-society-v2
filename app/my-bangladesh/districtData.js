// app/my-bangladesh/districtData.js

export const fetchDistrictsData = async () => {
  try {
    // এটি আমার তৈরি করা একটি ডেমো JSON ফাইলের লিংক, যেখানে ৬৪ জেলার ডেটা আছে
    const response = await fetch('https://raw.githubusercontent.com/fahimreza-pro/bangladesh-geojson/master/bd-districts.json');
    const data = await response.json();
    
    // GeoJSON ডেটা থেকে শুধু আমাদের দরকারি অংশটুকু (id, name, d) বের করে নিচ্ছি
    const formattedDistricts = data.features.map(feature => ({
      id: feature.properties.ADM2_EN.toLowerCase().replace(/\s+/g, '-'), // যেমন: "Cox's Bazar" -> "cox's-bazar"
      name: feature.properties.ADM2_EN, // জেলার ইংরেজি নাম
      nameBn: feature.properties.ADM2_BN, // জেলার বাংলা নাম
      d: feature.properties.d // SVG পাথ
    }));

    return formattedDistricts;
  } catch (error) {
    console.error("Error fetching district data:", error);
    return [];
  }
};
