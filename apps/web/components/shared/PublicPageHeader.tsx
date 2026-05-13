"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface Props {
  backHref?: string;
  backLabel?: string;
}

export function PublicPageHeader({ backHref = "/dashboard", backLabel }: Props) {
  const { lang, setLang } = useLanguage();
  return (
    <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
      <Link
        href={backHref}
        className="flex items-center gap-1 text-xs text-brand-primary hover:underline font-medium"
      >
        <ChevronLeft size={13} />
        {backLabel ?? (lang === "hi" ? "वापस जाएं" : "Back to Allora")}
      </Link>
      <button
        onClick={() => setLang(lang === "en" ? "hi" : "en")}
        className="flex items-center justify-center h-7 px-2.5 rounded-full border border-gray-200 bg-white hover:bg-brand-primary/10 hover:border-brand-primary/40 active:scale-95 transition-all text-[11px] font-semibold text-gray-700 select-none"
      >
        {lang === "en" ? "हिं" : "EN"}
      </button>
    </div>
  );
}
