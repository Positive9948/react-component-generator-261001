import type { GeneratedComponent, Provider } from '../types';

export function parseProvider(value: unknown): Provider {
  return value === 'anthropic' || value === 'google' ? value : 'google';
}

export function parseComponents(value: unknown): GeneratedComponent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (
      typeof item?.id !== 'string' ||
      typeof item.prompt !== 'string' ||
      typeof item.code !== 'string'
    ) {
      return [];
    }
    const createdAt = new Date(item.createdAt);
    if (Number.isNaN(createdAt.getTime())) return [];
    return [{ id: item.id, prompt: item.prompt, code: item.code, createdAt }];
  });
}

export function parseHistory(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}
