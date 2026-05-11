"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, Send } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getSocket } from "@/lib/socket";

export function GlobalRatingPrompt() {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState<{ requestId: string; label: string } | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  useEffect(() => {
    const s = getSocket("/service");
    const onCompleted = ({ requestId, categoryName, subcategoryName }: any) => {
      qc.invalidateQueries({ queryKey: ["user", "service-requests"] });
      const label = subcategoryName
        ? `${subcategoryName} – ${categoryName ?? ""}`
        : categoryName ?? "your service";
      setRating(0);
      setPrompt({ requestId, label });
    };
    s.on("service_request:completed", onCompleted);
    return () => { s.off("service_request:completed", onCompleted); };
  }, []);

  const submit = useMutation({
    mutationFn: () =>
      api.post("/api/user/booking-ratings", {
        serviceRequestId: prompt!.requestId,
        rating,
      }),
    onSuccess: () => {
      toast.success("Thanks for rating!");
      setPrompt(null);
      qc.invalidateQueries({ queryKey: ["category-avg-ratings"] });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.message.includes("Already rated")) {
        setPrompt(null);
      } else {
        toast.error(e instanceof ApiError ? e.message : "Failed");
      }
    },
  });

  return (
    <Dialog
      open={!!prompt}
      onClose={() => setPrompt(null)}
      title="How was your experience?"
      description={prompt?.label}
      size="sm"
    >
      {prompt && (
        <div className="px-6 py-5 space-y-5">
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  onMouseEnter={() => setHover(v)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(v)}
                  className="focus:outline-none"
                >
                  <Star
                    size={36}
                    className={`transition-all ${
                      (hover || rating) >= v
                        ? "fill-amber-400 text-amber-400 scale-110"
                        : "text-brand-border"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-brand-textMuted">
              {rating === 0 ? "Tap to rate" :
               rating === 1 ? "Poor" :
               rating === 2 ? "Fair" :
               rating === 3 ? "Good" :
               rating === 4 ? "Very good" : "Excellent!"}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setPrompt(null)}>
              Skip
            </Button>
            <Button
              className="flex-1"
              disabled={rating === 0 || submit.isPending}
              onClick={() => submit.mutate()}
              loading={submit.isPending}
            >
              <Send size={14} />
              Submit
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
