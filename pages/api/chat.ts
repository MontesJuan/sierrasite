import type { NextApiRequest, NextApiResponse } from "next";
import { answerPublicQuestion } from "../../lib/public-agent";
export const config = { api: { bodyParser: { sizeLimit: "8kb" } } };
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }
  const { message, locale } = req.body || {};
  if (
    typeof message !== "string" ||
    message.trim().length < 1 ||
    message.length > 1200
  )
    return res
      .status(400)
      .json({ error: "Escribí una consulta de hasta 1200 caracteres." });
  return res.json(answerPublicQuestion(message, locale === "en" ? "en" : "es"));
}
