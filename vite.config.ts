import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'fs'

// UI (web) version — single source of truth is package.json "version".
// Injected at build time as the global __APP_VERSION__.
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))

/**
 * The first screens a kiosk paints are the login and, behind it, onboarding.
 * Their images live inside the JS bundle, so the browser cannot know they
 * exist until it has fetched 434 KB, parsed a megabyte and a half of it,
 * mounted React and resolved the theme — by which point several seconds have
 * gone and the fetch has not started. Naming them in the head starts them
 * alongside the JS instead of after it; they are small, and they are the two
 * pictures somebody is actually waiting on.
 *
 * Matched by source stem, so a rebuild's new content hash is picked up on its
 * own. A device already branded to a hospital with its own artwork pays for
 * one unused wallpaper here; that is the trade, and it is a small one.
 */
const PRELOAD = ['wallpaper-', 'careinn-logo-lockup-', 'careinn-hospital-hero-']

function preloadFirstPaint() {
  return {
    name: 'careinn-preload-first-paint',
    apply: 'build' as const,
    transformIndexHtml: {
      order: 'post' as const,
      handler(html: string, ctx: any) {
        const files = Object.keys(ctx?.bundle ?? {}).filter((f) =>
          PRELOAD.some((stem) => f.includes(stem))
        )
        return {
          html,
          tags: files.map((f) => ({
            tag: 'link',
            attrs: {
              rel: 'preload',
              as: 'image',
              href: './' + f,
              fetchpriority: 'high',
            },
            injectTo: 'head' as const,
          })),
        }
      },
    },
  }
}

/**
 * pdf.js decodes JPEG 2000 and ICC colour through WebAssembly, and it will not
 * guess where those binaries are: without a `wasmUrl` it gives up on every JPX
 * image and renders the page with its pictures missing. The Fakeeh patient
 * guide is 12,811 JPEG 2000 images, so it came out blank and read as corrupt.
 *
 * pdf.js appends the bare filename to `wasmUrl`, so these cannot be hashed.
 * Emitted from node_modules at a fixed path rather than committed, so they
 * cannot drift out of step with the pdfjs-dist the build actually resolves.
 */
const PDFJS_WASM_DIR = path.resolve(__dirname, 'node_modules/pdfjs-dist/wasm')
const PDFJS_WASM_FILES = ['openjpeg.wasm', 'qcms_bg.wasm']
export const PDFJS_WASM_URL = '/pdfjs-wasm/'

function pdfjsWasm() {
  return {
    name: 'careinn-pdfjs-wasm',
    // The dev server has no public/ copy to fall back on, so serve them here
    // at the same path the build emits — one source of truth for both.
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const match = /^\/pdfjs-wasm\/([\w.-]+)$/.exec((req.url || '').split('?')[0])
        if (!match || !PDFJS_WASM_FILES.includes(match[1])) return next()
        res.setHeader('Content-Type', 'application/wasm')
        res.end(readFileSync(path.join(PDFJS_WASM_DIR, match[1])))
      })
    },
    generateBundle(this: any) {
      for (const file of PDFJS_WASM_FILES) {
        this.emitFile({
          type: 'asset',
          fileName: `pdfjs-wasm/${file}`,
          source: readFileSync(path.join(PDFJS_WASM_DIR, file)),
        })
      }
    },
  }
}

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    preloadFirstPaint(),
    pdfjsWasm(),
    VitePWA({
      registerType: 'autoUpdate',
      // We register it ourselves in updateCheck.ts, which also watches for the
      // handover. The injected script only registers, and registering twice
      // is the smaller of the two problems with it.
      injectRegister: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB limit
        skipWaiting: true,
        clientsClaim: true,
        // Prevent service worker from hijacking static HTML page loads inside iframes
        navigateFallbackDenylist: [
          /^\/reports\//,
          /^\/nfc-login\//,
          /CareInn Welcome Slideshow\.html$/
        ],
        // Hospital API is http:// — service workers can only cache HTTPS,
        // so it's implicitly excluded from runtime caching.
        runtimeCaching: [
          {
            // Build assets carry a content hash, so a URL never changes
            // meaning and the cache is always right to answer first.
            //
            // StaleWhileRevalidate rather than CacheFirst, though: CacheFirst
            // never looks again. An entry that went in wrong — and entries in
            // this app have gone in wrong twice, HTML stored under an image's
            // URL — stays wrong until somebody clears site data, and one
            // browser sits broken while another is fine. This serves the cache
            // just as fast and refetches behind it, so a bad entry heals on
            // the next load. The refetch is nearly free: these responses carry
            // immutable/max-age=1y, so it comes from the HTTP cache.
            //
            // They are kept out of the shell rule below. The reason used to be
            // that the demo server answered a file it did not have with 200 and
            // the index page: under NetworkFirst that HTML is a cacheable 200,
            // it gets stored under the image's own URL, and the browser renders
            // a web page as a photograph — which is to say it renders nothing —
            // for as long as the entry lives.
            //
            // That is no longer true here. Checked against demo.careinn.com on
            // 22 Sep 2026: a missing file under /assets/ returns a real 404, so
            // cacheableResponse below rejects it and nothing poisons the cache.
            //
            // It is still true everywhere else on that server. A missing path
            // outside /assets/ — anything shipped from public/, say — answers
            // 200 with the index page, and the shell rule accepts 200. So the
            // separation stays: /assets/ is the half that is safe, and it is
            // safe because of the 404, not because of the handler.
            urlPattern: ({ url }) =>
              url.origin === self.location.origin && url.pathname.includes('/assets/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'careinn-build-assets',
              expiration: {
                maxEntries: 400,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              // 200 only. A 206 is a video range request, which belongs on the
              // network, and a 0 is an opaque response worth nothing here.
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.origin === self.location.origin && !url.pathname.includes('/assets/'),
            handler: 'NetworkFirst',
            // Four seconds was short enough that a slow server lost the race to
            // its own cache, and the kiosk kept coming up on the build before
            // last. The shell is small; it is worth waiting for.
            options: {
              cacheName: 'careinn-app-shell',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              plugins: [
                {
                  /* A URL that names a file type cannot honestly answer with a
                     page. Outside /assets/ this server still returns 200 and
                     the index page for a path it does not have, and
                     NetworkFirst would write that HTML into the cache under
                     the missing file's own URL — after which the browser
                     renders a web page as a photograph, which is to say it
                     renders nothing, until the entry expires a week later.
                     One missing file becomes a week-long hole.

                     Dropping the cache write is the whole fix. The response
                     still reaches the page, so a genuinely missing file fails
                     now and succeeds the moment it is deployed, instead of
                     failing for as long as the entry lives.

                     Extensions only, and .html is deliberately not among them:
                     the shell, /reports/, /nfc-login/ and the slideshow are
                     HTML and must keep caching. A path with no extension is a
                     navigation and is left alone. */
                  cacheWillUpdate: async ({ request, response }) => {
                    if (!response) return null;
                    /* request.url, not response.url: an opaque response carries
                       an empty url and new URL('') throws, and the cache key is
                       the request either way. */
                    const path = new URL(request.url).pathname;
                    const dot = path.lastIndexOf('.');
                    const slash = path.lastIndexOf('/');
                    const ext = dot > slash ? path.slice(dot + 1).toLowerCase() : '';
                    const NEVER_HTML = [
                      'png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'svg', 'ico',
                      'pdf', 'mp4', 'webm', 'mp3', 'woff', 'woff2', 'ttf', 'otf',
                      'json', 'csv', 'js', 'css', 'wasm',
                    ];
                    if (NEVER_HTML.indexOf(ext) === -1) return response;
                    const type = response.headers.get('content-type') || '';
                    return type.indexOf('text/html') === -1 ? response : null;
                  },
                },
              ],
            },
          },
        ],
      },
      manifest: {
        name: 'CareInn',
        short_name: 'CareInn',
        description: 'Hospital Bedside Kiosk',
        theme_color: '#008AAB',
        background_color: '#0F1923',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          {
            src: '/favicon.ico',
            /* Every frame the file actually carries, generated from
               public/assets/logos/CI-icon-circle.png. It declared 64x64 alone
               while no such file was deployed at all, so nothing ever checked
               and the server answered the icon request with the index page. */
            sizes: '16x16 32x32 48x48 64x64 128x128 256x256',
            type: 'image/x-icon',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
build: {
    chunkSizeWarningLimit: 2000,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-ui': ['@radix-ui/react-slider', 'lucide-react', 'motion'],
          'vendor-pdf': ['react-pdf', 'pdfjs-dist'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['@emotion/is-prop-valid'],
  },
  server: {
    headers: {
      'bypass-tunnel-reminder': 'true',
    },
  },
})
