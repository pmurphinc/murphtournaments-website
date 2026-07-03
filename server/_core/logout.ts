import { COOKIE_NAME } from "@shared/const";
import type { Request, Response } from "express";
import { getSessionCookieOptions } from "./cookies";

export function clearSessionCookie(req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: -1 });
}

export function handleLogout(req: Request, res: Response) {
  clearSessionCookie(req, res);
  res.redirect(302, "/");
}
