"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Package, ShoppingCart } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getStoredLocation, type UserLocation } from "@/lib/location";
import { useCart } from "@/lib/cart";
import { CartFloatingButton } from "@/components/shared/CartFloatingButton";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  type: "PRODUCT" | "SERVICE";
}

interface Subcategory {
  id: string;
  name: string;
  imageUrl: string | null;
  category: { id: string; name: string; type: "PRODUCT" | "SERVICE" };
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  isReturnable: boolean;
  returnWindowDays: number;
  isReplaceable: boolean;
  isRefundable: boolean;
  category: {
    id: string;
    name: string;
    type: "PRODUCT" | "SERVICE";
  };
  subcategory: {
    id: string;
    name: string;
  } | null;
}

interface HeroProduct {
  id: string;
  productId: string;
  sellingPrice: number;
  isAvailable: boolean;
  hero: {
    id: string;
    shopName: string | null;
    serviceName: string | null;
    user: {
      name: string | null;
    };
  };
  product: Product;
}

export default function UserCategoryPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const [loc, setLoc] = useState<UserLocation | null>(null);
  const addToCart = useCart((s) => s.add);

  const handleAddToCart = (heroProduct: HeroProduct) => {
    const { product, hero } = heroProduct;
    addToCart({
      heroId: hero.id,
      heroLabel: hero.shopName || hero.serviceName || hero.user?.name || "Local Hero",
      productId: heroProduct.productId,
      name: product.name,
      imageUrl: product.imageUrl,
      unitPrice: Number(heroProduct.sellingPrice),
      deliveryCharge: 0,
      quantity: 1,
      type: "PRODUCT",
    });
    toast.success("Added to cart");
  };

  useEffect(() => {
    setLoc(getStoredLocation());
  }, []);

  const { data: category, isLoading: categoryLoading } = useQuery<Category>({
    queryKey: ["user", "category", id],
    queryFn: () => api.get<Category>(`/api/user/categories/${id}`),
  });

  const { data: subs = [], isLoading: subsLoading } = useQuery<Subcategory[]>({
    queryKey: ["user", "subcategories", id, loc?.lat, loc?.lng],
    queryFn: () =>
      api.get(
        `/api/user/categories/${id}/subcategories?lat=${loc!.lat}&lng=${loc!.lng}`
      ),
    enabled: !!loc && category?.type === "SERVICE",
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<HeroProduct[]>({
    queryKey: ["user", "category", id, "products", loc?.lat, loc?.lng],
    queryFn: () =>
      api.get(
        `/api/user/categories/${id}/products?lat=${loc!.lat}&lng=${loc!.lng}`
      ),
    enabled: !!loc && category?.type === "PRODUCT",
  });

  if (!loc) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-brand-textMuted mb-3">
            Set your location first.
          </p>
          <Button onClick={() => router.push("/dashboard")}>
            Set location
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (categoryLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-brand-primary" size={28} />
      </div>
    );
  }

  return (
    <>
    <div className="page-enter space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft size={14} />
        Back
      </Button>
      <h1 className="font-heading text-3xl text-brand-text">
        {category?.name ?? "Category"}
      </h1>

      {category?.type === "PRODUCT" ? (
        <>
          {productsLoading ? (
            <Loader2 className="animate-spin text-brand-primary" />
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-brand-textMuted text-sm">
                No products available yet for this category in your area.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((heroProduct) => {
                const { product } = heroProduct;
                const discount = product.basePrice > 0 
                  ? Math.round(((product.basePrice - Number(heroProduct.sellingPrice)) / product.basePrice) * 100) 
                  : 0;
                return (
                  <Card key={heroProduct.id} className="overflow-hidden">
                    {product.imageUrl ? (
                      <div className="aspect-video bg-brand-bg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-brand-bg flex items-center justify-center">
                        <Package size={32} className="text-brand-textMuted" />
                      </div>
                    )}
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-medium text-brand-text">{product.name}</h3>
                      <p className="text-xs text-brand-textMuted">
                        {heroProduct.hero.shopName || heroProduct.hero.serviceName || heroProduct.hero.user?.name || "Local Hero"}
                      </p>
                      {product.description && (
                        <p className="text-xs text-brand-textMuted line-clamp-2">{product.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-brand-primary">
                          ₹{Number(heroProduct.sellingPrice)}
                        </span>
                        {discount > 0 && (
                          <>
                            <span className="text-sm text-brand-textMuted line-through">
                              ₹{product.basePrice}
                            </span>
                            <span className="text-xs bg-brand-success/10 text-brand-success px-2 py-0.5 rounded-sm">
                              {discount}% off
                            </span>
                          </>
                        )}
                      </div>
                      {(product.isReturnable || product.isReplaceable) && (
                        <div className="flex gap-2 text-xs text-brand-textMuted">
                          {product.isReturnable && (
                            <span>Returnable ({product.returnWindowDays} days)</span>
                          )}
                          {product.isReplaceable && (
                            <span>Replaceable</span>
                          )}
                        </div>
                      )}
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleAddToCart(heroProduct)}
                      >
                        <ShoppingCart size={14} className="mr-2" />
                        Add to Cart
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {subsLoading ? (
            <Loader2 className="animate-spin text-brand-primary" />
          ) : subs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-brand-textMuted text-sm">
                No options yet for this category in your area.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {subs.map((s) => (
                <Link key={s.id} href={`/dashboard/subcategory/${s.id}`}>
                  <Card className="hover:shadow-soft-lg transition-shadow overflow-hidden">
                    {s.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.imageUrl}
                        alt=""
                        className="w-full aspect-[4/3] object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-[4/3] bg-brand-bg" />
                    )}
                    <CardContent className="py-3">
                      <p className="font-medium text-brand-text truncate">{s.name}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
    <CartFloatingButton />
    </>
  );
}
