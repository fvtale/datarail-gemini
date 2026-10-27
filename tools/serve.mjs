#!/usr/bin/env node
/* Serve site/ for local work.
 *
 *     node tools/serve.mjs [port]
 *
 * The page is mounted at /Gemini/ exactly as production serves it, and
 * /assets/* -- the circuit rails, which belong to the site and not to this
 * repository -- is sent to the live datarail.org. So the preview wears the real
 * rails and the paths in the markup are the paths that ship. Everything else
 * off this folder goes to the live site too, which is what the header and footer
 * links expect.
 *
 * The mount is case-sensitive, like the web server: /Gemini, not /gemini.
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "site");
const PORT = Number(process.argv[2] || 5240);
const MOUNT = "/Gemini";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  const path = decodeURIComponent(url.pathname);

  if (path === "/" || path === MOUNT) {
    response.writeHead(302, { location: `${MOUNT}/` }).end();
    return;
  }

  // Anything not under the mount belongs to the rest of datarail.org.
  if (!path.startsWith(`${MOUNT}/`)) {
    response.writeHead(302, { location: `https://datarail.org${path}` }).end();
    return;
  }

  let file = path.slice(MOUNT.length);
  if (file.endsWith("/")) file += "index.html";

  // Contain everything under site/: a request for ../../ is a bug or a probe,
  // and either way it gets a 403 rather than a file.
  const target = join(ROOT, normalize(file));
  if (!target.startsWith(ROOT)) {
    response.writeHead(403).end("403");
    return;
  }

  try {
    const body = await readFile(target);
    response.writeHead(200, {
      "content-type": TYPES[extname(target)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain" }).end(`404 ${path}`);
  }
}).listen(PORT, () => console.log(`Gemini on http://localhost:${PORT}${MOUNT}/`));
