import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget =
    env.VITE_DOC_PROXY_MODE === 'gateway'
      ? env.VITE_GATEWAY_API_PROXY_TARGET || env.VITE_API_PROXY_TARGET
      : env.VITE_API_PROXY_TARGET || env.VITE_GATEWAY_API_PROXY_TARGET;

  return {
    base: './',
    worker: { format: 'es' },
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5777,
      proxy: {
        '/api': {
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          target: proxyTarget || 'http://localhost:8000',
        },
      },
    },
  };
});
