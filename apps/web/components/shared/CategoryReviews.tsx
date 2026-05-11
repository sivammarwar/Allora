"use client";
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Star, ThumbsUp, ThumbsDown, UserCircle, Pencil, Trash2,
  Send, Loader2, ChevronDown, CheckCircle2,
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
      api.post(`/api/user/service-reviews/${review.id}/react`, { type }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["category-reviews", categoryId] }),
  });

  const editMut = useMutation({
    mutationFn: (text: string) =>
      api.put(`/api/user/service-reviews/${review.id}`, { reviewText: text || null }),
    onSuccess: () => {
      toast.success("Review updated");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["category-reviews", categoryId] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/api/user/service-reviews/${review.id}`),
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

// ─── Per-booking rating section ──────────────────────────────────────────────
interface PendingRating {
  id: string;
  completedAt: string | null;
  subcategory: { name: string };
}

function ServiceRatingSection({ categoryId }: { categoryId: string }) {
  const qc = useQueryClient();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  const { data: pending = [], refetch } = useQuery<PendingRating[]>({
    queryKey: ["pending-ratings", categoryId],
    queryFn: () => api.get(`/api/user/categories/${categoryId}/pending-ratings`),
  });

  const submitRating = useMutation({
    mutationFn: ({ serviceRequestId, rating }: { serviceRequestId: string; rating: number }) =>
      api.post("/api/user/booking-ratings", { serviceRequestId, rating }),
    onSuccess: (_data, vars) => {
      toast.success("Rating submitted!");
      setSubmitted((s) => ({ ...s, [vars.serviceRequestId]: true }));
      qc.invalidateQueries({ queryKey: ["pending-ratings", categoryId] });
      qc.invalidateQueries({ queryKey: ["category-avg-ratings"] });
      refetch();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to submit rating"),
  });

  const visible = pending.filter((p) => !submitted[p.id]);
  if (visible.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Star size={16} className="text-amber-500 fill-amber-400" />
        <p className="text-sm font-semibold text-brand-text">Rate your completed services</p>
        <span className="ml-auto text-xs text-brand-textMuted">{visible.length} pending</span>
      </div>
      <div className="space-y-3">
        {visible.map((p) => {
          const r = ratings[p.id] ?? 0;
          const isPending = submitRating.isPending && submitRating.variables?.serviceRequestId === p.id;
          return (
            <div key={p.id} className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2.5 border border-amber-100">
              <div className="min-w-0">
                <p className="text-sm font-medium text-brand-text truncate">{p.subcategory.name}</p>
                {p.completedAt && (
                  <p className="text-[11px] text-brand-textMuted">
                    {new Date(p.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Stars
                  value={r}
                  size={22}
                  interactive
                  onChange={(v) => setRatings((s) => ({ ...s, [p.id]: v }))}
                />
                <button
                  disabled={r === 0 || isPending}
                  onClick={() => submitRating.mutate({ serviceRequestId: p.id, rating: r })}
                  className={`p-1.5 rounded-full transition-colors ${
                    r === 0
                      ? "text-brand-border cursor-not-allowed"
                      : "text-amber-500 hover:bg-amber-100 cursor-pointer"
                  }`}
                >
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Write review form ────────────────────────────────────────────────────────
function WriteReview({
  categoryId,
  existingReview,
}: {
  categoryId: string;
  existingReview: { id: string; rating: number; reviewText: string | null } | null;
}) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [text, setText] = useState(existingReview?.reviewText ?? "");

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setText(existingReview.reviewText ?? "");
    }
  }, [existingReview?.id]);

  const words = countWords(text);
  const isEditing = !!existingReview;

  const submit = useMutation({
    mutationFn: () =>
      api.post("/api/user/service-reviews", {
        categoryId,
        rating,
        reviewText: text.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(isEditing ? "Review updated!" : "Review submitted!");
      qc.invalidateQueries({ queryKey: ["category-reviews", categoryId] });
      qc.invalidateQueries({ queryKey: ["my-review", categoryId] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <div className="rounded-xl border border-brand-primary/20 bg-gradient-to-br from-brand-primary/5 to-transparent p-4 space-y-3">
      <p className="text-sm font-semibold text-brand-text">
        {isEditing ? "Edit your review" : "Share your experience"}
      </p>

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
        disabled={rating === 0 || words > 40 || submit.isPending}
        onClick={() => submit.mutate()}
        loading={submit.isPending}
      >
        <Send size={14} />
        {isEditing ? "Update review" : "Submit review"}
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

  const { data: canReviewData } = useQuery<{ canReview: boolean }>({
    queryKey: ["can-review", categoryId],
    queryFn: () => api.get(`/api/user/categories/${categoryId}/can-review`),
  });

  const { data: myReview = null } = useQuery<{ id: string; rating: number; reviewText: string | null } | null>({
    queryKey: ["my-review", categoryId],
    queryFn: () => api.get(`/api/user/categories/${categoryId}/reviews/my-review`),
    enabled: !!canReviewData?.canReview,
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

      {/* Per-booking star ratings — shown for every unrated completed booking */}
      <ServiceRatingSection categoryId={categoryId} />

      {/* Write / edit review — visible whenever user has a completed booking for this category */}
      {canReviewData?.canReview && (
        <WriteReview categoryId={categoryId} existingReview={myReview} />
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
            {!canReviewData?.canReview && (
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
