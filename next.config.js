/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
};
module.exports = {
  ...nextConfig,
  allowedDevOrigins: ["logical-teal-deeply.ngrok-free.app"],
};
