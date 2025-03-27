/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}
module.exports = {
  ...nextConfig,
  allowedDevOrigins: ['logical-teal-deeply.ngrok-free.app'],
}