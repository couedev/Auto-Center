import { CarFront, Sparkles, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  imageUrl: string | null;
  Icon: LucideIcon;
  tone: string;
};

type CatalogService = {
  id: unknown;
  name: unknown;
  description: unknown;
  price: unknown;
  durationMinutes: unknown;
  imageUrl: unknown;
};

export function getServiceAppearance(name: string): Pick<Service, "Icon" | "tone"> {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  if (normalized.includes("carreta")) return { Icon: Truck, tone: "trailer" };
  if (normalized.includes("caminhao") || normalized.includes("caminhonete") || normalized.includes("truck")) {
    return { Icon: Truck, tone: "truck" };
  }
  if (normalized.includes("intern") || normalized.includes("higien")) return { Icon: CarFront, tone: "interior" };
  if (normalized.includes("carro") || normalized.includes("automovel")) return { Icon: CarFront, tone: "car" };
  if (normalized.includes("lavagem") || normalized.includes("limpeza") || normalized.includes("polimento")) {
    return { Icon: Sparkles, tone: "wash" };
  }

  return { Icon: Sparkles, tone: "wash" };
}

export function mapCatalogService(value: unknown): Service | null {
  if (!value || typeof value !== "object") return null;

  const item = value as CatalogService;
  if (
    typeof item.id !== "string" ||
    typeof item.name !== "string" ||
    typeof item.price !== "number" ||
    typeof item.durationMinutes !== "number"
  ) return null;

  return {
    id: item.id,
    name: item.name,
    description: typeof item.description === "string" ? item.description : "",
    price: item.price,
    durationMinutes: item.durationMinutes,
    imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : null,
    ...getServiceAppearance(item.name),
  };
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
}
