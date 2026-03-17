/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Env vars available server-side
  env: {
    N8N_WEBHOOK: process.env.N8N_WEBHOOK || 'https://n8n.navbharatwater.one/webhook/bank',
  },
}

module.exports = nextConfig
