import { Response } from 'express';
import { ApiResponse } from '../types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiResponse<T>['meta']
): void => {
  const payload: ApiResponse<T> = { success: true, data };
  if (meta) payload.meta = meta;
  res.status(statusCode).json(payload);
};

export const sendCreated = <T>(res: Response, data: T): void => {
  sendSuccess(res, data, 201);
};

export const sendNoContent = (res: Response): void => {
  res.status(204).send();
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errors?: unknown
): void => {
  const payload: ApiResponse & { details?: unknown } = { success: false, error: message };
  if (errors && process.env.NODE_ENV === 'development') {
    payload.details = errors;
  }
  res.status(statusCode).json(payload);
};

export const sendNotFound = (res: Response, entity = 'Resource'): void => {
  sendError(res, `${entity} not found`, 404);
};

export const sendUnauthorized = (res: Response, msg = 'Unauthorized'): void => {
  sendError(res, msg, 401);
};

export const sendForbidden = (res: Response, msg = 'Forbidden'): void => {
  sendError(res, msg, 403);
};

export const sendConflict = (res: Response, msg: string): void => {
  sendError(res, msg, 409);
};

export const sendBadRequest = (res: Response, msg: string): void => {
  sendError(res, msg, 400);
};
