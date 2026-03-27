import { useAppStore } from '@/store/app-store';

/**
 * Convenience hook to grab the current user from the store.
 */
export function useCurrentUser() {
  const user = useAppStore((s) => s.user);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  return { user, isAuthenticated };
}
