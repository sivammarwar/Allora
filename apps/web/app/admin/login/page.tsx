import { RoleLogin } from "@/components/shared/RoleLogin";

export const metadata = { title: "Admin sign in — Bharat Services" };

export default function AdminLoginPage() {
  return (
    <RoleLogin
      role="ADMIN"
      title="Admin console"
      subtitle="Sign in to manage areas, agents and platform settings."
    />
  );
}
