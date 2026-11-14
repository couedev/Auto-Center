"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  Building2, CalendarClock, CheckCircle2, Clock3, House, Package, Pencil,
  Plus, Search, Settings, ToggleLeft, ToggleRight, Wrench, X,
} from "lucide-react";
import chrome from "../dashboard.module.css";
import DashboardActions from "../dashboard-actions";
import CatalogImageField from "../catalog-image-field";
import styles from "./services.module.css";

type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  imageUrl: string | null;
  active: boolean;
};
type ServiceFilter = "all" | "active" | "inactive";
type Draft = Omit<Service, "id" | "active">;

const emptyDraft: Draft = { name: "", description: "", price: 0, durationMinutes: 60, imageUrl: null };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours && remainingMinutes) return hours + "h " + remainingMinutes + "min";
  if (hours) return hours + "h";
  return remainingMinutes + " min";
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [companyName, setCompanyName] = useState("Auto CT");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [filter, setFilter] = useState<ServiceFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    async function loadServices() {
      try {
        const response = await fetch("/api/admin/services", { cache: "no-store" });
        const result = await response.json() as { services?: Service[]; companyName?: string; message?: string };
        if (!response.ok) throw new Error(result.message || "Não foi possível carregar os serviços.");
        if (!active) return;
        setServices(result.services ?? []);
        setCompanyName(result.companyName || "Auto CT");
      } catch (error) {
        if (active) setPageError(error instanceof Error ? error.message : "Não foi possível carregar os serviços.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void loadServices();
    return () => { active = false; };
  }, []);

  const activeServices = services.filter((service) => service.active);
  const averageDuration = activeServices.length
    ? Math.round(activeServices.reduce((total, service) => total + service.durationMinutes, 0) / activeServices.length)
    : 0;
  const visibleServices = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return services.filter((service) => {
      const matchesFilter = filter === "all" || (filter === "active" ? service.active : !service.active);
      const matchesQuery = !query || (service.name + " " + service.description).toLocaleLowerCase("pt-BR").includes(query);
      return matchesFilter && matchesQuery;
    });
  }, [services, filter, search]);

  function openNew() {
    setEditingId(null);
    setDraft({ ...emptyDraft });
    setPageError("");
    setModalOpen(true);
  }

  function openEdit(service: Service) {
    setEditingId(service.id);
    setDraft({ name: service.name, description: service.description, price: service.price, durationMinutes: service.durationMinutes, imageUrl: service.imageUrl });
    setPageError("");
    setModalOpen(true);
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setPageError("");
    try {
      const response = await fetch("/api/admin/services", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(editingId ? { id: editingId } : {}), ...draft }),
      });
      const result = await response.json() as { service?: Service; message?: string };
      if (!response.ok || !result.service) throw new Error(result.message || "Não foi possível salvar o serviço.");
      const saved = result.service;
      setServices((current) => editingId
        ? current.map((service) => service.id === saved.id ? saved : service)
        : [saved, ...current]);
      setModalOpen(false);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Não foi possível salvar o serviço.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleService(service: Service) {
    setPageError("");
    try {
      const response = await fetch("/api/admin/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: service.id, active: !service.active, action: "status" }),
      });
      const result = await response.json() as { service?: Service; message?: string };
      if (!response.ok || !result.service) throw new Error(result.message || "Não foi possível atualizar o serviço.");
      setServices((current) => current.map((item) => item.id === service.id ? result.service! : item));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Não foi possível atualizar o serviço.");
    }
  }

  return (
    <div className={[chrome.dashboard, styles.servicesPage].join(" ")}>
      <div className={chrome.honeycombTop} aria-hidden="true" />
      <div className={chrome.honeycombBottom} aria-hidden="true" />
      <aside className={chrome.sidebar} aria-label="Navegação principal">
        <nav className={chrome.navigation}>
          <Link href="/dashboard" className={chrome.navItem} aria-label="Visão geral"><House /></Link>
          <Link href="/dashboard/produtos" className={chrome.navItem} aria-label="Produtos"><Package /></Link>
          <Link href="/dashboard/servicos" className={[chrome.navItem, chrome.navActive].join(" ")} aria-label="Serviços" aria-current="page"><Wrench /></Link>
          <Link href="/dashboard/configuracao" className={chrome.navItem} aria-label="Configurações"><Settings /></Link>
        </nav>
      </aside>

      <main className={chrome.main}>
        <div className={chrome.content}>
          <header className={[chrome.topbar, styles.topbar].join(" ")}>
            <Link href="/dashboard" className={[chrome.logoLink, styles.logoLink].join(" ")} aria-label="Auto CT, visão geral">
              <Image src="/assets/Auto%20CT%20transparent%20logo-2.webp" alt="Auto CT Auto Center" width={420} height={210} priority className={chrome.logo} style={{ width: "100%", height: "auto" }} />
            </Link>
            <div className={chrome.topActions}>
              <DashboardActions />
              <div className={chrome.menuAnchor}><div className={chrome.branchButton}><Building2 className={chrome.branchIcon} /><span>{companyName}</span></div></div>
            </div>
          </header>

          <section className={styles.heading}>
            <div><span className={styles.eyebrow}>CATÁLOGO DA UNIDADE</span><h1>Serviços</h1><p>Cadastre os serviços oferecidos e o tempo necessário para cada atendimento.</p></div>
            <button className={styles.createButton} type="button" onClick={openNew}><Plus aria-hidden="true" />Cadastrar serviço</button>
          </section>

          <section className={styles.summary} aria-label="Resumo dos serviços">
            <article className={styles.summaryCard}><Wrench aria-hidden="true" /><div><span>Serviços ativos</span><strong>{activeServices.length}</strong><small>disponíveis no aplicativo</small></div></article>
            <article className={styles.summaryCard}><CalendarClock aria-hidden="true" /><div><span>Serviços cadastrados</span><strong>{services.length}</strong><small>ativos e inativos</small></div></article>
            <article className={styles.summaryCard}><Clock3 aria-hidden="true" /><div><span>Duração média</span><strong>{formatDuration(averageDuration)}</strong><small>entre os serviços ativos</small></div></article>
          </section>

          <section className={styles.catalogPanel} aria-label="Lista de serviços">
            <div className={styles.toolbar}>
              <div className={styles.filters} role="group" aria-label="Filtrar serviços">
                {([["all", "Todos"], ["active", "Ativos"], ["inactive", "Inativos"]] as const).map(([value, label]) => (
                  <button key={value} type="button" className={filter === value ? styles.selectedFilter : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
                ))}
              </div>
              <label className={styles.search}><Search aria-hidden="true" /><span className={styles.srOnly}>Buscar serviço</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar serviço..." /></label>
            </div>

            {pageError && !modalOpen && <p className={styles.error} role="alert">{pageError}</p>}
            {isLoading && <p className={styles.message} role="status">Carregando serviços...</p>}
            {!isLoading && !pageError && visibleServices.length === 0 && <div className={styles.emptyState}><Wrench aria-hidden="true" /><strong>{services.length ? "Nenhum serviço encontrado" : "Nenhum serviço cadastrado"}</strong><span>{services.length ? "Tente mudar os filtros ou a busca." : "Cadastre os serviços para que fiquem disponíveis no aplicativo."}</span></div>}

            {visibleServices.length > 0 && <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead><tr><th>Serviço</th><th>Preço</th><th>Duração</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>{visibleServices.map((service) => (
                  <tr key={service.id} className={!service.active ? styles.inactiveRow : ""}>
                    <td><div className={styles.serviceName}><span className={styles.serviceIcon} style={service.imageUrl ? { backgroundImage: "url(" + JSON.stringify(service.imageUrl) + ")" } : undefined}>{!service.imageUrl && <Wrench aria-hidden="true" />}</span><div><strong>{service.name}</strong><small>{service.description || "Sem descrição"}</small></div></div></td>
                    <td className={styles.price}>{money.format(service.price)}</td>
                    <td><span className={styles.duration}><Clock3 aria-hidden="true" />{formatDuration(service.durationMinutes)}</span></td>
                    <td><span className={[styles.status, service.active ? styles.activeStatus : styles.inactiveStatus].join(" ")}><CheckCircle2 aria-hidden="true" />{service.active ? "Ativo" : "Inativo"}</span></td>
                    <td><div className={styles.rowActions}>
                      <button type="button" aria-label={"Editar " + service.name} title="Editar serviço" onClick={() => openEdit(service)}><Pencil aria-hidden="true" /></button>
                      <button type="button" aria-label={(service.active ? "Desativar " : "Ativar ") + service.name} title={service.active ? "Desativar serviço" : "Ativar serviço"} onClick={() => void toggleService(service)}>{service.active ? <ToggleRight aria-hidden="true" /> : <ToggleLeft aria-hidden="true" />}</button>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>}
          </section>
        </div>
      </main>

      {modalOpen && typeof document !== "undefined" && createPortal(
        <div className={styles.modalOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) setModalOpen(false); }}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="service-modal-title">
            <header className={styles.modalHeader}>
              <div><span className={styles.modalIcon}><Wrench aria-hidden="true" /></span><div><h2 id="service-modal-title">{editingId ? "Editar serviço" : "Cadastrar serviço"}</h2><p>Preço e duração usados nos agendamentos.</p></div></div>
              <button type="button" aria-label="Fechar" onClick={() => setModalOpen(false)} disabled={isSaving}><X aria-hidden="true" /></button>
            </header>
            <form onSubmit={saveService} className={styles.form}>
              <label><span>Nome do serviço</span><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} maxLength={120} required autoFocus placeholder="Ex.: Lavagem completa" /></label>
              <label><span>Descrição <small>(opcional)</small></span><textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} maxLength={5000} rows={3} placeholder="Explique o que está incluído no serviço" /></label>
              <CatalogImageField bucket="servicos" imageUrl={draft.imageUrl} onChange={(imageUrl) => setDraft((current) => ({ ...current, imageUrl }))} disabled={isSaving} />
              <div className={styles.formRow}>
                <label><span>Preço</span><div className={styles.inputWithPrefix}><b>R$</b><input type="number" min="0" max="9999999999.99" step="0.01" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: Number(event.target.value) }))} required /></div></label>
                <label><span>Duração</span><div className={styles.inputWithSuffix}><input type="number" min="15" max="480" step="1" value={draft.durationMinutes} onChange={(event) => setDraft((current) => ({ ...current, durationMinutes: Number(event.target.value) }))} required /><b>min</b></div></label>
              </div>
              {pageError && <p className={styles.error} role="alert">{pageError}</p>}
              <footer className={styles.formActions}><button type="button" className={styles.cancelButton} onClick={() => setModalOpen(false)} disabled={isSaving}>Cancelar</button><button type="submit" className={styles.saveButton} disabled={isSaving}>{isSaving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar serviço"}</button></footer>
            </form>
          </section>
        </div>,
        document.body,
      )}
    </div>
  );
}
