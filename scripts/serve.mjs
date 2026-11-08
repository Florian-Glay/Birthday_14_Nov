import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const preferredPort = Number(process.env.PORT || 4173);
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

async function handleRequest(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = resolve(root, requested);

  if (!filePath.startsWith(`${root}${sep}`) || !existsSync(filePath) || !(await stat(filePath)).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Introuvable");
    return;
  }

  const fileStat = await stat(filePath);
  const range = request.headers.range;
  const headers = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-cache",
    "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
  };

  if (range) {
    const [startText, endText] = range.replace("bytes=", "").split("-");
    const start = Number(startText);
    const end = endText ? Number(endText) : fileStat.size - 1;
    response.writeHead(206, {
      ...headers,
      "Content-Length": end - start + 1,
      "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
    });
    createReadStream(filePath, { start, end }).pipe(response);
    return;
  }

  response.writeHead(200, { ...headers, "Content-Length": fileStat.size });
  createReadStream(filePath).pipe(response);
}

function listen(port, attemptsRemaining = 10) {
  const server = createServer(handleRequest);

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsRemaining > 0 && !process.env.PORT) {
      const nextPort = port + 1;
      console.log(`Le port ${port} est déjà utilisé · essai du port ${nextPort}…`);
      server.close();
      listen(nextPort, attemptsRemaining - 1);
      return;
    }

    console.error(
      error.code === "EADDRINUSE"
        ? `Le port ${port} est déjà utilisé. Ferme l’ancien serveur ou choisis un autre port avec $env:PORT.`
        : error,
    );
    process.exitCode = 1;
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`Anniversaire de Lou : http://127.0.0.1:${port}`);
  });
}

listen(preferredPort);
