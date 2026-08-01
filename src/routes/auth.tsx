import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Zaloguj się lub utwórz konto — Deadline" },
      {
        name: "description",
        content:
          "Utwórz darmowe konto w Deadline, aby zapisywać terminy ważności i odbierać przypomnienia e-mail.",
      },
      { property: "og:title", content: "Konto w aplikacji Deadline" },
      {
        property: "og:description",
        content: "Zaloguj się e-mailem lub kontem Google i pilnuj terminów swojej firmy.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentConfirm, setSentConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      toast.error("Podaj poprawny adres e-mail");
      return;
    }
    if (password.length < 8) {
      toast.error("Hasło musi mieć co najmniej 8 znaków");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: mail,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Konto utworzone");
          navigate({ to: "/" });
        } else {
          setSentConfirm(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (error) throw error;
        toast.success("Zalogowano");
        navigate({ to: "/" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Coś poszło nie tak";
      toast.error(
        message.includes("Invalid login credentials")
          ? "Nieprawidłowy e-mail lub hasło"
          : message.includes("already registered")
            ? "Takie konto już istnieje — zaloguj się"
            : message,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Nie udało się zalogować przez Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" />
          </span>
          <span className="text-lg font-semibold">Deadline</span>
        </div>

        {sentConfirm ? (
          <div className="panel space-y-3 p-6">
            <h1 className="text-lg font-semibold">Sprawdź skrzynkę</h1>
            <p className="text-sm text-muted-foreground">
              Wysłaliśmy link potwierdzający na <span className="font-medium">{email}</span>. Kliknij
              go, aby aktywować konto i wrócić do aplikacji.
            </p>
            <Button variant="outline" onClick={() => setSentConfirm(false)}>
              Wróć
            </Button>
          </div>
        ) : (
          <div className="panel space-y-5 p-6">
            <div>
              <h1 className="text-lg font-semibold">
                {mode === "signup" ? "Utwórz konto" : "Zaloguj się"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "signup"
                  ? "Konto pozwala zapisać terminy i włączyć przypomnienia e-mail."
                  : "Wróć do swoich terminów i przypomnień."}
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
              Kontynuuj z Google
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              lub e-mailem
              <span className="h-px flex-1 bg-border" />
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="auth-email">Adres e-mail</Label>
                <Input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="np. anna@mojafirma.pl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-password">Hasło</Label>
                <Input
                  id="auth-password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder="min. 8 znaków"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Chwilka…" : mode === "signup" ? "Utwórz konto" : "Zaloguj się"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              {mode === "signup" ? "Masz już konto?" : "Nie masz konta?"}{" "}
              <button
                type="button"
                className="font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              >
                {mode === "signup" ? "Zaloguj się" : "Utwórz konto"}
              </button>
            </p>
          </div>
        )}

        <p className="mt-4 text-center text-sm">
          <Link to="/" className="text-muted-foreground underline-offset-4 hover:underline">
            Wróć do aplikacji
          </Link>
        </p>
      </div>
    </div>
  );
}
