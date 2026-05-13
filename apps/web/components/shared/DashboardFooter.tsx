"use client";

import Link from "next/link";
import { MapPin, Shield, Star, Zap } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const TRUST_ICONS = [Shield, MapPin, Star, Zap];

const C = {
  en: {
    tagline: "Your neighborhood, on demand. Verified local heroes — one tap away.",
    badge: "Local services · on demand",
    exploreH: "Explore",
    companyH: "Company",
    legalH: "Legal",
    trust: ["Agent-verified heroes", "Hyperlocal, by design", "Honest 90% payouts", "Three taps. Done."],
    explore: [
      { label: "Browse Services", href: "/dashboard" },
      { label: "My Bookings",     href: "/dashboard/bookings" },
      { label: "My Profile",      href: "/dashboard/profile" },
      { label: "Most Rated",      href: "/dashboard#most-rated" },
    ],
    company: [
      { label: "About Allora",  href: "/about",           external: false },
      { label: "How It Works",  href: "/how-it-works",    external: false },
      { label: "Become a Hero", href: "https://allora-web.vercel.app/hero/login", external: true },
    ],
    legal: [
      { label: "Privacy Policy",   href: "/legal/privacy" },
      { label: "Terms of Service", href: "/legal/terms" },
      { label: "Refund Policy",    href: "/legal/refund" },
      { label: "Contact Us",       href: "/about#contact" },
    ],
    copy: "© 2026 Allora. Local, on demand.",
    madeFor: "Made for India",
  },
  hi: {
    tagline: "आपका पड़ोस, मांग पर। सत्यापित स्थानीय हीरो — एक टैप दूर।",
    badge: "स्थानीय सेवाएं · मांग पर",
    exploreH: "एक्सप्लोर",
    companyH: "कंपनी",
    legalH: "कानूनी",
    trust: ["एजेंट-सत्यापित हीरो", "डिज़ाइन से हाइपरलोकल", "ईमानदार 90% भुगतान", "तीन टैप. हो गया।"],
    explore: [
      { label: "सेवाएं देखें",     href: "/dashboard" },
      { label: "मेरी बुकिंग",      href: "/dashboard/bookings" },
      { label: "मेरी प्रोफ़ाइल",   href: "/dashboard/profile" },
      { label: "सर्वाधिक रेटेड",   href: "/dashboard#most-rated" },
    ],
    company: [
      { label: "Allora के बारे में", href: "/about",        external: false },
      { label: "यह कैसे काम करता है", href: "/how-it-works", external: false },
      { label: "हीरो बनें",          href: "https://allora-web.vercel.app/hero/login", external: true },
    ],
    legal: [
      { label: "गोपनीयता नीति",  href: "/legal/privacy" },
      { label: "सेवा की शर्तें", href: "/legal/terms" },
      { label: "रिफंड नीति",     href: "/legal/refund" },
      { label: "संपर्क करें",    href: "/about#contact" },
    ],
    copy: "© 2026 Allora. स्थानीय, मांग पर।",
    madeFor: "Made for India",
  },
};

export function DashboardFooter() {
  const { lang } = useLanguage();
  const c = C[lang] ?? C.en;

  return (
    <footer className="mt-20 border-t border-gray-200 bg-white">

      {/* ── Trust strip ───────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 py-7">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {c.trust.map((label, i) => {
              const Icon = TRUST_ICONS[i];
              return (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-primary/8 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-brand-primary" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 leading-tight">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main grid ─────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="col-span-2 sm:col-span-1 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-primary flex items-center justify-center">
                <MapPin size={15} className="text-white" />
              </div>
              <span className="font-bold text-gray-900 text-xl tracking-tight">Allora</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-[200px]">{c.tagline}</p>
            <p className="text-xs text-brand-primary font-semibold tracking-widest uppercase">{c.badge}</p>
          </div>

          {/* Explore */}
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{c.exploreH}</p>
            <ul className="space-y-3.5">
              {c.explore.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-gray-600 hover:text-brand-primary transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{c.companyH}</p>
            <ul className="space-y-3.5">
              {c.company.map(({ label, href, external }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-gray-600 hover:text-brand-primary transition-colors"
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{c.legalH}</p>
            <ul className="space-y-3.5">
              {c.legal.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-gray-600 hover:text-brand-primary transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-gray-400">{c.copy}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{c.madeFor}</span>
            <span className="text-lg">🇮🇳</span>
          </div>
        </div>
      </div>

    </footer>
  );
}
