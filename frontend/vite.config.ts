import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const headers = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy-Report-Only': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: http: data:; connect-src 'self' https: http: ws:; frame-src https: http:; frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
};
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3000' }, headers },
  preview: { headers, proxy: { '/api': 'http://localhost:3000' } },
});
