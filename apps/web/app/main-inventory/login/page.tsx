"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, ShieldCheck, Lock, BarChart2 } from "lucide-react";
import { useSendOtp, useVerifyOtp, useLoginPassword, useSetPassword } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OTPInput } from "@/components/shared/OTPInput";

const ALLOWED_EMAIL = "govindkkp+maininventory@gmail.com";
type Step = "email" | "password" | "otp" | "set-password";

export default function MainInventoryLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isReset, setIsReset] = useState(false);

  const sendOtp = useSendOtp();
  const verifyOtp = useVerifyOtp();
  const loginPassword = useLoginPassword();
  const setPasswordMutation = useSetPassword();

  const redirectHome = () => router.replace("/main-inventory");

  const onContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    try {
      const { hasPassword } = await sendOtp.mutateAsync({ email: trimmed });
      setStep(hasPassword ? "password" : "otp");
      if (!hasPassword) toast.success("Verification code sent. Check your inbox.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  };

  const onLoginPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { user } = await loginPassword.mutateAsync({ email: email.trim().toLowerCase(), password });
      if (user.email !== ALLOWED_EMAIL) {
        toast.error("Access denied for this account.");
        return;
      }
      toast.success("Welcome!");
      redirectHome();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Invalid credentials");
    }
  };

  const onStartReset = async () => {
    try {
      await sendOtp.mutateAsync({ email: email.trim().toLowerCase(), forceOtp: true });
      toast.success("Reset code sent.");
      setIsReset(true);
      setOtp("");
      setStep("otp");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send code");
    }
  };

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    try {
      const { user } = await verifyOtp.mutateAsync({ email: email.trim().toLowerCase(), otp });
      if (user.email !== ALLOWED_EMAIL) {
        toast.error("Access denied for this account.");
        return;
      }
      setStep("set-password");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Invalid or expired code");
    }
  };

  const onSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("At least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    try {
      await setPasswordMutation.mutateAsync({ password });
      toast.success(isReset ? "Password updated!" : "Password set! Welcome.");
      redirectHome();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save password");
    }
  };

  const pending = sendOtp.isPending || verifyOtp.isPending || loginPassword.isPending || setPasswordMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 size={18} className="text-blue-600" />
          <p className="font-mono text-[11px] uppercase tracking-widest text-blue-600">Bharat Services · Inventory Viewer</p>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
        <p className="text-sm text-gray-400 mb-8">Access the main inventory dashboard.</p>

        {step === "email" && (
          <form onSubmit={onContinue} className="space-y-5">
            <Input label="Email address" type="email" placeholder="you@example.com" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} disabled={pending} />
            <Button type="submit" size="lg" className="w-full" loading={pending}>Continue</Button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={onLoginPassword} className="space-y-5">
            <p className="text-sm text-gray-400">Signing in as <span className="font-medium text-gray-900">{email}</span></p>
            <div className="relative">
              <Input label="Password" type={showPw ? "text" : "password"} autoFocus value={password} onChange={(e) => setPassword(e.target.value)} disabled={pending} />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-8 text-gray-400" tabIndex={-1}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Button type="submit" size="lg" className="w-full" loading={loginPassword.isPending} disabled={!password}>
              <Lock size={14} className="mr-2" /> Sign in
            </Button>
            <div className="flex justify-between pt-1">
              <button type="button" onClick={() => { setStep("email"); setPassword(""); }} className="text-sm text-gray-400 hover:text-gray-700">← Back</button>
              <button type="button" onClick={onStartReset} disabled={sendOtp.isPending} className="text-sm text-blue-500 hover:underline">
                {sendOtp.isPending ? "Sending…" : "Reset password"}
              </button>
            </div>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={onVerifyOtp} className="space-y-5">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <ShieldCheck size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">{isReset ? "Enter reset code sent to " : "Enter code sent to "}<span className="font-medium text-gray-900">{email}</span></p>
            </div>
            <OTPInput value={otp} onChange={setOtp} autoFocus disabled={verifyOtp.isPending} />
            <Button type="submit" size="lg" className="w-full" loading={verifyOtp.isPending} disabled={otp.length !== 6}>Verify code</Button>
            <div className="flex justify-between">
              <button type="button" onClick={() => { setStep(isReset ? "password" : "email"); setOtp(""); }} className="text-sm text-gray-400 hover:text-gray-700">← Back</button>
              <button type="button" onClick={onStartReset} disabled={pending} className="text-sm text-gray-400 hover:text-gray-700">{pending ? "Sending…" : "Resend code"}</button>
            </div>
          </form>
        )}

        {step === "set-password" && (
          <form onSubmit={onSetPassword} className="space-y-5">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <KeyRound size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">{isReset ? "Create your new password." : "Set a password for future logins."}</p>
            </div>
            <div className="relative">
              <Input label="New password" type={showPw ? "text" : "password"} autoFocus value={password} onChange={(e) => setPassword(e.target.value)} disabled={pending} />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-8 text-gray-400" tabIndex={-1}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Input label="Confirm password" type={showPw ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={pending} />
            {password.length > 0 && password.length < 8 && <p className="text-xs text-amber-600">At least 8 characters</p>}
            {confirm.length > 0 && password !== confirm && <p className="text-xs text-red-500">Passwords do not match</p>}
            <Button type="submit" size="lg" className="w-full" loading={setPasswordMutation.isPending} disabled={password.length < 8 || password !== confirm}>
              <KeyRound size={14} className="mr-2" />{isReset ? "Update password" : "Set password & sign in"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
