import { mkdir, readdir, stat } from "node:fs/promises";
import { extname, parse, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceDirectory = resolve(projectRoot, "media");
const outputDirectory = resolve(projectRoot, "media-web");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const videoExtensions = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const imageConcurrency = 4;
const videoConcurrency = 2;

await Promise.all([
  mkdir(sourceDirectory, { recursive: true }),
  mkdir(outputDirectory, { recursive: true }),
]);

async function isCurrent(inputPath, outputPath) {
  try {
    const [inputStat, outputStat] = await Promise.all([stat(inputPath), stat(outputPath)]);
    return outputStat.size > 0 && outputStat.mtimeMs >= inputStat.mtimeMs;
  } catch {
    return false;
  }
}

async function optimizeImage(inputPath, outputPath) {
  if (await isCurrent(inputPath, outputPath)) return "skipped";
  await sharp(inputPath, { animated: true, limitInputPixels: false, failOn: "none" })
    .rotate()
    .resize({ width: 1440, height: 1440, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78, alphaQuality: 82, effort: 4, smartSubsample: true })
    .toFile(outputPath);
  return "converted";
}

async function optimizeVideo(inputPath, outputPath) {
  if (await isCurrent(inputPath, outputPath)) return "skipped";

  const argumentsList = [
    "-hide_banner",
    "-loglevel", "error",
    "-y",
    "-i", inputPath,
    "-map", "0:v:0",
    "-an",
    "-vf", "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "29",
    "-profile:v", "high",
    "-level", "4.0",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outputPath,
  ];

  await new Promise((resolvePromise, rejectPromise) => {
    const process = spawn(ffmpegPath, argumentsList, { stdio: ["ignore", "ignore", "pipe"] });
    let errorOutput = "";
    process.stderr.on("data", (chunk) => { errorOutput += chunk.toString(); });
    process.on("error", rejectPromise);
    process.on("close", (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(errorOutput.trim() || `FFmpeg a quitté avec le code ${code}`));
    });
  });
  return "converted";
}

async function runPool(tasks, concurrency, label) {
  let nextIndex = 0;
  let converted = 0;
  let skipped = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const taskIndex = nextIndex;
      nextIndex += 1;
      const task = tasks[taskIndex];
      const result = await task.run();
      if (result === "converted") converted += 1;
      else skipped += 1;
      const done = converted + skipped;
      console.log(`[${label}] ${done}/${tasks.length} · ${task.name}${result === "skipped" ? " (déjà optimisé)" : ""}`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
  return { converted, skipped };
}

const entries = await readdir(sourceDirectory, { withFileTypes: true });
const imageTasks = [];
const videoTasks = [];

for (const entry of entries) {
  if (!entry.isFile()) continue;
  const extension = extname(entry.name).toLowerCase();
  const inputPath = resolve(sourceDirectory, entry.name);
  const baseName = parse(entry.name).name;

  if (imageExtensions.has(extension)) {
    const outputPath = resolve(outputDirectory, `${baseName}.webp`);
    imageTasks.push({ name: entry.name, run: () => optimizeImage(inputPath, outputPath) });
  } else if (videoExtensions.has(extension)) {
    const outputPath = resolve(outputDirectory, `${baseName}.mp4`);
    videoTasks.push({ name: entry.name, run: () => optimizeVideo(inputPath, outputPath) });
  }
}

imageTasks.sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }));
videoTasks.sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }));

if (imageTasks.length === 0 && videoTasks.length === 0) {
  const optimizedEntries = await readdir(outputDirectory, { withFileTypes: true });
  const optimizedCount = optimizedEntries.filter((entry) => entry.isFile()).length;
  console.log(
    optimizedCount > 0
      ? `Aucun nouvel original dans /media · ${optimizedCount} médias optimisés conservés.`
      : "Aucun média trouvé. Ajoute des photos ou vidéos dans /media.",
  );
}

console.log(`Optimisation de ${imageTasks.length} images et ${videoTasks.length} vidéos…`);
const imageResults = await runPool(imageTasks, imageConcurrency, "image");
const videoResults = await runPool(videoTasks, videoConcurrency, "vidéo");
console.log(
  `Terminé : ${imageResults.converted + videoResults.converted} convertis, ` +
  `${imageResults.skipped + videoResults.skipped} déjà à jour.`,
);
