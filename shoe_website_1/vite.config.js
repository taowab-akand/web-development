import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {prepareFrames} from './scripts/frames.mjs';

// Runs before either the development server or production asset build starts.
await prepareFrames();

export default defineConfig({
  plugins: [react()],
  build: {outDir: 'dist/client'},
  server: {proxy: {'/api': 'http://127.0.0.1:8787'}},
});
