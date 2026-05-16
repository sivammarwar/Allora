import { RoleLogin } from "@/components/shared/RoleLogin";

export const metadata = { title: "Product Manager sign in — Bharat Services" };

export default function PMLoginPage() {
  return (
    <RoleLogin
      role="PRODUCT_MANAGER"
      title="Product manager"
      subtitle="Manage categories, subcategories and the catalog."
    />
  );
}
