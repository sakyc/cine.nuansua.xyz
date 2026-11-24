import { ServiceError } from './errors';

export const slugParameter = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,249}$/.test(value)) {
    throw new ServiceError(400, 'Invalid content slug');
  }
  return value;
};

export const positiveInteger = (value: unknown, fallback: number, max: number, name: string): number => {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new ServiceError(400, `${name} must be a positive integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    throw new ServiceError(400, `${name} must be between 1 and ${max}`);
  }
  return parsed;
};
