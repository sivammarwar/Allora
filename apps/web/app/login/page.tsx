import { RoleLogin } from "@/components/shared/RoleLogin";

export const metadata = { title: "Sign in — Bharat Services" };

export default function UserLoginPage() {
  return (
    <RoleLogin
      role="USER"
      title="Welcome back"
      subtitle="Sign in to discover local services and order delivery."
    />
  );
}
