import { existsSync, readdirSync } from "node:fs";
import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assetsPath = path.join(__dirname, "src", "assets");

/**
 * One Vite entry per top-level asset file, named `<basename>_<js|css>` — the names
 * src/app.ts passes to configureGovuk and the layouts then reference as index_js and
 * index_css.
 *
 * Read with readdirSync rather than a glob library: the two directories are flat, so a
 * dependency to list them is a dependency for nothing.
 */
function getEntries(assetsPath: string): Record<string, string> {
  const entries: Record<string, string> = {};
  const resolved = resolve(assetsPath);

  if (existsSync(resolved)) {
    const jsFiles = filesIn(resolve(resolved, "js"), ".ts").filter((file) => !file.endsWith(".d.ts"));
    const cssFiles = filesIn(resolve(resolved, "css"), ".scss");

    for (const asset of [...jsFiles, ...cssFiles]) {
      const fileName = asset.split("/").pop()!;
      const baseName = fileName.replace(/\.(ts|scss)$/, "");
      const fileType = fileName.endsWith(".ts") ? "js" : "css";
      entries[`${baseName}_${fileType}`] = asset;
    }
  }

  return entries;
}

function filesIn(dir: string, extension: string): string[] {
  return existsSync(dir)
    ? readdirSync(dir)
        .filter((name) => name.endsWith(extension))
        .map((name) => path.join(dir, name))
    : [];
}

export default defineConfig({
  build: {
    outDir: "dist/assets",
    emptyOutDir: true,
    rollupOptions: {
      input: getEntries(assetsPath),
      output: {
        entryFileNames: "js/[name]-[hash].js",
        chunkFileNames: "js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "css/[name]-[hash][extname]";
          }
          return "assets/[name]-[hash][extname]";
        }
      }
    },
    sourcemap: process.env.NODE_ENV !== "production",
    minify: process.env.NODE_ENV === "production",
    manifest: true
  },
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        silenceDeprecations: ["import"],
        loadPaths: [path.join(__dirname, "node_modules")]
      }
    },
    devSourcemap: true,
    lightningcss: {
      errorRecovery: true
    }
  },
  resolve: {
    extensions: [".ts", ".js", ".scss", ".css"],
    preserveSymlinks: true
  },
  publicDir: false,
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/govuk-frontend/dist/govuk/assets/fonts/*",
          dest: "fonts"
        },
        {
          src: "node_modules/govuk-frontend/dist/govuk/assets/images/*",
          dest: "images"
        },
        {
          src: "node_modules/govuk-frontend/dist/govuk/assets/manifest.json",
          dest: "."
        },
        {
          src: "src/pages/**/*.{njk,html}",
          dest: "../pages",
          rename: (_fileName: string, _fileExtension: string, fullPath: string) => fullPath.split("src/pages/")[1]
        }
      ]
    })
  ]
});
