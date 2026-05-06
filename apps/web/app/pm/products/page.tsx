"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Category {
  id: string;
  name: string;
  type: "PRODUCT" | "SERVICE";
  imageUrl: string | null;
  subcategoryCount: number;
}

export default function PMProductsPage() {
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["pm", "categories", "all"],
    queryFn: async () => {
      const all = await api.get<any[]>("/api/pm/categories");
      return all
        .filter((c) => c.type === "PRODUCT")
        .map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          imageUrl: c.imageUrl,
          subcategoryCount: c.subcategoryCount,
        }));
    },
  });

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-3xl text-brand-text">Products</h1>
          <p className="text-brand-textMuted text-sm mt-1">
            Click on a category to view and manage its products.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-brand-textMuted text-sm">Loading…</div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-brand-textMuted text-sm">
            No product categories found. Create a category with type "Product" first.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/pm/products/category/${cat.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <div className="relative h-40 bg-brand-surface">
                  {cat.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Plus size={48} className="text-brand-primary" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <h3 className="text-white font-semibold text-lg">{cat.name}</h3>
                    <p className="text-white/80 text-sm">{cat.subcategoryCount} subcategories</p>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="text-center text-sm text-brand-textMuted">
                    Click to view products
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
