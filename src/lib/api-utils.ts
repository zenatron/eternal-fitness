// 🚀 UNIFIED API UTILITIES
// Single source of truth for API patterns, auth, validation, and responses

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';

// ============================================================================
// RESPONSE UTILITIES
// ============================================================================

/**
 * Standardized success response
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

/**
 * Standardized error response with consistent logging
 */
export function errorResponse(message: string, status = 500, details?: any) {
  const errorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.error(`[API Error ${errorId}] ${status}: ${message}`, {
    details: details ? JSON.stringify(details) : undefined,
    timestamp: new Date().toISOString(),
    stack: new Error().stack,
  });

  return NextResponse.json(
    { 
      error: { 
        message, 
        id: errorId,
        ...(details && { details }) 
      } 
    },
    { status }
  );
}

// ============================================================================
// AUTHENTICATION UTILITIES
// ============================================================================

/**
 * Require authentication and return userId
 * Throws standardized error if not authenticated
 */
export async function requireAuth(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new ApiError('Unauthorized', 401);
  }
  return userId;
}

/**
 * Custom API Error class for consistent error handling
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================================================
// REQUEST VALIDATION UTILITIES
// ============================================================================

/**
 * Parse and validate request body with Zod schema
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      throw new ApiError('Invalid request data', 400, result.error.errors);
    }
    
    return result.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Invalid JSON in request body', 400);
  }
}

/**
 * Parse and validate URL search parameters
 */
export function validateSearchParams<T>(
  request: Request,
  schema: z.ZodSchema<T>
): T {
  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());
  
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new ApiError('Invalid search parameters', 400, result.error.errors);
  }
  
  return result.data;
}

// ============================================================================
// API ROUTE WRAPPER
// ============================================================================

/**
 * Unified API route handler wrapper
 * Handles auth, validation, errors, and responses consistently
 */
export function createApiHandler<T = any>(
  handler: (userId: string, request: Request, params?: any) => Promise<T>
) {
  return async (request: Request, context?: { params: Promise<any> }) => {
    try {
      const userId = await requireAuth();
      const params = context?.params ? await context.params : undefined;
      
      const result = await handler(userId, request, params);
      return successResponse(result);
    } catch (error) {
      if (error instanceof ApiError) {
        return errorResponse(error.message, error.status, error.details);
      }
      
      console.error('Unexpected API error:', error);
      return errorResponse(
        'Internal server error',
        500,
        error instanceof Error ? error.message : String(error)
      );
    }
  };
}

/**
 * Create API handler with request validation
 */
export function createValidatedApiHandler<TBody, TResult = any>(
  schema: z.ZodSchema<TBody>,
  handler: (userId: string, data: TBody, request: Request, params?: any) => Promise<TResult>
) {
  return createApiHandler(async (userId, request, params) => {
    const data = await validateRequest(request, schema);
    return handler(userId, data, request, params);
  });
}

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

/**
 * Common ID parameter schema
 */
export const idParamsSchema = z.object({
  id: z.string().cuid(),
});

/**
 * Common pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * Common search schema
 */
export const searchSchema = z.object({
  q: z.string().optional(),
  sort: z.enum(['asc', 'desc']).default('desc'),
  sortBy: z.string().default('createdAt'),
});
