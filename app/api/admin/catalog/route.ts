import { apiJson, getAdminContext } from "@/lib/supabase/admin";

type ProductInput = {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  stock?: unknown;
  price?: unknown;
};

function readProduct(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const body = payload as ProductInput;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const stock = body.stock;
  const price = body.price;

  if (
    name.length < 2 || name.length > 120 || description.length > 5000 ||
    typeof stock !== "number" || !Number.isSafeInteger(stock) || stock < 0 ||
    typeof price !== "number" || !Number.isFinite(price) || price < 0 || price > 9_999_999_999.99
  ) return null;

  return { name, description: description || null, stock, price };
}

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

export async function GET() {
  const context = await getAdminContext();
  if (!context.ok) return context.response;

  try {
    const [productsResult, settingsResult] = await Promise.all([
      context.supabase
        .from("catalogo")
        .select("id,nome,descricao,preco,estoque,ativo")
        .eq("tipo", "produto")
        .eq("ativo", true)
        .order("criado_em", { ascending: false }),
      context.supabase.from("configuracoes").select("nome_empresa").eq("id", 1).maybeSingle(),
    ]);

    if (productsResult.error || settingsResult.error) return apiJson({ message: "Não foi possível carregar os produtos." }, 503);
    return apiJson({ products: productsResult.data ?? [], companyName: settingsResult.data?.nome_empresa ?? "Auto CT" });
  } catch {
    return apiJson({ message: "Não foi possível carregar os produtos." }, 503);
  }
}

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (!context.ok) return context.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiJson({ message: "Dados do produto inválidos." }, 400);
  }

  const product = readProduct(payload);
  if (!product) return apiJson({ message: "Confira nome, descrição, estoque e preço do produto." }, 400);

  try {
    const { data, error } = await context.supabase
      .from("catalogo")
      .insert({
        nome: product.name,
        tipo: "produto",
        descricao: product.description,
        preco: product.price,
        estoque: product.stock,
        ativo: true,
      })
      .select("id,nome,descricao,preco,estoque,ativo")
      .single();

    if (error) return apiJson({ message: "Não foi possível salvar o produto." }, 503);
    return apiJson({ product: data }, 201);
  } catch {
    return apiJson({ message: "Não foi possível salvar o produto." }, 503);
  }
}

export async function PATCH(request: Request) {
  const context = await getAdminContext();
  if (!context.ok) return context.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiJson({ message: "Dados do produto inválidos." }, 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return apiJson({ message: "Dados do produto inválidos." }, 400);
  }
  const body = payload as ProductInput;
  if (!validId(body.id)) return apiJson({ message: "Produto inválido." }, 400);
  const product = readProduct(body);
  if (!product) return apiJson({ message: "Confira nome, descrição, estoque e preço do produto." }, 400);

  try {
    const { data, error } = await context.supabase
      .from("catalogo")
      .update({
        nome: product.name,
        descricao: product.description,
        preco: product.price,
        estoque: product.stock,
      })
      .eq("id", body.id)
      .eq("tipo", "produto")
      .select("id,nome,descricao,preco,estoque,ativo")
      .maybeSingle();

    if (error) return apiJson({ message: "Não foi possível atualizar o produto." }, 503);
    if (!data) return apiJson({ message: "Produto não encontrado." }, 404);
    return apiJson({ product: data });
  } catch {
    return apiJson({ message: "Não foi possível atualizar o produto." }, 503);
  }
}

export async function DELETE(request: Request) {
  const context = await getAdminContext();
  if (!context.ok) return context.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiJson({ message: "Produto inválido." }, 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return apiJson({ message: "Produto inválido." }, 400);
  }
  const { id } = payload as ProductInput;
  if (!validId(id)) return apiJson({ message: "Produto inválido." }, 400);

  try {
    const { data, error } = await context.supabase
      .from("catalogo")
      .update({ ativo: false })
      .eq("id", id)
      .eq("tipo", "produto")
      .select("id")
      .maybeSingle();

    if (error) return apiJson({ message: "Não foi possível desativar o produto." }, 503);
    if (!data) return apiJson({ message: "Produto não encontrado." }, 404);
    return apiJson({ ok: true });
  } catch {
    return apiJson({ message: "Não foi possível desativar o produto." }, 503);
  }
}
