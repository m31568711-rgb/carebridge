import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

export default defineConfig(() => {
  return {
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    // Sites serves a Worker from dist/server and binds static files from
    // dist/client. Keeping the two outputs separate also prevents the SPA
    // fallback worker from being published as a browser asset.
    build: { outDir: 'dist/client' },
    css: { postcss: { plugins: [tailwindcss()] } },
    optimizeDeps: { exclude: ['lucide-react'] },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    server: {
      watch: {
        ignored: ['**/work/**', '**/.sites-tmp/**', '**/dist/**'],
        ...(isCodexSeatbeltSandbox ? { useFsEvents: false, usePolling: true } : {}),
      },
    },
    plugins: [react(), sites()],
  };
});
