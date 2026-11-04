/** @type {import('next').NextConfig} */
const nextConfig = {
  // YouTube IFrame 需要 Referer（設計文件 §3.5，避免 153 錯誤）
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }],
      },
    ];
  },
};

export default nextConfig;
