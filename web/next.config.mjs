import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // /now 與 /channel/[id] 在執行期讀 repo 根目錄的 data/epg（Vercel root 是 web/），要明確打包進函式
  outputFileTracingRoot: path.join(here, '..'),
  outputFileTracingIncludes: {
    '/now': ['../data/epg/**/*.json'],
    '/channel/[id]': ['../data/epg/**/*.json'],
  },
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
