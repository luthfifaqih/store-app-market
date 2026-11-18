"use client";

import { useActionMutation, useAlertForm } from "@/lib/alert/hooks";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { Field } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({ email: z.string().trim().email("Masukkan email yang valid."), password: z.string().min(1, "Isi kata sandi.") });
type LoginValues = z.infer<typeof loginSchema>;

export function AdminLogin() {
  const form = useAlertForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const login = useActionMutation({ loadingTitle: "Memeriksa akun…", successTitle: "Berhasil masuk", successMode: "none", onInvalid: form.onInvalid, errorTitle: "Login gagal" }, {
    mutationFn: (values: LoginValues) => api("/admin/login", "POST", values, true),
    onSuccess: () => window.location.replace("/admin"),
  });
  return <Card className="panel">
    <h1>Masuk admin</h1>
    <form className="form-stack" noValidate onSubmit={form.handleSubmit((values) => login.mutate(values))}>
      <Field label="Email" error={form.formState.errors.email?.message}><Input type="email" autoComplete="username" {...form.register("email")} /></Field>
      <Field label="Kata sandi" error={form.formState.errors.password?.message}><Input type="password" autoComplete="current-password" {...form.register("password")} /></Field>
      
      <Button type="submit" disabled={login.isPending || login.isSuccess}>{login.isPending || login.isSuccess ? "Sedang masuk…" : "Masuk"}</Button>
    </form>
  </Card>;
}
