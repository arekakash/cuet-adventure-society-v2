/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // ঐচ্ছিক: ছবি অপ্টিমাইজেশনের জন্য (স্ট্যাটিক এক্সপোর্টে এটি অফ রাখতে হয়)
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
