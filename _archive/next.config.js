/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    deviceSizes: [320, 640, 768, 1024, 1280, 1536, 1920, 2560],
    imageSizes:  [320, 480, 640, 800, 1024, 1280],
    formats: ['image/webp'],
  },
}
module.exports = nextConfig
