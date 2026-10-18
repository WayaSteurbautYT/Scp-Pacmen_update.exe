import { defineConfig } from "vite";
import { fileURLToPath } from "url";

export default defineConfig({
  resolve: {
    alias: {
      "@assets": fileURLToPath(new URL("./assets", import.meta.url)),
      "@src": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Relative base so the built bundle resolves its art from the document
  // instead of the site root; required for the packaged Electron build.
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    // Phaser's loader treats any url starting with "data:" as base64 and runs
    // atob() on it. Vite inlines small assets as URL-encoded (non-base64) data
    // URIs, which throws InvalidCharacterError and aborts the Phaser preload.
    // Keep every asset as a real file URL so the atlas loaders always work.
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // `[ext]` has no leading dot; `[extname]` renders as ".svg"/".json".
        // Without the dot the built atlases ship as extension-less files like
        // "pacmen-atlas-X86gT-7hsvg", which static hosts serve as
        // application/octet-stream instead of an image.
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.includes("ghost-atlas")) return "assets/characters/ghost-atlas-[name][extname]";
          if (assetInfo.name?.includes("runner-atlas")) return "assets/characters/runner-atlas-[name][extname]";
          if (assetInfo.name?.includes("character-animations")) return "assets/characters/character-animations[extname]";
          if (assetInfo.name?.includes("maze-objects")) return "assets/characters/maze-objects-atlas-[name][extname]";
          if (assetInfo.name?.includes("special-pellets")) return "assets/characters/special-pellets-atlas-[name][extname]";
          if (assetInfo.name?.includes("ability-effects")) return "assets/characters/ability-effects-atlas-[name][extname]";
          if (assetInfo.name?.includes("neon-maze-icon")) return "assets/[name][extname]";
          if (assetInfo.name?.includes("scp-maze-background")) return "assets/[name][extname]";
          if (assetInfo.name?.includes("neon-maze-intro")) return "assets/[name][extname]";
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
  server: {
    port: 5173,
    host: "127.0.0.1",
  },
});
