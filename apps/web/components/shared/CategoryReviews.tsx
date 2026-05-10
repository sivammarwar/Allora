"use client";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Star, ThumbsUp, ThumbsDown, UserCircle, Pencil, Trash2,
  Send, Loader2, ChevronDown,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReviewUser {
  id: string;
  name: string | null;
  profileImageUrl: string | null;
}

interface Review {
  id: string;
  rating: number;
  reviewText: string | null;
  likes: number;
  dislikes: number;
  myReaction: "LIKE" | "DISLIKE" | null;
  isOwn: boolean;
  createdAt: string;
  user: ReviewUser;
}

interface ReviewsData {
  reviews: Review[];
  total: number;
  avgRating: number | null;
  totalCount: number;
  page: number;
  pages: number;
}

interface PendingBooking {
  id: string;
  scheduledDate: string;
  scheduledHour: number;
  subcategory: { name: string; category: { id: string; name: string } };
}

// ─── Star renderer ────────────────────────────────────────────────────────────
function Stars({
  value,
  max = 5,
  size = 14,
  interactive = false,
  onChange,
}: {
  value: number;
  max?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = (interactive ? hover || value : value) >= i + 1;
        return (
          <Star
            key={i}
            size={size}
            className={`transition-colors ${filled ? "fill-amber-400 text-amber-400" : "text-brand-border"} ${interactive ? "cursor-pointer" : ""}`}
            onMouseEnter={() => interactive && setHover(i + 1)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={() => interactive && onChange?.(i + 1)}
          />
        );
      })}
    </div>
  );
}

// ─── Word count helper ────────────────────────────────────────────────────────
function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─── Avg rating bar ───────────────────────────────────────────────────────────
function RatingSummary({ avg, total }: { avg: number | null; total: number }) {
  if (!avg || total === 0) return null;
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="text-center">
        <p className="font-heading text-4xl text-brand-text leading-none">{avg.toFixed(1)}</p>
        <Stars value={avg} size={13} />
        <p className="text-[11px] text-brand-textMuted mt-1">{total} review{total !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}

// ─── Single review card ───────────────────────────────────────────────────────
function ReviewCard({
  review,
  categoryId,
  onDeleted,
}: {
  review: Review;
  categoryId: string;
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(review.reviewText ?? "");

  const react = useMutation({
    mutationFn: (type: "LIKE" | "DISLIKE") =>
      api.post(`/api/user/reviews/${review.id}/react`, { type }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["category-reviews", categoryId] }),
  });

  const editMut = useMutation({
    mutationFn: (text: string) =>
      api.put(`/api/user/reviews/${review.id}`, { reviewText: text || null }),
    onSuccess: () => {
      toast.success("Review updated");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["category-reviews", categoryId] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/api/user/reviews/${review.id}`),
    onSuccess: () => {
      toast.success("Review deleted");
      onDeleted();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const editWords = countWords(editText);

  return (
    <div className="py-4 border-b border-brand-border/40 last:border-0">
      <div className="flex items-start gap-3">
        {review.user.profileImageUrl ? (
          <img
            src={review.user.profileImageUrl}
            alt=""
            className="w-9 h-9 rounded-full object-cover shrink-0 border border-brand-border"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-brand-primary/10 flex items-center justify-center shrink-0">
            <UserCircle size={20} className="text-brand-primary" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-brand-text leading-tight">
                {review.user.name ?? "Anonymous"}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Stars value={review.rating} size={12} />
                <span className="text-[11px] text-brand-textMuted">
                  {new Date(review.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </span>
              </div>
            </div>
            {review.isOwn && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => { setEditing(true); setEditText(review.reviewText ?? ""); }}
                  className="p-1.5 rounded-md hover:bg-brand-surface text-brand-textMuted hover:text-brand-text transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => deleteMut.mutate()}
                  disabled={deleteMut.isPending}
                  className="p-1.5 rounded-md hover:bg-red-50 text-brand-textMuted hover:text-red-500 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="w-full text-sm rounded-lg border border-brand-border bg-brand-bg p-2.5 resize-none focus:outline-none focus:border-brand-primary"
                placeholder="Edit your review… (max 40 words)"
              />
              <div className="flex items-center justify-between">
                <span className={`text-[11px] ${editWords > 40 ? "text-red-500" : "text-brand-textMuted"}`}>
                  {editWords}/40 words
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    disabled={editWords > 40 || editMut.isPending}
                    onClick={() => editMut.mutate(editText)}
                    loading={editMut.isPending}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            review.reviewText && (
              <p className="text-sm text-brand-textMuted mt-1.5 leading-relaxed">{review.reviewText}</p>
            )
          )}

          <div className="flex items-center gap-3 mt-2.5">
            <button
              onClick={() => react.mutate("LIKE")}
              disabled={react.isPending}
              className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border transition-colors ${
                review.myReaction === "LIKE"
                  ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                  : "border-brand-border text-brand-textMuted hover:border-brand-primary/50"
              }`}
            >
              <ThumbsUp size={12} />
              {review.likes > 0 && review.likes}
              <span>Helpful</span>
            </button>
            <button
              onClick={() => react.mutate("DISLIKE")}
              disabled={react.isPending}
              className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border transition-colors ${
                review.myReaction === "DISLIKE"
                  ? "border-red-400 bg-red-50 text-red-500"
                  : "border-brand-border text-brand-textMuted hover:border-red-300"
              }`}
            >
              <ThumbsDown size={12} />
              {review.dislikes > 0 && review.dislikes}
              <span>Not helpful</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Write review form ────────────────────────────────────────────────────────
function WriteReview({
  pending,
  categoryId,
}: {
  pending: PendingBooking[];
  categoryId: string;
}) {
  const qc = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<string>(pending[0]?.id ?? "");
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");

  const words = countWords(text);

  const submit = useMutation({
    mutationFn: () =>
      api.post("/api/user/reviews", {
        serviceRequestId: selectedRequest,
        rating,
        reviewText: text.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Review submitted!");
      setRating(0);
      setText("");
      qc.invalidateQueries({ queryKey: ["category-reviews", categoryId] });
      qc.invalidateQueries({ queryKey: ["category-pending-reviews", categoryId] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  function fmtHour(h: number) {
    if (h === 0) return "12 AM"; if (h < 12) return `${h} AM`;
    if (h === 12) return "12 PM"; return `${h - 12} PM`;
  }

  return (
    <div className="rounded-xl border border-brand-primary/20 bg-gradient-to-br from-brand-primary/5 to-transparent p-4 space-y-3">
      <p className="text-sm font-semibold text-brand-text">Share your experience</p>

      {pending.length > 1 && (
        <select
          value={selectedRequest}
          onChange={(e) => setSelectedRequest(e.target.value)}
          className="w-full text-sm rounded-lg border border-brand-border bg-brand-bg px-3 py-2 focus:outline-none focus:border-brand-primary"
        >
          {pending.map((b) => (
            <option key={b.id} value={b.id}>
              {b.subcategory.name} —{" "}
              {new Date(b.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              {" at "}{fmtHour(b.scheduledHour)}
            </option>
          ))}
        </select>
      )}

      <div className="space-y-1">
        <p className="text-xs text-brand-textMuted">Your rating <span className="text-red-500">*</span></p>
        <Stars value={rating} size={28} interactive onChange={setRating} />
      </div>

      <div className="space-y-1">
        <p className="text-xs text-brand-textMuted">Write a review <span className="text-brand-textMuted/50">(optional, max 40 words)</span></p>
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="How was your experience? What did you like or dislike?"
            className="w-full text-sm rounded-xl border border-brand-border bg-white p-3 pr-4 pb-7 resize-none focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 transition-all placeholder:text-brand-textMuted/50"
          />
          <div className="absolute bottom-2 right-3 flex items-center gap-2">
            <span className={`text-[11px] font-mono ${words > 40 ? "text-red-500" : "text-brand-textMuted"}`}>
              {words}/40
            </span>
          </div>
        </div>
      </div>

      <Button
        className="w-full"
        disabled={rating === 0 || words > 40 || !selectedRequest || submit.isPending}
        onClick={() => submit.mutate()}
        loading={submit.isPending}
      >
        <Send size={14} />
        Submit review
      </Button>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
export function CategoryReviews({ categoryId }: { categoryId: string }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<ReviewsData>({
    queryKey: ["category-reviews", categoryId, page],
    queryFn: () => api.get(`/api/user/categories/${categoryId}/reviews?page=${page}&limit=10`),
  });

  const { data: pending = [] } = useQuery<PendingBooking[]>({
    queryKey: ["category-pending-reviews", categoryId],
    queryFn: () => api.get(`/api/user/categories/${categoryId}/reviews/my-pending`),
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["category-reviews", categoryId] });
  }, [qc, categoryId]);

  return (
    <div className="space-y-5 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl text-brand-text">Customer Reviews</h2>
          {data?.avgRating && (
            <div className="flex items-center gap-2 mt-1">
              <Stars value={data.avgRating} size={14} />
              <span className="text-sm font-semibold text-brand-text">{data.avgRating.toFixed(1)}</span>
              <span className="text-xs text-brand-textMuted">({data.total} review{data.total !== 1 ? "s" : ""})</span>
            </div>
          )}
        </div>
      </div>

      {/* Write review — only if unrated completed bookings exist */}
      {pending.length > 0 && (
        <WriteReview pending={pending} categoryId={categoryId} />
      )}

      {/* Review list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-brand-primary" />
        </div>
      ) : !data || data.reviews.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Star size={28} className="mx-auto mb-3 text-brand-border" />
            <p className="text-sm text-brand-textMuted">No reviews yet.</p>
            {pending.length === 0 && (
              <p className="text-xs text-brand-textMuted mt-1">Book a service to leave the first review.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-2 px-4 divide-y-0">
            {data.reviews.map((r) => (
              <ReviewCard key={r.id} review={r} categoryId={categoryId} onDeleted={invalidate} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-xs text-brand-textMuted">{page} / {data.pages}</span>
          <Button variant="ghost" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronDown size={13} className="-rotate-90" />
          </Button>
        </div>
      )}
    </div>
  );
}
