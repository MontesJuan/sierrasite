import type { NextApiRequest, NextApiResponse } from "next";
import archiver from "archiver";
import path from "path";

export const config = { api: { responseLimit: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") { res.status(405).json({ error: "METHOD_NOT_ALLOWED" }); return; }
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="SIERRA-press-kit.zip"');
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => { if (!res.headersSent) res.status(500); res.end(String(err)); });
  archive.pipe(res);
  archive.directory(path.join(process.cwd(), "public", "assets", "press"), false);
  await archive.finalize();
}
