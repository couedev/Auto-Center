"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowDownUp, ArrowUpRight, Bell, Boxes, Building2, CarFront, Check,
  CheckCircle2, ChevronDown, CircleAlert, Coins, Disc3, Droplets, Eye,
  Filter, House, Package, Pencil, Plus, Search, Settings, Sparkles,
  Trash2, TriangleAlert, Wrench, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import chrome from "../dashboard.module.css";
import styles from "./products.module.css";

type ProductArt = "oil" | "shampoo" | "wax" | "tire" | "filter" | "spray";
type Product = {
  id: string;
  name: string;
  code: string;
  category: string;
  stock: number;
  price: number;
  art: ProductArt;
};
type StatusFilter = "all" | "stock" | "low";
type SortKey = "stock" | "price" | null;

const initialProducts: Product[] = [
  { id: "ol-5w30", name: "Óleo 5W30", code: "OL-5W30", category: "Lubrificantes", stock: 32, price: 49.9, art: "oil" },
  { id: "sh-001", name: "Shampoo Automotivo", code: "SH-001", category: "Lavagem", stock: 118, price: 24.9, art: "shampoo" },
  { id: "ce-001", name: "Cera Líquida", code: "CE-001", category: "Polimento", stock: 27, price: 39.9, art: "wax" },
  { id: "pp-001", name: "Pneu Pretinho", code: "PP-001", category: "Estética", stock: 4, price: 19.9, art: "tire" },
  { id: "fo-001", name: "Filtro de Óleo", code: "FO-001", category: "Troca de Peças", stock: 56, price: 34.9, art: "filter" },
  { id: "dg-001", name: "Desengraxante", code: "DG-001", category: "Limpeza", stock: 18, price: 28.9, art: "spray" },
];

const categories = ["Lubrificantes", "Lavagem", "Polimento", "Estética", "Troca de Peças", "Limpeza"];
const categoryIcons: Record<string, LucideIcon> = {
  Lubrificantes: CarFront,
  Lavagem: Droplets,
  Polimento: Sparkles,
  Estética: Disc3,
  "Troca de Peças": Wrench,
  Limpeza: Droplets,
};
const categoryArt: Record<string, ProductArt> = {
  Lubrificantes: "oil", Lavagem: "shampoo", Polimento: "wax", Estética: "tire", "Troca de Peças": "filter", Limpeza: "spray",
};
const blankProduct: Product = { id: "", name: "", code: "", category: "Lavagem", stock: 0, price: 0, art: "shampoo" };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function ProductThumbnail({ art }: { art: ProductArt }) {
  const common = { stroke: "#c8d0bd", strokeWidth: 1.2, strokeLinejoin: "round" as const };
  return (
    <span className={styles.thumbnail} aria-hidden="true">
      <svg viewBox="0 0 56 56" fill="none">
        {art === "oil" && <>
          <rect x="21" y="3" width="14" height="6" rx="1" fill="#3e4742" stroke="#a5b29f" />
          <path d="M18 9h19l4 8v33H15V18l3-9Z" fill="#232a28" {...common} />
          <path d="M17 16h8v8h-8m20-8h6v9h-6" stroke="#69766b" strokeWidth="2" />
          <rect x="20" y="29" width="17" height="16" rx="2" fill="#252d1d" stroke="#9cee00" />
          <path d="M28.5 32c1.7 2.2 3 4 3 5.2a3 3 0 0 1-6 0c0-1.2 1.3-3 3-5.2Z" fill="#a4f000" />
        </>}
        {art === "shampoo" && <>
          <path d="M18 10h20l4 8v32H14V18l4-8Z" fill="#a91c65" stroke="#f7aacd" strokeWidth="1.4" />
          <path d="M22 5h12v6H22z" fill="#efb2cd" /><path d="M37 15h7v9h-7" stroke="#f4c1d8" strokeWidth="2.4" />
          <path d="M16 30h24v17H16z" fill="#cd3a82" opacity=".75" /><path d="M19 15h4v31" stroke="#ffb5d9" opacity=".55" strokeWidth="2" />
        </>}
        {art === "wax" && <>
          <ellipse cx="28" cy="21" rx="19" ry="8" fill="#505447" stroke="#ffd329" strokeWidth="2" />
          <path d="M9 21v18c0 5 8 9 19 9s19-4 19-9V21" fill="#181c1a" stroke="#b7bdac" strokeWidth="1.4" />
          <path d="M9 34c0 5 8 8 19 8s19-3 19-8" stroke="#e6c027" strokeWidth="3" />
          <ellipse cx="28" cy="21" rx="15" ry="5" fill="#202521" stroke="#e5d241" strokeWidth="1" />
        </>}
        {art === "tire" && <>
          <rect x="23" y="4" width="10" height="7" rx="1" fill="#777d78" />
          <path d="M21 10h14l4 7v32H17V17l4-7Z" fill="#1b2020" stroke="#8e9991" strokeWidth="1.3" />
          <rect x="21" y="28" width="14" height="15" rx="2" fill="#2f3330" stroke="#adb5aa" />
          <circle cx="28" cy="35" r="5" stroke="#f4f7f2" strokeWidth="1.7" /><circle cx="28" cy="35" r="2" stroke="#f4f7f2" />
          <path d="M20 16h3v10" stroke="#d8ded4" opacity=".45" strokeWidth="2" />
        </>}
        {art === "filter" && <>
          <ellipse cx="28" cy="13" rx="17" ry="5" fill="#333534" stroke="#b9b7aa" />
          <path d="M11 13v28c0 4 8 7 17 7s17-3 17-7V13" fill="#b5741d" stroke="#d9a845" strokeWidth="1.2" />
          {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${15 + i * 3.3} 17v28`} stroke="#e0aa4c" strokeWidth="1.6" />)}
          <ellipse cx="28" cy="13" rx="17" ry="5" fill="#313432" stroke="#d8bf85" /><ellipse cx="28" cy="13" rx="6" ry="2" fill="#191b1b" />
        </>}
        {art === "spray" && <>
          <path d="M26 4h13l6 5-3 4H31v7h-7v-9l2-7Z" fill="#d4ddd3" stroke="#8b998d" />
          <path d="M39 11h9" stroke="#c1cfc0" strokeWidth="3" /><path d="M23 20h11l5 5v26H18V25l5-5Z" fill="#28302a" stroke="#a8b5a5" strokeWidth="1.4" />
          <rect x="20" y="32" width="17" height="15" rx="2" fill="#27351b" stroke="#9fea00" />
          <path d="M28.5 34c2 3 3 4.5 3 6a3 3 0 0 1-6 0c0-1.5 1-3 3-6Z" fill="#a6f400" />
        </>}
      </svg>
    </span>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState(initialProducts);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("Todas as categorias");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortAscending, setSortAscending] = useState(true);
  const [modal, setModal] = useState<"new" | "view" | "edit" | null>(null);
  const [draft, setDraft] = useState<Product>(blankProduct);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [branch, setBranch] = useState("Auto CT - Matriz");
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const initialUnits = initialProducts.reduce((sum, product) => sum + product.stock, 0);
  const currentUnits = products.reduce((sum, product) => sum + product.stock, 0);
  const initialValue = initialProducts.reduce((sum, product) => sum + product.stock * product.price, 0);
  const currentValue = products.reduce((sum, product) => sum + product.stock * product.price, 0);
  const totalProducts = 156 + products.length - initialProducts.length;
  const totalUnits = 4872 + currentUnits - initialUnits;
  const lowStockCount = 5 + products.filter((product) => product.stock <= 5).length - 1;
  const stockValue = 48730.9 + currentValue - initialValue;
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const filteredProducts = products.filter((product) => {
    const matchesStatus = statusFilter === "all" || (statusFilter === "low" ? product.stock <= 5 : product.stock > 5);
    const matchesCategory = categoryFilter === "Todas as categorias" || product.category === categoryFilter;
    const matchesSearch = !normalizedSearch || `${product.name} ${product.category} ${product.code}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch);
    return matchesStatus && matchesCategory && matchesSearch;
  }).sort((a, b) => sortKey ? (a[sortKey] - b[sortKey]) * (sortAscending ? 1 : -1) : 0);

  function openNew() { setDraft({ ...blankProduct }); setModal("new"); }
  function openProduct(product: Product, mode: "view" | "edit") { setDraft({ ...product }); setModal(mode); }
  function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = { ...draft, id: modal === "new" ? `${Date.now()}` : draft.id, art: categoryArt[draft.category] ?? "shampoo" };
    setProducts((current) => modal === "new" ? [...current, saved] : current.map((product) => product.id === saved.id ? saved : product));
    setModal(null);
  }
  function changeSort(key: Exclude<SortKey, null>) {
    if (sortKey === key) setSortAscending((value) => !value);
    else { setSortKey(key); setSortAscending(true); }
  }

  return (
    <div className={`${chrome.dashboard} ${styles.productsPage}`}>
      <div className={chrome.honeycombTop} aria-hidden="true" />
      <div className={chrome.honeycombBottom} aria-hidden="true" />
      <aside className={chrome.sidebar} aria-label="Navegação principal">
        <nav className={chrome.navigation}>
          <Link href="/dashboard" className={chrome.navItem} aria-label="Visão geral"><House /></Link>
          <Link href="/dashboard/produtos" className={`${chrome.navItem} ${chrome.navActive}`} aria-label="Produtos" aria-current="page"><Package /></Link>
          <Link href="/dashboard/configuracao" className={chrome.navItem} aria-label="Configurações"><Settings /></Link>
        </nav>
      </aside>

      <main className={chrome.main}>
        <div className={chrome.content}>
          <header className={`${chrome.topbar} ${styles.topbar}`}>
            <Link href="/dashboard" className={`${chrome.logoLink} ${styles.logoLink}`} aria-label="Auto CT, visão geral">
              <Image src="/assets/Auto%20CT%20transparent%20logo-2.webp" alt="Auto CT Auto Center" width={420} height={210} priority className={chrome.logo} style={{ width: "100%", height: "auto" }} />
            </Link>
            <div className={chrome.topActions}>
              <div className={chrome.menuAnchor}>
                <button className={chrome.notificationButton} type="button" aria-label="Notificações" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((value) => !value)}><Bell /><span className={chrome.notificationDot} /></button>
                {notificationsOpen && <div className={`${chrome.popover} ${chrome.notificationPopover}`} role="status"><strong>Tudo em dia</strong><span>Você não tem novas notificações.</span></div>}
              </div>
              <div className={chrome.menuAnchor}>
                <button className={chrome.branchButton} type="button" aria-expanded={branchMenuOpen} onClick={() => setBranchMenuOpen((value) => !value)}><Building2 className={chrome.branchIcon} /><span>{branch}</span><ChevronDown className={chrome.chevron} /></button>
                {branchMenuOpen && <div className={`${chrome.popover} ${chrome.branchPopover}`} role="menu" aria-label="Selecionar unidade">{["Auto CT - Matriz", "Auto CT - Unidade Sul"].map((name) => <button key={name} type="button" role="menuitem" onClick={() => { setBranch(name); setBranchMenuOpen(false); }}><Building2 />{name}{branch === name && <Check />}</button>)}</div>}
              </div>
            </div>
          </header>

          <div className={styles.pageHeading}>
            <div className={styles.headingText}><div><h1>Produtos</h1><span className={styles.headingDivider} /><p>Cadastro e estoque</p></div><span className={styles.titleUnderline} /></div>
            <button className={styles.newButton} type="button" onClick={openNew}><Plus />Novo Produto</button>
          </div>

          <section className={styles.metrics} aria-label="Resumo do estoque">
            <article className={`${styles.metric} ${styles.featured}`}><Package aria-hidden="true" /><div><span>Total de Produtos</span><strong>{totalProducts}</strong><small><ArrowUpRight /> <b>+7,6%</b> em relação ao mês anterior</small></div></article>
            <article className={styles.metric}><Boxes aria-hidden="true" /><div><span>Itens em Estoque</span><strong>{new Intl.NumberFormat("pt-BR").format(totalUnits)}</strong><small><ArrowUpRight /> <b>+12,3%</b></small></div></article>
            <article className={styles.metric}><TriangleAlert aria-hidden="true" /><div><span>Baixo Estoque</span><strong>{lowStockCount}</strong><small className={styles.dangerTrend}><ArrowUpRight /> <b>+66,7%</b></small></div></article>
            <article className={styles.metric}><Coins aria-hidden="true" /><div><span>Valor do Estoque</span><strong>{money.format(stockValue)}</strong><small><ArrowUpRight /> <b>+10,9%</b></small></div></article>
          </section>

          <div className={styles.toolbar}>
            <div className={styles.statusTabs} role="group" aria-label="Filtrar por estoque">
              {([ ["all", "Todos"], ["stock", "Em estoque"], ["low", "Baixo estoque"] ] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={statusFilter === key} className={statusFilter === key ? styles.activeTab : ""} onClick={() => setStatusFilter(key)}>{label}</button>)}
            </div>
            <label className={styles.searchBox}><Search aria-hidden="true" /><span className={styles.srOnly}>Buscar produto</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto por nome, categoria ou código..." /></label>
            <div className={styles.filterAnchor}>
              <button className={styles.filterButton} type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((value) => !value)}><Filter />Filtros<ChevronDown /></button>
              {filtersOpen && <div className={styles.filterMenu} role="group" aria-label="Categoria"><strong>Categoria</strong>{["Todas as categorias", ...categories].map((category) => <button key={category} type="button" onClick={() => { setCategoryFilter(category); setFiltersOpen(false); }}><span>{category}</span>{categoryFilter === category && <Check />}</button>)}</div>}
            </div>
          </div>
          {categoryFilter !== "Todas as categorias" && <button className={styles.activeFilter} type="button" onClick={() => setCategoryFilter("Todas as categorias")}>{categoryFilter}<X /></button>}

          <section className={styles.tableCard} aria-label="Produtos cadastrados">
            <div className={styles.tableScroll}>
              <table>
                <thead><tr><th>Produto</th><th>Categoria</th><th><button type="button" onClick={() => changeSort("stock")}>Estoque <ArrowDownUp /></button></th><th><button type="button" onClick={() => changeSort("price")}>Preço <ArrowDownUp /></button></th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const CategoryIcon = categoryIcons[product.category] ?? Package;
                    const low = product.stock <= 5;
                    return <tr key={product.id} className={low ? styles.lowRow : ""}>
                      <td><div className={styles.productCell}><ProductThumbnail art={product.art} /><div><strong>{product.name}</strong><span>Cód. {product.code}</span></div></div></td>
                      <td><span className={styles.categoryPill}><CategoryIcon />{product.category}</span></td>
                      <td className={low ? styles.lowStock : styles.stock}>{product.stock} <span>un</span></td>
                      <td className={styles.price}>{money.format(product.price)}</td>
                      <td><span className={low ? styles.lowStatus : styles.inStockStatus}>{low ? <CircleAlert /> : <CheckCircle2 />}{low ? "Baixo estoque" : "Em estoque"}</span></td>
                      <td><div className={styles.actions}><button type="button" aria-label={`Ver ${product.name}`} onClick={() => openProduct(product, "view")}><Eye /></button><button type="button" aria-label={`Editar ${product.name}`} onClick={() => openProduct(product, "edit")}><Pencil /></button><button className={styles.deleteButton} type="button" aria-label={`Excluir ${product.name}`} onClick={() => setDeleteTarget(product)}><Trash2 /></button></div></td>
                    </tr>;
                  })}
                </tbody>
              </table>
              {filteredProducts.length === 0 && <p className={styles.emptyState}>Nenhum produto encontrado para esses filtros.</p>}
            </div>
          </section>
        </div>
      </main>

      {modal && <div className={styles.modalOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="product-dialog-title"><div className={styles.modalHeader}><h2 id="product-dialog-title">{modal === "new" ? "Novo Produto" : modal === "edit" ? "Editar Produto" : "Detalhes do Produto"}</h2><button type="button" aria-label="Fechar" onClick={() => setModal(null)}><X /></button></div>{modal === "view" ? <div className={styles.productDetail}><ProductThumbnail art={draft.art} /><div><strong>{draft.name}</strong><span>Cód. {draft.code}</span></div><dl><div><dt>Categoria</dt><dd>{draft.category}</dd></div><div><dt>Estoque</dt><dd>{draft.stock} un</dd></div><div><dt>Preço</dt><dd>{money.format(draft.price)}</dd></div></dl><button type="button" onClick={() => setModal(null)}>Fechar</button></div> : <form className={styles.productForm} onSubmit={saveProduct}><label>Nome<input required autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label>Código<input required value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} /></label><label>Categoria<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><div className={styles.formGrid}><label>Estoque<input type="number" min="0" required value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: Number(event.target.value) })} /></label><label>Preço (R$)<input type="number" min="0" step="0.01" required value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} /></label></div><div className={styles.formActions}><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="submit">Salvar produto</button></div></form>}</section></div>}

      {deleteTarget && <div className={styles.modalOverlay}><section className={styles.confirmModal} role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">Excluir produto?</h2><p>{deleteTarget.name} será removido desta lista.</p><div><button type="button" onClick={() => setDeleteTarget(null)}>Cancelar</button><button type="button" onClick={() => { setProducts((current) => current.filter((product) => product.id !== deleteTarget.id)); setDeleteTarget(null); }}>Excluir</button></div></section></div>}
    </div>
  );
}
