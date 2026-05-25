#!/usr/bin/env python3
import pathlib

content = r'''"use client";
import Link from "next/link";
import { MapPin, Zap, ShieldCheck, Star, ChevronRight, Smartphone } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const AGRI = [
  { e: "\u{1F69C}", en: "Tractor Repair", hi: "\u0924\u094D\u0930\u0948\u0915\u094D\u091F\u0930 \u092E\u0930\u092E\u094D\u092E\u0924" },
'''

# Actually let's just write from a proper multiline string
pathlib.Path("/Users/shivamkumarsingh/Documents/Homero/apps/web/app/page.tsx").write_text(PAGE, encoding="utf-8")
print("done")
