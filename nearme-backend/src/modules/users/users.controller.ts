import { Request, Response } from 'express';
import * as UsersService from './users.service';
import { sendSuccess, sendNoContent, sendBadRequest } from '../../utils/response';
import { asyncHandler } from '../../utils/errors';
import { buildMeta } from '../../utils/helpers';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await UsersService.getMyProfile(req.user!.id);
  sendSuccess(res, user);
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await UsersService.updateMyProfile(req.user!.id, req.body);
  sendSuccess(res, user);
});

export const getPublicProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await UsersService.getPublicProfile(req.params.handleOrId);
  sendSuccess(res, profile);
});

export const checkHandle = asyncHandler(async (req: Request, res: Response) => {
  const { handle } = req.params;
  const available = await UsersService.checkHandle(handle, req.user?.id);
  sendSuccess(res, { handle, available });
});

export const requestDeletion = asyncHandler(async (req: Request, res: Response) => {
  const result = await UsersService.requestDeletion(req.user!.id);
  sendSuccess(res, result);
});

export const cancelDeletion = asyncHandler(async (req: Request, res: Response) => {
  await UsersService.cancelDeletion(req.user!.id);
  sendNoContent(res);
});

// ── Admin controllers ──────────────────────────────────────────────────────────

export const adminListUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, search, role, is_active } = req.query;
  const { users, total } = await UsersService.adminListUsers(page, limit, search as string, role as string, is_active as string);
  const { page: p, limit: l } = require('../../utils/helpers').parsePagination(page, limit, 100);
  sendSuccess(res, users, 200, buildMeta(total, p, l));
});

export const adminGetUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await UsersService.adminGetUser(req.params.userId);
  sendSuccess(res, user);
});

export const banUser = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body as { reason?: string };
  await UsersService.setBanStatus(req.params.userId, true, req.user!.id, reason);
  sendNoContent(res);
});

export const unbanUser = asyncHandler(async (req: Request, res: Response) => {
  await UsersService.setBanStatus(req.params.userId, false, req.user!.id);
  sendNoContent(res);
});

export const setUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body as { role: string };
  if (!role) { sendBadRequest(res, 'Role is required'); return; }
  await UsersService.setUserRole(req.params.userId, role, req.user!.id);
  sendNoContent(res);
});
