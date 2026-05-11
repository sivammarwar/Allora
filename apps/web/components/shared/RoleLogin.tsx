"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { Eye, EyeOff, KeyRound, ShieldCheck, Lock } from "lucide-react";
import {
  useLoginPassword,
  useSendOtp,
  useVerifyOtp,
  useSetPassword,
} from "@/lib/auth";
import { roleHome, type Role } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OTPInput } from "@/components/shared/OTPInput";

const emailSchema = z.string().email();
const passwordSchema = z.string().min(8, "At least 8 characters");

type Step =
  | "email"        // enter email → check if has password
  | "password"     // has password → enter password to login
  | "otp"          // no password OR reset → enter OTP
  | "set-password"; // after OTP → create/reset password

interface Props {
  role: Role;
  title: string;
  subtitle?: string;
}

function RoleLoginForm({ role, title, subtitle }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || roleHome[role];
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isReset, setIsReset] = useState(false); // true when resetting password

  const loginPassword = useLoginPassword();
  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();
  const setPasswordMutation = useSetPassword();

  // Step 1: user submits email — single call to send-otp which returns hasPassword flag
  const onContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) { toast.error("Enter a valid email"); return; }
    try {
      const { hasPassword } = await sendOtp.mutateAsync({ email: email.trim().toLowerCase(), role });
      if (hasPassword) {
        // User has a password — show password login, no OTP was sent
        setStep("password");
      } else {
        // No password yet — OTP was just sent
        toast.success("Verification code sent. Check your inbox.");
        setIsReset(false);
        setStep("otp");
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : (err instanceof Error ? err.message : "Something went wrong"));
    }
  };

  // Step 2a: login with password
  const onLoginPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    try {
      const { user } = await loginPassword.mutateAsync({ email: email.trim().toLowerCase(), password });
      if (user.role !== role) {
        toast.error(`This account is registered as ${user.role.replace(/_/g," ")}. Use the correct login.`);
        return;
      }
      toast.success("Welcome back!");
      router.replace(redirectTo);
    } catch (err) {
      if (err instanceof ApiError && (err.data as any)?.error === "no_password") {
        // shouldn't happen but handle gracefully
        toast.error("No password set. Use OTP to sign in.");
      } else {
        toast.error(err instanceof ApiError ? err.message : "Invalid credentials");
      }
    }
  };

  // Step 2b (reset): force-send OTP to reset password
  const onStartReset = async () => {
    try {
      await sendOtp.mutateAsync({ email: email.trim().toLowerCase(), role, forceOtp: true });
      toast.success("Reset code sent. Check your inbox.");
      setIsReset(true);
      setOtp("");
      setStep("otp");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send code");
    }
  };

  // Step 3: verify OTP
  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    try {
      const { user } = await verifyOtp.mutateAsync({ email: email.trim().toLowerCase(), otp });
      if (user.role !== role) {
        toast.error(`This account is registered as ${user.role.replace(/_/g," ")}. Use the correct login.`);
        return;
      }
      // OTP verified + user is now authenticated — go to set-password
      setStep("set-password");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Invalid or expired code");
    }
  };

  // Step 4: save new password
  const onSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    try {
      await setPasswordMutation.mutateAsync({ password });
      toast.success(isReset ? "Password updated! Logging you in…" : "Password created! Welcome.");
      router.replace(redirectTo);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save password");
    }
  };

  const pending =
    loginPassword.isPending ||
    sendOtp.isPending || verifyOtp.isPending || setPasswordMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md card-surface p-8 sm:p-10 page-enter">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-2">
          allora · {role.replace(/_/g, " ").toLowerCase()}
        </p>
        <h1 className="font-heading text-3xl text-brand-text mb-1.5">{title}</h1>
        {subtitle && <p className="text-brand-textMuted text-sm mb-8">{subtitle}</p>}

        {/* ── Step 1: Email ── */}
        {step === "email" && (
          <form onSubmit={onContinue} className="space-y-5 mt-8">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
            />
            <Button type="submit" size="lg" className="w-full" loading={pending}>
              Continue
            </Button>
          </form>
        )}

        {/* ── Step 2a: Password login ── */}
        {step === "password" && (
          <form onSubmit={onLoginPassword} className="space-y-5 mt-8">
            <p className="text-sm text-brand-textMuted -mt-2">
              Signing in as <span className="font-medium text-brand-text">{email}</span>
            </p>
            <div className="relative">
              <Input
                label="Password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-8 text-brand-textMuted hover:text-brand-text"
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Button type="submit" size="lg" className="w-full" loading={loginPassword.isPending} disabled={!password}>
              <Lock size={14} className="mr-2" /> Sign in
            </Button>
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => { setStep("email"); setPassword(""); }}
                className="text-sm text-brand-textMuted hover:text-brand-text"
              >
                ← Different email
              </button>
              <button
                type="button"
                onClick={onStartReset}
                disabled={sendOtp.isPending}
                className="text-sm text-brand-primary hover:underline"
              >
                {sendOtp.isPending ? "Sending…" : "Reset password"}
              </button>
            </div>
          </form>
        )}

        {/* ── Step 3: OTP ── */}
        {step === "otp" && (
          <form onSubmit={onVerifyOtp} className="space-y-5 mt-8">
            <div className="flex items-start gap-3 p-3 rounded-sm bg-brand-surface border border-brand-border">
              <ShieldCheck size={16} className="text-brand-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-brand-textMuted">
                {isReset ? "Enter the reset code sent to " : "Enter the code sent to "}
                <span className="font-medium text-brand-text">{email}</span>
              </p>
            </div>
            <OTPInput value={otp} onChange={setOtp} autoFocus disabled={verifyOtp.isPending} />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={verifyOtp.isPending}
              disabled={otp.length !== 6}
            >
              Verify code
            </Button>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setStep(isReset ? "password" : "email"); setOtp(""); }}
                className="text-sm text-brand-textMuted hover:text-brand-text"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={onStartReset}
                disabled={sendOtp.isPending}
                className="text-sm text-brand-textMuted hover:text-brand-text"
              >
                {sendOtp.isPending ? "Sending…" : "Resend code"}
              </button>
            </div>
          </form>
        )}

        {/* ── Step 4: Set / Reset password ── */}
        {step === "set-password" && (
          <form onSubmit={onSetPassword} className="space-y-5 mt-8">
            <div className="flex items-start gap-3 p-3 rounded-sm bg-brand-surface border border-brand-border">
              <KeyRound size={16} className="text-brand-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-brand-textMuted">
                {isReset ? "Create your new password." : "Set a password to use for future logins."}
              </p>
            </div>
            <div className="relative">
              <Input
                label="New password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-8 text-brand-textMuted hover:text-brand-text"
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Input
              label="Confirm password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={pending}
            />
            {password.length > 0 && password.length < 8 && (
              <p className="text-xs text-amber-600">Password must be at least 8 characters</p>
            )}
            {confirm.length > 0 && password !== confirm && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={setPasswordMutation.isPending}
              disabled={password.length < 8 || password !== confirm}
            >
              <KeyRound size={14} className="mr-2" />
              {isReset ? "Update password" : "Set password & sign in"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export function RoleLogin(props: Props) {
  return (
    <Suspense>
      <RoleLoginForm {...props} />
    </Suspense>
  );
}
