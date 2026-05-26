"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/auth";

const S_EN = [
  { h: "1. Use of Services", pts: ["Bharat333 connects users with verified local service providers.", "We facilitate bookings only; we do not directly provide services.", "Only the booked service will be delivered."] },
  { h: "2. Booking & Payments", pts: ["All services must be booked through the platform.", "Charges vary by type, time, and location.", "Pay via available payment options.", "Extra work beyond the booked service may incur additional charges by mutual agreement."] },
  { h: "3. Professional Conduct", pts: ["Treat all Professionals with respect.", "Ask Professionals to perform only the booked service.", "Do not force additional or personal work.", "No exploitation or misconduct is permitted.", "Avoid arguments or conflicts.", "For any issue, contact the Bharat333 Help Page."] },
  { h: "4. Safety & Responsibility", pts: ["Provide a safe working environment for the Professional.", "Bharat333 acts only as a facilitator in disputes. Final responsibility lies with the involved parties."] },
  { h: "5. Cancellation & Refund", pts: ["Cancellation policies apply per app guidelines.", "Late cancellations may attract charges.", "Refunds are processed based on service type and situation."] },
  { h: "6. Complaints & Support", pts: ["Contact us via the Bharat333 Help Page.", "Avoid direct confrontation without involving the platform."] },
  { h: "7. Changes to Terms", pts: ["Terms may be updated at any time.", "Continued use of the platform implies acceptance."] },
  { h: "8. User Consent", pts: ["By using this platform you confirm you have read, understood, and agreed to these Terms & Conditions."] },
];

const S_HI = [
  { h: "1. \u0938\u0947\u0935\u093e \u0915\u093e \u0909\u092a\u092f\u094b\u0917", pts: ["Bharat333 \u0909\u092a\u092f\u094b\u0917\u0915\u0930\u094d\u0924\u093e\u0913\u0902 \u0915\u094b \u0938\u0924\u094d\u092f\u093e\u092a\u093f\u0924 Heroes \u0938\u0947 \u091c\u094b\u0921\u093c\u0924\u093e \u0939\u0948\u0964", "\u0939\u092e \u0915\u0947\u0935\u0932 \u092c\u0941\u0915\u093f\u0902\u0917 \u0938\u0941\u0935\u093f\u0927\u093e \u0926\u0947\u0924\u0947 \u0939\u0948\u0902\u0964", "\u0915\u0947\u0935\u0932 \u092c\u0941\u0915 \u0915\u0940 \u0917\u0908 \u0938\u0947\u0935\u093e \u092a\u094d\u0930\u0926\u093e\u0928 \u0915\u0940 \u091c\u093e\u090f\u0917\u0940\u0964"] },
  { h: "2. \u092c\u0941\u0915\u093f\u0902\u0917 \u0914\u0930 \u092d\u0941\u0917\u0924\u093e\u0928", pts: ["\u0938\u0947\u0935\u093e\u090f\u0902 \u092a\u094d\u0932\u0947\u091f\u092b\u093c\u0949\u0930\u094d\u092e \u0938\u0947 \u092c\u0941\u0915 \u0915\u0930\u0947\u0902\u0964", "\u0936\u0941\u0932\u094d\u0915 \u092a\u094d\u0930\u0915\u093e\u0930/\u0938\u092e\u092f/\u0938\u094d\u0925\u093e\u0928 \u0938\u0947 \u0905\u0932\u0917 \u0939\u094b \u0938\u0915\u0924\u093e \u0939\u0948\u0964", "\u092d\u0941\u0917\u0924\u093e\u0928 \u0909\u092a\u0932\u092c\u094d\u0927 \u0935\u093f\u0915\u0932\u094d\u092a\u094b\u0902 \u0938\u0947 \u0915\u0930\u0947\u0902\u0964"] },
  { h: "3. \u092a\u094d\u0930\u094b\u092b\u0947\u0936\u0928\u0932 \u0915\u0947 \u092a\u094d\u0930\u0924\u093f \u0935\u094d\u092f\u0935\u0939\u093e\u0930", pts: ["\u0938\u092d\u0940 \u092a\u094d\u0930\u094b\u092b\u0947\u0936\u0928\u0932 \u0915\u093e \u0938\u092e\u094d\u092e\u093e\u0928 \u0915\u0930\u0947\u0902\u0964", "\u0915\u0947\u0935\u0932 \u092c\u0941\u0915 \u0915\u0940 \u0917\u0908 \u0938\u0947\u0935\u093e \u0915\u0930\u0935\u093e\u090f\u0902\u0964", "\u0905\u0924\u093f\u0930\u093f\u0915\u094d\u0924 \u0915\u093e\u0930\u094d\u092f \u0915\u0947 \u0932\u093f\u090f \u0926\u092c\u093e\u0935 \u0928 \u0921\u093e\u0932\u0947\u0902\u0964", "\u0926\u0941\u0930\u094d\u0935\u094d\u092f\u0935\u0939\u093e\u0930 \u0935\u0930\u094d\u091c\u093f\u0924 \u0939\u0948\u0964", "\u0935\u093f\u0935\u093e\u0926 \u0938\u0947 \u092c\u091a\u0947\u0902\u0964", "Help Page \u0938\u0947 \u0938\u0902\u092a\u0930\u094d\u0915 \u0915\u0930\u0947\u0902\u0964"] },
  { h: "4. \u0938\u0941\u0930\u0915\u094d\u0937\u093e \u0914\u0930 \u091c\u093f\u092e\u094d\u092e\u0947\u0926\u093e\u0930\u0940", pts: ["\u0938\u0941\u0930\u0915\u094d\u0937\u093f\u0924 \u0935\u093e\u0924\u093e\u0935\u0930\u0923 \u092a\u094d\u0930\u0926\u093e\u0928 \u0915\u0930\u0947\u0902\u0964", "Bharat333 \u0915\u0947\u0935\u0932 \u092e\u0927\u094d\u092f\u0938\u094d\u0925 \u0939\u0948\u0964"] },
  { h: "5. \u0930\u0926\u094d\u0926\u0940\u0915\u0930\u0923 \u0914\u0930 \u0930\u093f\u092b\u0902\u0921", pts: ["\u0928\u0940\u0924\u093f \u0926\u093f\u0936\u093e\u0928\u093f\u0930\u094d\u0926\u0947\u0936\u094b\u0902 \u0915\u0947 \u0905\u0928\u0941\u0938\u093e\u0930\u0964", "\u0926\u0947\u0930\u0940 \u0938\u0947 \u0930\u0926\u094d\u0926 \u0915\u0930\u0928\u0947 \u092a\u0930 \u0936\u0941\u0932\u094d\u0915\u0964", "\u0930\u093f\u092b\u0902\u0921 \u0938\u094d\u0925\u093f\u0924\u093f \u0905\u0928\u0941\u0938\u093e\u0930\u0964"] },
  { h: "6. \u0936\u093f\u0915\u093e\u092f\u0924", pts: ["Help Page \u092a\u0930 \u0938\u0902\u092a\u0930\u094d\u0915 \u0915\u0930\u0947\u0902\u0964", "\u0938\u0940\u0927\u0947 \u0935\u093f\u0935\u093e\u0926 \u0928 \u0915\u0930\u0947\u0902\u0964"] },
  { h: "7. \u0928\u093f\u092f\u092e\u094b\u0902 \u092e\u0947\u0902 \u092c\u0926\u0932\u093e\u0935", pts: ["Bharat333 \u0928\u093f\u092f\u092e \u0905\u092a\u0921\u0947\u091f \u0915\u0930 \u0938\u0915\u0924\u093e \u0939\u0948\u0964"] },
  { h: "8. \u0938\u0939\u092e\u0924\u093f", pts: ["\u0909\u092a\u092f\u094b\u0917 \u0915\u0930\u0915\u0947 \u0906\u092a \u0938\u092d\u0940 \u0928\u093f\u092f\u092e\u094b\u0902 \u0938\u0947 \u0938\u0939\u092e\u0924 \u0939\u0948\u0902\u0964"] },
];

export function TermsModal() {
  const { data: authUser } = useCurrentUser();
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [checked, setChecked] = useState(false);
  const qc = useQueryClient();

  const { data: profile } = useQuery<any>({
    queryKey: ["user-profile"],
    queryFn: () => api.get("/api/user/profile"),
    enabled: !!authUser && authUser.role === "USER",
    staleTime: 60_000,
  });

  const accept = useMutation({
    mutationFn: () => api.post("/api/user/accept-terms"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-profile"] }),
  });

  if (!authUser || authUser.role !== "USER" || profile === undefined || profile?.termsAcceptedAt) {
    return null;
  }

  const secs = lang === "en" ? S_EN : S_HI;
  const hi = lang === "hi";

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[92vh] overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-bold text-gray-900">
            {hi ? "\u0928\u093f\u092f\u092e \u090f\u0935\u0902 \u0936\u0930\u094d\u0924\u0947\u0902" : "Terms & Conditions"}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Bharat Services (Bharat333) &ndash; End Users</p>
          <div className="flex gap-2 mt-3">
            {(["en", "hi"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  lang === l ? "bg-red-500 border-red-500 text-white" : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {l === "en" ? "English" : "\u0939\u093f\u0902\u0926\u0940"}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-sm">
          <p className="text-gray-600 leading-relaxed">
            {hi
              ? "Bharat Services \u092e\u0947\u0902 \u0906\u092a\u0915\u093e \u0938\u094d\u0935\u093e\u0917\u0924 \u0939\u0948\u0964 \u0938\u0947\u0935\u093e \u092c\u0941\u0915 \u0915\u0930\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947 \u0915\u0943\u092a\u092f\u093e \u0907\u0928 \u0928\u093f\u092f\u092e\u094b\u0902 \u0915\u094b \u0927\u094d\u092f\u093e\u0928\u092a\u0942\u0930\u094d\u0935\u0915 \u092a\u0922\u093c\u0947\u0902\u0964"
              : "Welcome to Bharat Services (Bharat333). Please read these Terms & Conditions carefully before booking any service."}
          </p>
          {secs.map((sec) => (
            <div key={sec.h}>
              <h3 className="font-semibold text-gray-800 mb-1.5">{sec.h}</h3>
              <ul className="space-y-1">
                {sec.pts.map((pt, i) => (
                  <li key={i} className="flex gap-2 text-gray-600 leading-snug">
                    <span className="text-gray-400 shrink-0 mt-0.5">&bull;</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-center text-xs font-semibold text-red-500 pt-2 pb-4">
            {hi
              ? "\u0927\u0928\u094d\u092f\u0935\u093e\u0926! Bharat Services \u2013 \u0906\u092a\u0915\u0940 \u0939\u0930 \u0917\u094d\u0930\u093e\u092e\u0940\u0923 \u091c\u0930\u0942\u0930\u0924 \u0915\u093e \u0938\u092e\u093e\u0927\u093e\u0928 \uD83C\uDF3E"
              : "Thank you for choosing Bharat Services \uD83C\uDF3E"}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-3 bg-white shrink-0">
          <label
            className="flex items-start gap-3 cursor-pointer"
            onClick={() => setChecked((c) => !c)}
          >
            <div
              className={`mt-0.5 h-5 w-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                checked ? "bg-red-500 border-red-500" : "border-gray-300"
              }`}
            >
              {checked && <Check size={11} className="text-white" strokeWidth={3} />}
            </div>
            <span className="text-sm text-gray-700 leading-snug select-none">
              {hi
                ? "\u092e\u0948\u0902\u0928\u0947 \u0928\u093f\u092f\u092e \u0935 \u0936\u0930\u094d\u0924\u0947\u0902 \u092a\u0922\u093c \u0932\u0940 \u0939\u0948\u0902 \u0914\u0930 \u092e\u0948\u0902 \u0938\u0939\u092e\u0924 \u0939\u0942\u0901\u0964"
                : "I have read and agree to the Terms & Conditions"}
            </span>
          </label>
          <button
            disabled={!checked || accept.isPending}
            onClick={() => accept.mutate()}
            className="w-full py-3 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {accept.isPending
              ? "Saving..."
              : hi ? "\u0938\u094d\u0935\u0940\u0915\u093e\u0930 \u0915\u0930\u0947\u0902 \u0914\u0930 \u0906\u0917\u0947 \u092c\u0922\u093c\u0947\u0902" : "Accept & Continue"}
          </button>
        </div>

      </div>
    </div>
  );
}
