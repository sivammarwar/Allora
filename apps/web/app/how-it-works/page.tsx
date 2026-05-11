import Link from "next/link";
import { MapPin, ShoppingBag, CheckCircle, Shield, Zap } from "lucide-react";

export const metadata = { title: "How It Works · Allora" };

const STEPS = [
  {
    num: "01",
    icon: MapPin,
    title: "Share your location",
    desc: "We show you only verified heroes who actually serve your neighborhood — checked and confirmed by our agents. No random listings. Every result is physically nearby.",
  },
  {
    num: "02",
    icon: ShoppingBag,
    title: "Pick your service",
    desc: "Book a haircut, refill a prescription, call an electrician — same cart, multiple heroes. See live pricing with any active discounts before you confirm.",
  },
  {
    num: "03",
    icon: CheckCircle,
    title: "Get it done",
    desc: "Your verified hero completes the service. Pay via UPI or cash. Rate the experience and rebook in one tap.",
  },
];

const FAQS = [
  {
    q: "Who are 'Heroes'?",
    a: "Heroes are local service providers — barbers, tailors, electricians, chemists, and more. Each one is physically visited and verified by an Allora Regional Officer before going live.",
  },
  {
    q: "How does location matching work?",
    a: "When you open Allora we use your GPS location to show only the verified heroes who actually cover your area. Every hero's service zone is confirmed by our agents — so you only ever see providers who can genuinely reach you.",
  },
  {
    q: "What payment methods are accepted?",
    a: "You can pay via UPI or cash on delivery / service completion. Razorpay handles all online transactions securely.",
  },
  {
    q: "Can I cancel a booking?",
    a: "Yes — cancellations are free before the hero is dispatched. Once underway, contact support at hello@allora.app for assistance.",
  },
  {
    q: "How do heroes get paid?",
    a: "Heroes receive 90% of every service charge. Reconciliation is handled daily by a dedicated Allora Payment Manager.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* Header */}
      <section className="bg-gradient-to-br from-brand-primary/6 to-white border-b border-gray-100 py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 bg-brand-primary/10 text-brand-primary text-xs font-semibold px-3 py-1.5 rounded-full">
            <Zap size={12} /> Three taps. Done.
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">How Allora works</h1>
          <p className="text-gray-500 text-base leading-relaxed">
            From opening the app to a completed service — here is every step, explained.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          {STEPS.map(({ num, icon: Icon, title, desc }) => (
            <div key={num} className="flex gap-6 items-start">
              <div className="shrink-0 flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
                  <Icon size={20} className="text-brand-primary" />
                </div>
                <span className="text-[10px] font-black text-brand-primary/40 tracking-widest">{num}</span>
              </div>
              <div className="pt-1 space-y-1.5">
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="py-14 px-4 bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Shield size={18} className="text-brand-primary" />
            <h2 className="text-xl font-extrabold text-gray-900">Why trust us?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { title: "Agent-verified",      desc: "Every hero is visited in person before activation." },
              { title: "Hyperlocal by design",  desc: "Service areas are carefully defined — only real, nearby heroes show up for you." },
              { title: "90% to heroes",        desc: "Honest payouts — reconciled daily." },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-white rounded-xl border border-gray-100 p-5 space-y-1.5">
                <p className="font-bold text-gray-900 text-sm">{title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-8">Frequently asked questions</h2>
          <div className="space-y-6 divide-y divide-gray-100">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="pt-6 first:pt-0 space-y-1.5">
                <h3 className="font-semibold text-gray-900 text-sm">{q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 px-4 border-t border-gray-100 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <h2 className="text-2xl font-extrabold text-gray-900">Ready to get started?</h2>
          <p className="text-sm text-gray-500">Your verified heroes are waiting.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 h-11 px-8 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors">
            Browse Services
          </Link>
        </div>
      </section>

      <div className="border-t border-gray-100 py-5 px-4 text-center">
        <p className="text-xs text-gray-400">© 2026 Allora. Local, on demand. &nbsp;·&nbsp; Made for India 🇮🇳</p>
      </div>
    </main>
  );
}
