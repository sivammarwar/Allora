import { RoleLogin } from "@/components/shared/RoleLogin";

export const metadata = { title: "Payment Manager sign in — Bharat Services" };

export default function PayLoginPage() {
  return (
    <RoleLogin
      role="PAYMENT_MANAGER"
      title="Payment manager"
      subtitle="Settle daily earnings for heroes and delivery partners."
    />
  );
}
