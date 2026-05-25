"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/lib/i18n";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 60_000,
          },
        },
      })
  );

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <LanguageProvider>
      <QueryClientProvider client={qc}>
        {children}
        <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#FFF8F9",
            border: "1px solid #E8C9CC",
            color: "#2E1A1A",
            fontFamily: "var(--font-dm-sans)",
          },
        }}
        />
      </QueryClientProvider>
    </LanguageProvider>
    </GoogleOAuthProvider>
  );
}
