import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

// ── Error Code Enums ─────────────────────────────────────────────────────────

export enum HttpStatusCodes {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export enum DbStatusCodes {
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT_FORMAT = 'INVALID_INPUT_FORMAT',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

// ── App Exception Base ───────────────────────────────────────────────────────

interface AppExceptionOptions {
  message?: string;
  details?: string[];
}

export class AppException extends HttpException {
  readonly code: string;
  readonly appMessage: string;
  readonly appDetails: string[];

  constructor(status: HttpStatus, code: string, { message = '', details = [] }: AppExceptionOptions = {}) {
    super({ code, message, details }, status);
    this.code = code;
    this.appMessage = message;
    this.appDetails = details;
  }
}

export class BadRequestAppException extends AppException {
  constructor(code: string, options: AppExceptionOptions = {}) {
    super(HttpStatus.BAD_REQUEST, code, options);
  }
}

export class UnauthorizedAppException extends AppException {
  constructor(code: string, options: AppExceptionOptions = {}) {
    super(HttpStatus.UNAUTHORIZED, code, options);
  }
}

export class ForbiddenAppException extends AppException {
  constructor(code: string, options: AppExceptionOptions = {}) {
    super(HttpStatus.FORBIDDEN, code, options);
  }
}

export class NotFoundAppException extends AppException {
  constructor(code: string, options: AppExceptionOptions = {}) {
    super(HttpStatus.NOT_FOUND, code, options);
  }
}

export class ConflictAppException extends AppException {
  constructor(code: string, options: AppExceptionOptions = {}) {
    super(HttpStatus.CONFLICT, code, options);
  }
}

export class InternalAppException extends AppException {
  constructor(code: string, options: AppExceptionOptions = {}) {
    super(HttpStatus.INTERNAL_SERVER_ERROR, code, options);
  }
}

// ── Error Response DTO ───────────────────────────────────────────────────────

class ErrorResponse {
  code: string;
  message: string;
  details?: unknown;

  constructor(params: { code: string; message?: string; details?: unknown }) {
    this.code = params.code;
    this.message = params.message ?? '';
    if (params.details !== undefined) this.details = params.details;
  }
}

// ── Success Response DTO ─────────────────────────────────────────────────────

export class SuccessResponse<T> {
  data: T;

  constructor(data: T) {
    this.data = data;
  }
}

// ── Global Exception Filter ─────────────────────────────────────────────────

const HTTP_STATUS_CODE_MAP: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: HttpStatusCodes.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: HttpStatusCodes.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: HttpStatusCodes.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: HttpStatusCodes.NOT_FOUND,
  [HttpStatus.CONFLICT]: HttpStatusCodes.CONFLICT,
};

const QUERY_ERROR_MAP: Record<string, { statusCode: number; code: string; message: string }> = {
  '23505': { statusCode: HttpStatus.CONFLICT, code: DbStatusCodes.DUPLICATE_ENTRY, message: 'A record with the same value already exists' },
  '23503': { statusCode: HttpStatus.BAD_REQUEST, code: DbStatusCodes.FOREIGN_KEY_VIOLATION, message: 'Related resource does not exist' },
  '23502': { statusCode: HttpStatus.BAD_REQUEST, code: DbStatusCodes.MISSING_REQUIRED_FIELD, message: 'A required field is missing' },
  '22P02': { statusCode: HttpStatus.BAD_REQUEST, code: DbStatusCodes.INVALID_INPUT_FORMAT, message: 'Invalid input format' },
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number;
    let body: ErrorResponse;

    if (exception instanceof AppException) {
      statusCode = exception.getStatus();
      body = new ErrorResponse({ code: exception.code, message: exception.appMessage, details: exception.appDetails.length ? exception.appDetails : undefined });

    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      const resBody = typeof res === 'object' ? (res as Record<string, unknown>) : {};
      const rawMessage = typeof res === 'string' ? res : resBody.message;
      const details = Array.isArray(rawMessage) ? rawMessage : undefined;
      const message = Array.isArray(rawMessage) ? '' : (rawMessage as string) ?? '';
      body = new ErrorResponse({ code: HTTP_STATUS_CODE_MAP[statusCode] ?? HttpStatusCodes.INTERNAL_ERROR, message, details });

    } else if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as { code?: string };
      const mapped = driverError?.code ? QUERY_ERROR_MAP[driverError.code] : undefined;
      statusCode = mapped?.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR;
      body = new ErrorResponse(mapped ?? { code: DbStatusCodes.DATABASE_ERROR, message: 'A database error occurred' });

    } else if (exception instanceof EntityNotFoundError) {
      statusCode = HttpStatus.NOT_FOUND;
      body = new ErrorResponse({ code: HttpStatusCodes.NOT_FOUND, message: 'The requested resource was not found' });

    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      body = new ErrorResponse({ code: HttpStatusCodes.INTERNAL_ERROR, message: 'An unexpected error occurred' });
    }

    if (request.method !== 'OPTIONS') {
      this.logger.error(
        `[${request.method}] ${request.url} → ${statusCode} ${body.code}: ${body.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json(body);
  }
}
