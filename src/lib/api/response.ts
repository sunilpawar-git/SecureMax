/**
 * Uniform API response helpers.
 * Every route should use these instead of raw NextResponse.json().
 */

import { NextResponse } from 'next/server';

export interface ValidationError {
  field: string;
  message: string;
}

export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function apiValidationError(errors: ValidationError[]): NextResponse {
  return NextResponse.json(
    { error: 'Validation failed', validation_errors: errors },
    { status: 422 },
  );
}
