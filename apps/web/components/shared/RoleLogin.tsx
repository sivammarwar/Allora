"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { useSendOtp, useVerifyOtp } from "@/lib/auth";
import { roleHome, type Role } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OTPInput } from "@/components/shared/OTPInput";

const emailSchema = z.string().email();

interface Props {
  role: Role;
  title: string;
  subtitle?: string;
}

export function RoleLogin({ role, title, subtitle }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();

  const onSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setEmailError("Enter a valid email address");
      return;
    }
    setEmailError(null);
    try {
      await sendOtp.mutateAsync({ email, role });
      toast.success("OTP sent. Check your inbox.");
      setStep("otp");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to send OTP";
      toast.error(msg);
    }
  };

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    try {
      const { user } = await verifyOtp.mutateAsync({ email, otp });
      if (user.role !== role) {
        toast.error(
          `This email is registered as ${user.role}. Use the ${user.role.toLowerCase()} login.`
        );
        return;
      }
      toast.success("Welcome back");
      router.replace(roleHome[user.role]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Invalid OTP";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md card-surface p-8 sm:p-10 page-enter">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-2">
          allora · {role.replace(/_/g, " ").toLowerCase()}
        </p>
        <h1 className="font-heading text-3xl text-brand-text mb-1.5">{title}</h1>
        {subtitle && (
          <p className="text-brand-textMuted text-sm mb-8">{subtitle}</p>
        )}

        {step === "email" ? (
          <form onSubmit={onSendOtp} className="space-y-5">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError ?? undefined}
              disabled={sendOtp.isPending}
            />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={sendOtp.isPending}
            >
              Send verification code
            </Button>
          </form>
        ) : (
          <form onSubmit={onVerifyOtp} className="space-y-5">
            <div>
              <p className="text-sm text-brand-textMuted mb-3">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-brand-text">{email}</span>
              </p>
              <OTPInput
                value={otp}
                onChange={setOtp}
                autoFocus
                disabled={verifyOtp.isPending}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={verifyOtp.isPending}
              disabled={otp.length !== 6}
            >
              Verify & continue
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtp("");
              }}
              className="block w-full text-center text-sm text-brand-textMuted hover:text-brand-text"
            >
              ← Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
