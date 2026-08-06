import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/reset-hasla")({
  head: () =>
    pageHead({
      path: "/reset-hasla",
      title: "Ustaw nowe hasło",
      description: "Ustaw nowe hasło do swojego konta w aplikacji Deadline.",
      noindex: true,
    }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Link z maila tworzy sesję typu "recovery" — czekamy, aż Supabase ją wczyta.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Hasło musi mieć co najmniej 8 znaków");
      return;
    }
    if (password !== confirm) {
      toast.error("Hasła nie są identyczne");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Hasło zostało zmienione");
      navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zmienić hasła");
    } finally {
      setBusy(false);
    }
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

        <div className="panel space-y-5 p-6">
          <div>
            <h1 className="text-lg font-semibold">Ustaw nowe hasło</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {ready
                ? "Wpisz nowe hasło — minimum 8 znaków."
                : "Otwórz tę stronę z linku, który wysłaliśmy na Twój e-mail."}
            </p>
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nowe hasło</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                placeholder="min. 8 znaków"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!ready}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password-2">Powtórz hasło</Label>
              <Input
                id="new-password-2"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={!ready}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || !ready}>
              {busy ? "Chwilka…" : "Zapisz nowe hasło"}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm">
          <Link to="/auth" className="text-muted-foreground underline-offset-4 hover:underline">
            Wróć do logowania
          </Link>
        </p>
      </div>
    </div>
  );
}
