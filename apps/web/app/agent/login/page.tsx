import { RoleLogin } from "@/components/shared/RoleLogin";

export const metadata = { title: "Agent sign in — Allora" };

export default function AgentLoginPage() {
  return (
    <RoleLogin
      role="AGENT"
      title="Agent workspace"
      subtitle="Sign in to handle verification requests in your area."
    />
  );
}
