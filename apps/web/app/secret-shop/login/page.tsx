import { RoleLogin } from "@/components/shared/RoleLogin";

export const metadata = { title: "Secret Shop sign in — Allora" };

export default function SecretShopLoginPage() {
  return (
    <RoleLogin
      role="SECRET_SHOP"
      title="Secret Shop portal"
      subtitle="Sign in to browse items and place orders."
    />
  );
}
