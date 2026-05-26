declare module 'next-pwa' {
  import type { NextConfig } from 'next'
  const withPWA: (config?: Record<string, unknown>) => (nextConfig: NextConfig) => NextConfig
  export default withPWA
}
