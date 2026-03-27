import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
} from '@clerk/clerk-react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import RootLayout from '@/components/RootLayout';
import ChatPage from '@/pages/ChatPage';
import OntologyPage from '@/pages/OntologyPage';
import MapPage from '@/pages/MapPage';
import SignInPage from '@/pages/SignInPage';
import SignUpPage from '@/pages/SignUpPage';
import AdminPage from '@/pages/AdminPage';
import { Toaster } from '@/components/ui/sonner';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/**
 * Wrapper that guards a route — renders children if signed in,
 * otherwise redirects to the Clerk sign-in flow.
 * In dev without Clerk configured, it passes through unprotected.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!CLERK_PUBLISHABLE_KEY) {
    return <>{children}</>;
  }
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

import { ErrorBoundary } from 'react-error-boundary';

function GlobalErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
        <span className="text-destructive font-bold text-xl">!</span>
      </div>
      <h2 className="text-lg font-semibold tracking-tight">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">
        An unexpected error occurred while rendering this module.
      </p>
      <pre className="mt-4 p-4 bg-muted/50 rounded-md text-xs text-left overflow-auto max-w-lg">
        {error.message}
      </pre>
      <button 
        onClick={resetErrorBoundary}
        className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}

/**
 * Core route tree — used both with and without Clerk wrapping.
 */
function AppRouteTree() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      {/* Protected app routes */}
      <Route
        element={
          <ProtectedRoute>
            <RootLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/chat" element={
          <ErrorBoundary FallbackComponent={GlobalErrorFallback}>
            <ChatPage />
          </ErrorBoundary>
        } />
        <Route path="/ontology" element={
          <ErrorBoundary FallbackComponent={GlobalErrorFallback}>
            <OntologyPage />
          </ErrorBoundary>
        } />
        <Route path="/map" element={
          <ErrorBoundary FallbackComponent={GlobalErrorFallback}>
            <MapPage />
          </ErrorBoundary>
        } />
        <Route path="/admin" element={
          <ErrorBoundary FallbackComponent={GlobalErrorFallback}>
            <AdminPage />
          </ErrorBoundary>
        } />
      </Route>

      {/* Catch-all → default to chat */}
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}

/**
 * When Clerk is configured, wrap in ClerkProvider.
 * Without a key (local dev), render routes unprotected.
 */
function AppRoutes() {
  const navigate = useNavigate();

  if (!CLERK_PUBLISHABLE_KEY) {
    console.warn(
      '[Placevote] VITE_CLERK_PUBLISHABLE_KEY not set — running without auth.',
    );
    return <AppRouteTree />;
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      afterSignOutUrl="/sign-in"
    >
      <AppRouteTree />
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster />
    </BrowserRouter>
  );
}
