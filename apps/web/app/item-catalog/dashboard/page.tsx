"use client";

import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Package, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Stats {
  categories: number;
  items: number;
}

export default function ItemCatalogDashboard() {
  const { data: cats = [] } = useQuery({ queryKey: ["ic", "cats"], queryFn: () => api.get<{ id: string }[]>("/api/item-catalog/categories") });
  const { data: items = [] } = useQuery({ queryKey: ["ic", "items"], queryFn: () => api.get<{ id: string }[]>("/api/item-catalog/items") });

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl text-brand-text">Item Catalog</h1>
        <p className="text-brand-textMuted text-sm mt-1">Manage the global product catalog for all regional officers</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="py-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center">
              <Tag size={22} className="text-brand-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold text-brand-text">{cats.length}</p>
              <p className="text-sm text-brand-textMuted">Categories</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center">
              <Package size={22} className="text-brand-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold text-brand-text">{items.length}</p>
              <p className="text-sm text-brand-textMuted">Items</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a href="/item-catalog/categories" className="block rounded-sm border border-brand-border bg-brand-surface hover:bg-brand-bg transition-colors p-6 space-y-2">
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-brand-primary" />
            <span className="font-heading text-lg text-brand-text">Manage Categories</span>
          </div>
          <p className="text-sm text-brand-textMuted">Create, edit and organise product categories with images.</p>
        </a>
        <a href="/item-catalog/items" className="block rounded-sm border border-brand-border bg-brand-surface hover:bg-brand-bg transition-colors p-6 space-y-2">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-brand-primary" />
            <span className="font-heading text-lg text-brand-text">Manage Items</span>
          </div>
          <p className="text-sm text-brand-textMuted">Add and edit products, assign them to categories.</p>
        </a>
      </div>
    </div>
  );
}
