export type CatalogImageBucket = "produtos" | "servicos";

const imagePathPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

export function catalogImagePath(imageUrl: string | null | undefined, bucket: CatalogImageBucket) {
  if (!imageUrl) return null;

  try {
    const image = new URL(imageUrl);
    const projectUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    if (image.origin !== projectUrl.origin) return null;

    const prefix = "/storage/v1/object/public/" + bucket + "/";
    const prefixIndex = image.pathname.indexOf(prefix);
    if (prefixIndex < 0) return null;
    const path = decodeURIComponent(image.pathname.slice(prefixIndex + prefix.length));
    return imagePathPattern.test(path) ? path : null;
  } catch {
    return null;
  }
}

export function isCatalogImageUrl(value: unknown, bucket: CatalogImageBucket) {
  return value === null || (typeof value === "string" && catalogImagePath(value, bucket) !== null);
}
