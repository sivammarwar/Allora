"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  User, Phone, Mail, MapPin, Plus, Trash2, Star,
  Pencil, Check, X, LogOut,
} from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  isDefault: boolean;
  createdAt: string;
}

interface Profile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  gender: string | null;
  profileImageUrl: string | null;
  savedAddresses: SavedAddress[];
}

const LABEL_PRESETS = ["Home", "Office", "Partner's place", "Other"];

export default function UserProfilePage() {
  const qc = useQueryClient();
  const router = useRouter();

  // ── Profile edit state ────────────────────────────────────────────────────
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });

  // ── Add address state ─────────────────────────────────────────────────────
  const [addingAddress, setAddingAddress] = useState(false);
  const [addrForm, setAddrForm] = useState({ label: "Home", address: "", isDefault: false });
  const [customLabel, setCustomLabel] = useState("");

  // ── Fetch profile ─────────────────────────────────────────────────────────
  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ["user", "profile"],
    queryFn: () => api.get("/api/user/profile"),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateProfile = useMutation({
    mutationFn: (data: { name?: string; phone?: string }) =>
      api.patch("/api/user/profile", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "profile"] });
      toast.success("Profile updated");
      setEditingProfile(false);
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const addAddress = useMutation({
    mutationFn: (data: typeof addrForm & { label: string }) =>
      api.post("/api/user/saved-addresses", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "profile"] });
      qc.invalidateQueries({ queryKey: ["user", "saved-addresses"] });
      toast.success("Address saved");
      setAddingAddress(false);
      setAddrForm({ label: "Home", address: "", isDefault: false });
      setCustomLabel("");
    },
    onError: () => toast.error("Failed to save address"),
  });

  const deleteAddress = useMutation({
    mutationFn: (id: string) => api.delete(`/api/user/saved-addresses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "profile"] });
      qc.invalidateQueries({ queryKey: ["user", "saved-addresses"] });
      toast.success("Address removed");
    },
    onError: () => toast.error("Failed to remove address"),
  });

  const setDefault = useMutation({
    mutationFn: (id: string) => api.patch(`/api/user/saved-addresses/${id}/default`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "profile"] });
      qc.invalidateQueries({ queryKey: ["user", "saved-addresses"] });
    },
    onError: () => toast.error("Failed to update default"),
  });

  const handleEditProfile = () => {
    setProfileForm({ name: profile?.name ?? "", phone: profile?.phone ?? "" });
    setEditingProfile(true);
  };

  const handleSaveProfile = () => {
    const data: { name?: string; phone?: string } = {};
    if (profileForm.name.trim()) data.name = profileForm.name.trim();
    if (profileForm.phone.trim()) data.phone = profileForm.phone.trim();
    updateProfile.mutate(data);
  };

  const handleAddAddress = () => {
    const label = addrForm.label === "Other" ? customLabel.trim() : addrForm.label;
    if (!label) { toast.error("Please enter a label"); return; }
    if (!addrForm.address.trim()) { toast.error("Please enter an address"); return; }
    addAddress.mutate({ ...addrForm, label });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-4">

      {/* ── Profile card ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Avatar banner */}
        <div className="h-20 bg-gradient-to-r from-brand-primary/20 to-brand-primary/5" />
        <div className="px-5 pb-5">
          <div className="-mt-9 flex items-end justify-between mb-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border-4 border-white flex items-center justify-center shadow-sm">
              {profile?.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.profileImageUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <User size={26} className="text-brand-primary" />
              )}
            </div>
            {!editingProfile ? (
              <button
                onClick={handleEditProfile}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-primary bg-brand-primary/10 px-3 py-1.5 rounded-full hover:bg-brand-primary/20 transition-colors"
              >
                <Pencil size={12} /> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingProfile(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100"
                >
                  <X size={15} className="text-gray-400" />
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={updateProfile.isPending}
                  className="flex items-center gap-1 text-xs font-medium text-white bg-brand-primary px-3 py-1.5 rounded-full"
                >
                  <Check size={12} /> Save
                </button>
              </div>
            )}
          </div>

          {editingProfile ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Name</label>
                <input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Phone</label>
                <input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div>
                <p className="text-lg font-bold text-gray-900 leading-tight">
                  {profile?.name ?? <span className="text-gray-400 font-normal">No name set</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Mail size={13} className="text-brand-primary flex-shrink-0" />
                <span className="truncate">{profile?.email}</span>
              </div>
              {profile?.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone size={13} className="text-brand-primary flex-shrink-0" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {!profile?.phone && (
                <button
                  onClick={handleEditProfile}
                  className="flex items-center gap-1.5 text-xs text-brand-primary"
                >
                  <Plus size={12} /> Add phone number
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Saved addresses ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <MapPin size={15} className="text-brand-primary" />
            <h2 className="font-semibold text-gray-800 text-sm">Saved Addresses</h2>
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-mono">
              {profile?.savedAddresses.length ?? 0}
            </span>
          </div>
          {!addingAddress && (
            <button
              onClick={() => setAddingAddress(true)}
              className="flex items-center gap-1 text-xs font-medium text-brand-primary bg-brand-primary/10 px-3 py-1.5 rounded-full hover:bg-brand-primary/20 transition-colors"
            >
              <Plus size={12} /> Add
            </button>
          )}
        </div>

        {/* Add form */}
        {addingAddress && (
          <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/60 space-y-3">
            {/* Label presets */}
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1.5">Label</label>
              <div className="flex flex-wrap gap-2">
                {LABEL_PRESETS.map((l) => (
                  <button
                    key={l}
                    onClick={() => setAddrForm((f) => ({ ...f, label: l }))}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      addrForm.label === l
                        ? "bg-brand-primary text-white border-brand-primary"
                        : "bg-white text-gray-600 border-gray-200 hover:border-brand-primary"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {addrForm.label === "Other" && (
                <input
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="Custom label…"
                  className="mt-2 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              )}
            </div>
            {/* Address input */}
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Address</label>
              <textarea
                rows={2}
                value={addrForm.address}
                onChange={(e) => setAddrForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Full address, landmark, city…"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={addrForm.isDefault}
                onChange={(e) => setAddrForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="accent-brand-primary"
              />
              Set as default address
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => { setAddingAddress(false); setAddrForm({ label: "Home", address: "", isDefault: false }); setCustomLabel(""); }}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAddress}
                disabled={addAddress.isPending}
                className="flex-1 py-2 rounded-xl bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors disabled:opacity-60"
              >
                {addAddress.isPending ? "Saving…" : "Save Address"}
              </button>
            </div>
          </div>
        )}

        {/* Address list */}
        {profile?.savedAddresses.length === 0 && !addingAddress ? (
          <div className="px-5 py-8 text-center">
            <MapPin size={28} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">No saved addresses yet.</p>
            <p className="text-xs text-gray-400 mt-0.5">Add one to speed up booking.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {profile?.savedAddresses.map((addr) => (
              <li key={addr.id} className="flex items-start gap-3 px-5 py-3.5">
                <div className="w-8 h-8 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin size={14} className="text-brand-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-semibold text-gray-800">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="text-[9px] bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded-full font-medium">
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{addr.address}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!addr.isDefault && (
                    <button
                      onClick={() => setDefault.mutate(addr.id)}
                      title="Set as default"
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Star size={13} className="text-gray-400" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteAddress.mutate(addr.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Sign out ─────────────────────────────────────────────────────── */}
      <button
        onClick={async () => {
          await api.post("/api/auth/logout", {});
          router.push("/dashboard/login");
        }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 hover:text-red-500 hover:border-red-200 transition-colors"
      >
        <LogOut size={15} /> Sign out
      </button>
    </div>
  );
}
