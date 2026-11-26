import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/** Un-hashed files that crawlers / home-screen installs need at stable URLs. */
const STATIC_FILES: Record<string, string> = {
  'og-image.png': './assets/brand/og-image.png',
  'apple-touch-icon.png': './assets/brand/apple-touch-icon.png',
  'favicon.svg': './assets/brand/favicon.svg',
};

function staticFiles(): Plugin {
  return {
    name: 'stepwise-static-files',
    apply: 'build',
    generateBundle() {
      for (const [fileName, src] of Object.entries(STATIC_FILES)) {
        this.emitFile({ type: 'asset', fileName, source: readFileSync(fileURLToPath(new URL(src, import.meta.url))) });
      }
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: 'User-agent: *\nAllow: /\n' });
    },
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [react(), staticFiles()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
