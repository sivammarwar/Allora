"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface Props {
  orderItemId: string;
  label: string;
}

type ExistingReview = {
  id: string;
  rating: number;
  reviewText: string | null;
} | null;

/** Inline review form: stars + optional textarea. Loads any existing review. */
export function ReviewWidget({ orderItemId, label }: Props) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<ExistingReview>({
    queryKey: ["user", "review", orderItemId],
    queryFn: () => api.get(`/api/user/reviews/me/${orderItemId}`),
  });

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (data) {
      setRating(data.rating);
      setText(data.reviewText ?? "");
      setEditing(false);
    } else {
      setEditing(true);
    }
  }, [data]);

  const submit = useMutation({
    mutationFn: () =>
      api.post("/api/user/reviews", {
        orderItemId,
        rating,
        reviewText: text.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(data ? "Review updated" : "Thanks for the review!");
      qc.invalidateQueries({ queryKey: ["user", "review", orderItemId] });
      setEditing(false);
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof ApiError ? e.message : "Couldn't save review"
      ),
  });

  if (isLoading) return null;

  // Already submitted, not editing → compact display
  if (data && !editing) {
    return (
      <div className="mt-2 p-3 rounded-sm bg-brand-bg border border-brand-border">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-mono text-brand-primary">
            Your review
          </span>
          <Stars value={data.rating} />
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ml-auto text-xs text-brand-primary hover:underline"
          >
            Edit
          </button>
        </div>
        {data.reviewText && (
          <p className="text-sm text-brand-text mt-1.5 leading-relaxed">
            {data.reviewText}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 rounded-sm bg-brand-bg border border-brand-border space-y-2">
      <p className="text-[10px] uppercase tracking-widest font-mono text-brand-primary">
        Rate {label}
      </p>
      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setRating(v)}
            onMouseEnter={() => setHover(v)}
            className="p-0.5"
            aria-label={`${v} star${v === 1 ? "" : "s"}`}
          >
            <Star
              size={22}
              className={
                (hover || rating) >= v
                  ? "fill-brand-primary text-brand-primary"
                  : "text-brand-textMuted"
              }
            />
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="A few words about your experience (optional)"
        className="w-full p-2.5 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => submit.mutate()}
          loading={submit.isPending}
          disabled={rating === 0}
        >
          {data ? "Update review" : "Submit review"}
        </Button>
        {data && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setRating(data.rating);
              setText(data.reviewText ?? "");
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((v) => (
        <Star
          key={v}
          size={14}
          className={
            value >= v
              ? "fill-brand-primary text-brand-primary"
              : "text-brand-border"
          }
        />
      ))}
    </span>
  );
}
