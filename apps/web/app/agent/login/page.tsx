import { RoleLogin } from "@/components/shared/RoleLogin";

export const metadata = { title: "Regional Officer sign in — Allora" };

export default function AgentLoginPage() {
  return (
    <RoleLogin
      role="AGENT"
      title="Regional Officer"
      subtitle="Sign in to handle verification requests in your area."
    />
  );
}
