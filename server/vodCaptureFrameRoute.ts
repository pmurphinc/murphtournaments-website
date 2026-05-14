import type { RequestHandler } from "express";
import { access } from "node:fs/promises";
import { resolveVodCaptureFramePath } from "./vodFrameCapture";

export async function getSafeVodCaptureFramePathForRequest(
  vodAnalysisId: string,
  captureJobId: string,
  fileName: string,
  cacheRoot?: string
): Promise<string | null> {
  const framePath = resolveVodCaptureFramePath(
    vodAnalysisId,
    captureJobId,
    fileName,
    cacheRoot
  );

  if (!framePath) return null;

  try {
    await access(framePath);
    return framePath;
  } catch {
    return null;
  }
}

export const serveVodCaptureFrame: RequestHandler = async (req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");

  try {
    const framePath = await getSafeVodCaptureFramePathForRequest(
      req.params.vodAnalysisId,
      req.params.captureJobId,
      req.params.fileName
    );

    if (!framePath) {
      res.status(404).json({ error: "VOD capture frame not found." });
      return;
    }

    res.type("jpg").sendFile(framePath);
  } catch (error) {
    next(error);
  }
};
