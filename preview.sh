#!/bin/bash
# Preview el wiki en http://localhost:8080
# Uso: ./preview.sh
# ../knowledge is the only source of wiki content. `content` points there too,
# but the real path lets Quartz read Git dates correctly.
# Para hacer solo el build sin servidor: npx quartz build -d ../knowledge
cd "$(dirname "$0")"
npx quartz build -d ../knowledge
echo ""
echo "Serving at http://localhost:8080 — Ctrl+C para detener"
node - <<'EOF'
const http = require("http");
const fs = require("fs");
const path = require("path");
const PUBLIC = path.join(__dirname, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".xml": "application/xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

http.createServer((req, res) => {
  let urlPath = req.url.split("?")[0];
  let filePath = path.join(PUBLIC, urlPath);

  // try exact path
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serve(filePath, res);
  // try with .html extension (clean URLs)
  } else if (path.extname(filePath) === "" && fs.existsSync(filePath + ".html")) {
    serve(filePath + ".html", res);
  // try index.html for directories
  } else if (fs.existsSync(path.join(filePath, "index.html"))) {
    serve(path.join(filePath, "index.html"), res);
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found: " + urlPath);
  }
}).listen(8080);

function serve(filePath, res) {
  const ext = path.extname(filePath);
  const mime = MIME[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": mime });
  fs.createReadStream(filePath).pipe(res);
}
EOF
