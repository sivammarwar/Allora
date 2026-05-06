import { RoleLogin } from "@/components/shared/RoleLogin";

export const metadata = { title: "Delivery sign in — Allora" };

export default function DeliveryLoginPage() {
  return (
    <RoleLogin
      role="DELIVERY_BOY"
      title="Delivery portal"
      subtitle="Sign in to view assignments and pickups."
    />
  );
}
