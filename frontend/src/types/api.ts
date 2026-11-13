/**
 * Backend BarberBooking.Shared.Results.Result karşılığı.
 */
export interface Result {
  success: boolean;
  message: string | null;
  statusCode: number;
  errors: string[] | null;
}

/**
 * Backend BarberBooking.Shared.Results.DataResult<T> karşılığı.
 */
export interface DataResult<T> extends Result {
  data: T | null;
}

/**
 * Backend BarberBooking.Shared.DTOs.Common.ErrorResponseDto karşılığı.
 * GlobalExceptionHandler tarafından döndürülür.
 */
export interface ErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  details?: string | null;
  traceId: string;
  timestamp: string;
  validationErrors?: Record<string, string[]> | null;
}

/**
 * API katmanından gelebilecek tüm hata formatlarının birleşimi.
 */
export type ApiErrorResponse = Result | ErrorResponse;

