"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, MailOpen, Phone, MapPin, Clock, User, Loader2, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

interface Submission {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string | null;
  message: string;
  isRead: boolean;
  source: string;
  createdAt: string;
}

export default function ContactSubmissionsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data: submissions = [], isLoading } = useQuery<Submission[]>({
    queryKey: ["pm", "contact-submissions", filter],
    queryFn: () =>
      api.get(`/api/pm/contact-submissions${filter === "unread" ? "?unread=true" : ""}`),
  });

  const { data: stats } = useQuery<{ total: number; unread: number }>({
    queryKey: ["pm", "contact-submissions", "stats"],
    queryFn: () => api.get("/api/pm/contact-submissions/stats"),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/api/pm/contact-submissions/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm", "contact-submissions"] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Contact Submissions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Messages from the contact form on the website and app.
          </p>
        </div>
        {stats && (
          <div className="flex gap-3 text-sm">
            <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 font-medium">
              Total: {stats.total}
            </span>
            {stats.unread > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-red-50 text-red-600 font-semibold">
                Unread: {stats.unread}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-brand-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "All" : "Unread"}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-gray-400" size={28} />
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            {filter === "unread" ? "No unread submissions" : "No contact submissions yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((s) => (
            <div
              key={s.id}
              className={`rounded-2xl border p-5 space-y-3 transition-colors ${
                s.isRead
                  ? "border-gray-100 bg-white"
                  : "border-brand-primary/20 bg-brand-primary/[0.02]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${
                    s.isRead ? "bg-gray-100 text-gray-500" : "bg-brand-primary/10 text-brand-primary"
                  }`}>
                    {s.isRead ? <MailOpen size={16} /> : <Mail size={16} />}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(s.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                      {" · "}
                      <span className="uppercase text-[10px] font-semibold tracking-wider">
                        {s.source}
                      </span>
                    </p>
                  </div>
                </div>
                {!s.isRead && (
                  <button
                    onClick={() => markRead.mutate(s.id)}
                    disabled={markRead.isPending}
                    className="text-xs px-3 py-1.5 rounded-lg bg-brand-primary text-white font-medium hover:bg-brand-secondary transition-colors disabled:opacity-50"
                  >
                    Mark Read
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={13} className="text-gray-400 flex-shrink-0" />
                  <a href={`tel:${s.phone}`} className="hover:text-brand-primary">{s.phone}</a>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail size={13} className="text-gray-400 flex-shrink-0" />
                  <a href={`mailto:${s.email}`} className="hover:text-brand-primary truncate">{s.email}</a>
                </div>
                {s.address && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{s.address}</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {s.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
