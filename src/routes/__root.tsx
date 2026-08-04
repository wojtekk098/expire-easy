import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,

  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DeadlineProvider } from "@/lib/deadline-store";
import { ThemeProvider } from "@/lib/theme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { registerAppServiceWorker } from "@/lib/pwa";
import { useAuth } from "@/hooks/useAuth";



function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Nie ma takiej strony</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Strona, której szukasz, nie istnieje albo została przeniesiona.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Wróć do dashboardu
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Ta strona się nie wczytała
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Coś poszło nie tak. Spróbuj odświeżyć albo wróć na start.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Spróbuj ponownie
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Wróć na start
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Deadline — pilnuj terminów ważności w firmie" },
      {
        name: "description",
        content:
          "Prosty tracker terminów ważności dla małych firm: polisy, certyfikaty, umowy, domeny i przeglądy w jednym miejscu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0F4C4C" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Deadline" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const PUBLIC_PATHS = ["/auth", "/potwierdz-przypomnienia", "/regulamin", "/prywatnosc", "/zwroty", "/oauth"];

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    registerAppServiceWorker();
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated && !isPublic) {
      navigate({ to: "/auth", replace: true });
    }
  }, [loading, isAuthenticated, isPublic, navigate]);

  if (isPublic) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Outlet />
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  if (loading || !isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <p className="text-sm text-muted-foreground">Wczytywanie…</p>
      </div>
    );
  }



  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <DeadlineProvider>
          <SidebarProvider>
            <div className="flex min-h-screen w-full bg-background">
              <AppSidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <PaymentTestModeBanner />
                <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur md:px-6">
                  <SidebarTrigger />
                  <span className="text-sm font-medium text-muted-foreground">Deadline</span>
                  <div className="ml-auto">
                    <ThemeToggle />
                  </div>
                </header>
                <main className="min-w-0 flex-1 px-3 py-6 md:px-6 md:py-8">
                  {/* Required: nested routes render here. */}
                  <Outlet />
                </main>
                <footer className="border-t border-border px-3 py-5 md:px-6">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <span>© {new Date().getFullYear()} Deadline</span>
                    <Link to="/regulamin" className="hover:text-foreground">
                      Regulamin
                    </Link>
                    <Link to="/prywatnosc" className="hover:text-foreground">
                      Polityka prywatności
                    </Link>
                    <Link to="/zwroty" className="hover:text-foreground">
                      Zwroty i reklamacje
                    </Link>
                    <Link to="/pro" className="hover:text-foreground">
                      Cennik
                    </Link>
                  </div>
                </footer>

              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </DeadlineProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

