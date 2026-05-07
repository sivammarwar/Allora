"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Package, Search } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";

interface Category {
  id: string;
  name: string;
  type: "PRODUCT" | "SERVICE";
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  category: Category;
  subcategory: { id: string; name: string } | null;
}

interface HeroProduct {
  id: string;
  productId: string;
  sellingPrice: number;
  isAvailable: boolean;
  product: Product;
}

interface HeroMeResponse {
  state: string;
  profile: { categoryIds: string[] };
}

export default function HeroProductsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: profile } = useQuery<HeroMeResponse>({
    queryKey: ["hero", "me"],
    queryFn: () => api.get("/api/hero/me"),
  });

  const { data: myProducts = [], isLoading: loadingMyProducts } = useQuery<HeroProduct[]>({
    queryKey: ["hero", "my-products"],
    queryFn: () => api.get("/api/hero/my-products"),
    enabled: profile?.state === "verified",
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["public", "categories"],
    queryFn: () => api.get<Category[]>("/api/user/categories"),
  });

  const { data: catalogProducts = [], isLoading: loadingCatalog } = useQuery<Product[]>({
    queryKey: ["hero", "catalog-products", selectedCategory, searchQuery],
    queryFn: () => api.get(`/api/hero/catalog-products?categoryId=${selectedCategory}&search=${searchQuery}`),
    enabled: profile?.state === "verified",
  });

  const profileCategories = categories.filter((c) => profile?.profile?.categoryIds?.includes(c.id) && c.type === "PRODUCT");
  const addedProductIds = new Set(myProducts.map((hp) => hp.productId));
  const availableProducts = catalogProducts.filter((p) => !addedProductIds.has(p.id));

  const addMutation = useMutation({
    mutationFn: (data: { productId: string; sellingPrice: number }) =>
      api.post("/api/hero/my-products", data),
    onSuccess: () => {
      toast.success("Product added to your store");
      qc.invalidateQueries({ queryKey: ["hero", "my-products"] });
      qc.invalidateQueries({ queryKey: ["hero", "catalog-products"] });
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to add product"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/hero/my-products/${id}`),
    onSuccess: () => {
      toast.success("Product removed from your store");
      qc.invalidateQueries({ queryKey: ["hero", "my-products"] });
      qc.invalidateQueries({ queryKey: ["hero", "catalog-products"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to remove"),
  });

  if (loadingMyProducts) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-brand-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-brand-text">My Products</h1>
          <p className="text-brand-textMuted text-sm mt-1">
            Select products from the catalog and set your selling price
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus size={16} />
          Add Products
        </Button>
      </div>

      {/* My Products */}
      <Card>
        <CardContent className="py-6">
          {myProducts.length === 0 ? (
            <div className="text-center space-y-4 py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-bg text-brand-textMuted">
                <Package size={32} />
              </div>
              <div>
                <h2 className="font-heading text-lg text-brand-text">No products in your store yet</h2>
                <p className="text-sm text-brand-textMuted mt-1">
                  Click "Add Products" to select from the catalog
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myProducts.map((hp) => {
                const discount = hp.product.basePrice > 0 
                  ? Math.round(((hp.product.basePrice - Number(hp.sellingPrice)) / hp.product.basePrice) * 100) 
                  : 0;
                return (
                  <Card key={hp.id} className="overflow-hidden">
                    {hp.product.imageUrl && (
                      <div className="aspect-video bg-brand-bg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={hp.product.imageUrl}
                          alt={hp.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-medium text-brand-text">{hp.product.name}</h3>
                      <p className="text-xs text-brand-textMuted">{hp.product.category.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-brand-primary">
                          ₹{Number(hp.sellingPrice)}
                        </span>
                        {discount > 0 && (
                          <>
                            <span className="text-sm text-brand-textMuted line-through">
                              ₹{hp.product.basePrice}
                            </span>
                            <span className="text-xs bg-brand-success/10 text-brand-success px-2 py-0.5 rounded-sm">
                              {discount}% off
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-sm ${hp.isAvailable ? 'bg-brand-success/10 text-brand-success' : 'bg-brand-bg text-brand-textMuted'}`}>
                          {hp.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(hp.id)}
                          className="text-brand-error hover:text-brand-error hover:bg-brand-error/10"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Products Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        size="full"
        title="Add Products from Catalog"
      >
        <div className="px-6 py-5 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-brand-text">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-sm bg-brand-surface border border-brand-border text-brand-text focus:outline-none focus:border-brand-primary"
              >
                <option value="">All Categories</option>
                {profileCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-brand-text">
                Search
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full h-10 pl-10 pr-3 rounded-sm bg-brand-surface border border-brand-border text-brand-text focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>
          </div>

          {loadingCatalog ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-brand-primary" size={28} />
            </div>
          ) : availableProducts.length === 0 ? (
            <div className="text-center py-8 text-brand-textMuted">
              {selectedCategory || searchQuery ? "No products found" : "All products from your verified categories are already in your store"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-auto">
              {availableProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  {product.imageUrl && (
                    <div className="aspect-video bg-brand-bg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-medium text-brand-text">{product.name}</h3>
                      <p className="text-xs text-brand-textMuted">{product.category.name}</p>
                      {product.description && (
                        <p className="text-xs text-brand-textMuted mt-1 line-clamp-2">{product.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-brand-textMuted">Base price: ₹{product.basePrice}</span>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-brand-text">
                        Your selling price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={product.basePrice}
                        id={`price-${product.id}`}
                        className="w-full h-8 px-2 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const priceInput = document.getElementById(`price-${product.id}`) as HTMLInputElement;
                        const sellingPrice = Number(priceInput.value);
                        if (sellingPrice <= 0) {
                          toast.error("Selling price must be greater than 0");
                          return;
                        }
                        addMutation.mutate({ productId: product.id, sellingPrice });
                      }}
                      loading={addMutation.isPending}
                    >
                      Add to Store
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
