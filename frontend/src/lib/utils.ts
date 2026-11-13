import axios from 'axios';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ApiErrorResponse } from '@/types/api';

/**
 * Tailwind CSS sınıflarını koşullu olarak birleştirir ve çakışmaları çözer.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Tutarı Türk Lirası formatında biçimlendirir.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Mesafeyi metre veya kilometre cinsinden okunabilir metne çevirir.
 */
export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m uzakta`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km uzakta`;
}

/**
 * Axios veya API hatalarından okunabilir mesaj çıkarır.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'İşlem sırasında beklenmedik bir hata oluştu.',
): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const payload = error.response?.data;
    if (payload?.message) {
      return payload.message;
    }
    if ('errors' in (payload ?? {}) && Array.isArray((payload as { errors?: string[] }).errors)) {
      const firstErr = (payload as { errors?: string[] }).errors?.[0];
      if (firstErr) return firstErr;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
