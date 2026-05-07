"use client";

import { useQuery } from "@tanstack/react-query";
import { useCurrentUser, useLogout } from "@/lib/auth";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { User, MapPin, Phone, Mail, ShieldCheck, LogOut, FileText, Info, MessageCircle } from "lucide-react";

interface MeResponse {
  state: string;
  profile?: {
    shopName: string;
    phone: string | null;
    address: string | null;
    isVerifiedByAgent: boolean;
    verifiedByAgent?: { user?: { name: string | null } } | null;
  };
}

export default function SecretShopProfilePage() {
  const { data: user } = useCurrentUser();
  const logoutMut = useLogout();
  const router = useRouter();
  const { data: me } = useQuery<MeResponse>({
    queryKey: ["secret-shop", "me"],
    queryFn: () => api.get("/api/secret-shop/me"),
  });

  const profile = me?.profile;

  return (
    <div className="px-4 py-5 space-y-5 max-w-lg mx-auto">
      {/* Avatar + name */}
      <div className="flex flex-col items-center py-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-2">
        <div className="w-16 h-16 rounded-full bg-brand-primary/10 flex items-center justify-center">
          <User size={28} className="text-brand-primary" />
        </div>
        <h2 className="font-bold text-xl text-gray-900">{profile?.shopName ?? user?.name ?? "My Shop"}</h2>
        {profile?.isVerifiedByAgent ? (
          <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">
            <ShieldCheck size={12} /> Verified Shop
          </div>
        ) : (
          <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full">Verification Pending</div>
        )}
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Mail size={16} className="text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Email</p>
            <p className="text-sm font-medium text-gray-800">{user?.email ?? "—"}</p>
          </div>
        </div>
        {profile?.phone && (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Phone size={16} className="text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Phone</p>
              <p className="text-sm font-medium text-gray-800">{profile.phone}</p>
            </div>
          </div>
        )}
        {profile?.address && (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <MapPin size={16} className="text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Address</p>
              <p className="text-sm font-medium text-gray-800">{profile.address}</p>
            </div>
          </div>
        )}
        {profile?.verifiedByAgent?.user?.name && (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <ShieldCheck size={16} className="text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Regional Officer</p>
              <p className="text-sm font-medium text-gray-800">{profile.verifiedByAgent.user.name}</p>
            </div>
          </div>
        )}
      </div>

      {/* Links */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        <a href="https://wa.me/917979011181" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3.5">
          <MessageCircle size={16} className="text-green-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-800">Contact Support</span>
        </a>
        <a href="/privacy-policy" className="flex items-center gap-3 px-4 py-3.5">
          <FileText size={16} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-800">Privacy Policy</span>
        </a>
        <a href="/about" className="flex items-center gap-3 px-4 py-3.5">
          <Info size={16} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-800">About Allora</span>
        </a>
      </div>

      {/* Sign out */}
      <button
        onClick={async () => { await logoutMut.mutateAsync(); router.replace("/secret-shop/login"); }}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors"
      >
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  );
}
