import { RoleLogin } from "@/components/shared/RoleLogin";

export const metadata = { title: "Hero sign in — Allora" };

export default function HeroLoginPage() {
  return (
    <RoleLogin
      role="HERO"
      title="Hero portal"
      subtitle="Sign in to manage your store and incoming orders."
    />
  );
}
