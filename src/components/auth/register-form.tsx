"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser, type RegisterState } from "@/app/actions/register";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating…" : "Create account"}
    </Button>
  );
}

const initial: RegisterState = {};

export function RegisterForm() {
  const [state, formAction] = useActionState(registerUser, initial);

  if (state.ok) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-[var(--foreground)]">You&apos;re all set.</p>
        <Button asChild className="w-full">
          <Link href="/login?registered=1">Continue to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" type="text" autoComplete="name" required minLength={2} />
        {state.fieldErrors?.name?.[0] && (
          <p className="text-xs text-red-300">{state.fieldErrors.name[0]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {state.fieldErrors?.email?.[0] && (
          <p className="text-xs text-red-300">{state.fieldErrors.email[0]}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        {state.fieldErrors?.password?.[0] && (
          <p className="text-xs text-red-300">{state.fieldErrors.password[0]}</p>
        )}
      </div>
      {state.error && (
        <p className="text-sm text-red-300" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton />
      <p className="text-center text-sm text-[var(--muted-foreground)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
