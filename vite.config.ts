import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH is set by the GitHub Pages workflow to "/<repo>/".
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [
    react(),
    // /play is a route in the app. Without this, the dev server would serve play.html for it.
    {
      name: 'play-route',
      configureServer(server: any) {
        server.middlewares.use((req: any, _res: any, next: () => void) => {
          if (req.url && /^\/play\/?(\?.*)?$/.test(req.url)) req.url = '/';
          next();
        });
      },
    },
  ],
  build: { rollupOptions: { input: { main: 'index.html', play: 'play.html' } } },
  test: { environment: 'node' },
} as any);
