import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return;
              if (id.includes('react') || id.includes('react-dom')) return 'react';
              if (id.includes('@supabase') || id.includes('supabase-js')) return 'supabase';
              if (id.includes('framer-motion')) return 'motion';
              if (id.includes('olamaps') || id.includes('maplibre') || id.includes('mapbox')) return 'maps';
              return 'vendor';
            },
          },
        },
      },
    };
});
