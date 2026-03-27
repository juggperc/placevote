import { useAppStore } from '@/store/app-store';

const rawApiBase = import.meta.env.VITE_API_BASE_URL?.trim() ?? '';
const apiOrigin = rawApiBase
  ? rawApiBase.replace(/\/+$/, '').replace(/\/api$/, '')
  : '';

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/api/')
    ? path
    : `/api/${path.replace(/^\/+/, '')}`;

  return `${apiOrigin}${normalizedPath}`;
}

export function isUuid(value: string | null | undefined): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export async function getAuthHeaders(): Promise<HeadersInit> {
  const getAuthToken = useAppStore.getState().getAuthToken;

  if (!getAuthToken) {
    return {};
  }

  const token = await getAuthToken().catch(() => null);
  return token ? { Authorization: `Bearer ${token}` } : {};
}
