import { readdir, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const mediaDirectory = resolve(projectRoot, "media-web");
const outputFile = resolve(projectRoot, "media-manifest.js");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const videoExtensions = new Set([".mp4", ".webm", ".mov", ".m4v"]);

const entries = await readdir(mediaDirectory, { withFileTypes: true });
const media = entries
  .filter((entry) => entry.isFile())
  .map((entry) => {
    const extension = extname(entry.name).toLowerCase();
    const type = imageExtensions.has(extension) ? "image" : videoExtensions.has(extension) ? "video" : null;
    if (!type) return null;
    const encodedName = entry.name.split("/").map(encodeURIComponent).join("/");
    return { type, src: `media-web/${encodedName}` };
  })
  .filter(Boolean)
  .sort((a, b) => a.src.localeCompare(b.src, "fr", { numeric: true }));

const contents = `// Généré automatiquement par npm run generate:media\nwindow.BIRTHDAY_MEDIA = ${JSON.stringify(media, null, 2)};\n`;
await writeFile(outputFile, contents, "utf8");
console.log(`${media.length} médias ajoutés à media-manifest.js`);
