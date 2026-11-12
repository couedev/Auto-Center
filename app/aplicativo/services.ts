import { CarFront, Sparkles, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  Icon: LucideIcon;
  tone: string;
};

export const services: Service[] = [
  { id: "lavagem-caminhao", name: "Lavagem Caminhão", description: "Lavagem externa completa para caminhões.", price: 150, Icon: Truck, tone: "truck" },
  { id: "carro-simples", name: "Carro Simples", description: "Lavagem externa para o dia a dia.", price: 100, Icon: CarFront, tone: "car" },
  { id: "carreta", name: "Carreta", description: "Lavagem externa de carreta e rodas.", price: 300, Icon: Truck, tone: "trailer" },
  { id: "lavagem-completa", name: "Lavagem Completa", description: "Lavagem externa, rodas e acabamento final.", price: 120, Icon: Sparkles, tone: "wash" },
  { id: "higienizacao-interna", name: "Higienização Interna", description: "Limpeza e cuidado do interior do veículo.", price: 180, Icon: CarFront, tone: "interior" },
];

export function findService(id: string | null) {
  return services.find((service) => service.id === id) ?? services[3];
}
