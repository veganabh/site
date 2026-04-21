import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ProductPhoto } from "@/types/product";

type KitCoverPhotoProps = {
  photo: ProductPhoto;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/**
 * Foto do kit de presente — reusa o mesmo contrato visual de ProductPhoto
 * mas sem conceito de categoria/placeholder SVG. Fallback: bg-paper-100.
 */
export function KitCoverPhoto({
  photo,
  className,
  sizes,
  priority,
}: KitCoverPhotoProps) {
  if (!photo.url.trim()) {
    return <div className="h-full w-full bg-paper-100" aria-label={photo.alt} />;
  }
  return (
    <Image
      src={photo.url}
      alt={photo.alt}
      fill
      sizes={sizes ?? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
      className={cn("object-cover", className)}
      priority={priority}
    />
  );
}
