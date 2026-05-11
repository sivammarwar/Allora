import Link from "next/link";
import { MapPin, Shield, Star, Zap } from "lucide-react";

const EXPLORE = [
  { label: "Browse Services", href: "/dashboard" },
  { label: "My Bookings",     href: "/dashboard/bookings" },
  { label: "My Profile",      href: "/dashboard/profile" },
  { label: "Most Rated",      href: "/dashboard#most-rated" },
];

const COMPANY = [
  { label: "About Allora",    href: "/about" },
  { label: "How It Works",    href: "/how-it-works" },
  { label: "Become a Hero",   href: "/hero/register" },
  { label: "Secret Shop",     href: "/secret-shop" },
];

const LEGAL = [
  { label: "Privacy Policy",  href: "/legal/privacy" },
  { label: "Terms of Service",href: "/legal/terms" },
  { label: "Refund Policy",   href: "/legal/refund" },
  { label: "Contact Us",      href: "/about#contact" },
];

const TRUST_BADGES = [
  { icon: Shield,  label: "Agent-verified heroes" },
  { icon: MapPin,  label: "Hyperlocal, by design" },
  { icon: Star,    label: "Honest 90% payouts" },
  { icon: Zap,     label: "Three taps. Done." },
];

export function DashboardFooter() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">

      {/* ── Trust strip ───────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-brand-primary/8 flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-brand-primary" />
                </div>
                <span className="text-[11px] font-medium text-gray-600 leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main grid ─────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="col-span-2 sm:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-brand-primary flex items-center justify-center">
                <MapPin size={13} className="text-white" />
              </div>
              <span className="font-bold text-gray-900 text-base tracking-tight">Allora</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed max-w-[180px]">
              Your neighborhood, on demand. Verified local heroes — one tap away.
            </p>
            <p className="text-[10px] text-brand-primary font-semibold tracking-widest uppercase">
              Local services · on demand
            </p>
          </div>

          {/* Explore */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Explore</p>
            <ul className="space-y-2.5">
              {EXPLORE.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-[12px] text-gray-600 hover:text-brand-primary transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Company</p>
            <ul className="space-y-2.5">
              {COMPANY.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-[12px] text-gray-600 hover:text-brand-primary transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Legal</p>
            <ul className="space-y-2.5">
              {LEGAL.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-[12px] text-gray-600 hover:text-brand-primary transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-gray-400">© 2026 Allora. Local, on demand.</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400">Made for India</span>
            <span className="text-base">🇮🇳</span>
          </div>
        </div>
      </div>

    </footer>
  );
}
