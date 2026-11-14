import { apiJson, getAdminContext } from "@/lib/supabase/admin";
import { createPrivilegedSupabaseClient } from "@/lib/supabase/app";

const bucketIds = ["produtos", "servicos"] as const;
type CatalogImageBucket = typeof bucketIds[number];
const maxImageSize = 5 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function isBucket(value: unknown): value is CatalogImageBucket {
  return typeof value === "string" && bucketIds.includes(value as CatalogImageBucket);
}

function matchesImageSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

function validPath(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(value);
}

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (!context.ok) return context.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiJson({ message: "Selecione uma imagem válida." }, 400);
  }

  const bucket = formData.get("bucket");
  const file = formData.get("file");
  if (!isBucket(bucket) || !(file instanceof File)) {
    return apiJson({ message: "Selecione uma imagem válida." }, 400);
  }
  if (!Object.prototype.hasOwnProperty.call(extensions, file.type) || file.size < 1 || file.size > maxImageSize) {
    return apiJson({ message: "Use uma imagem JPG, PNG ou WebP de até 5 MB." }, 400);
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!matchesImageSignature(file.type, bytes)) {
      return apiJson({ message: "O arquivo selecionado não parece ser uma imagem válida." }, 400);
    }

    const path = crypto.randomUUID() + "." + extensions[file.type];
    const storage = createPrivilegedSupabaseClient().storage;
    const { error } = await storage.from(bucket).upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) return apiJson({ message: "Não foi possível enviar a imagem. Tente novamente." }, 503);

    const { data } = storage.from(bucket).getPublicUrl(path);
    return apiJson({ path, imageUrl: data.publicUrl });
  } catch {
    return apiJson({ message: "Não foi possível enviar a imagem. Tente novamente." }, 503);
  }
}

export async function DELETE(request: Request) {
  const context = await getAdminContext();
  if (!context.ok) return context.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiJson({ message: "Imagem inválida." }, 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return apiJson({ message: "Imagem inválida." }, 400);
  }
  const body = payload as { bucket?: unknown; path?: unknown };
  if (!isBucket(body.bucket) || !validPath(body.path)) {
    return apiJson({ message: "Imagem inválida." }, 400);
  }

  try {
    const storage = createPrivilegedSupabaseClient().storage;
    const { error } = await storage.from(body.bucket).remove([body.path]);
    if (error) return apiJson({ message: "Não foi possível remover a imagem." }, 503);
    return apiJson({ ok: true });
  } catch {
    return apiJson({ message: "Não foi possível remover a imagem." }, 503);
  }
}
