"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MobileTabBar from "./mobile-tab-bar";
import { formatPrice, mapCatalogService } from "./services";
import type { Service } from "./services";
import styles from "./home.module.css";
import skeleton from "./skeleton.module.css";

export default function ApplicationHomePage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [companyName, setCompanyName] = useState("Auto CT");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadServices() {
      try {
        const response = await fetch("/api/app/catalog", { cache: "no-store" });
        const result = await response.json() as { services?: unknown[]; config?: { name?: string }; message?: string };
        if (!response.ok) throw new Error(result.message || "Não foi possível carregar os serviços.");
        if (!active) return;
        setServices((result.services ?? []).map(mapCatalogService).filter((item): item is Service => item !== null));
        if (typeof result.config?.name === "string" && result.config.name.trim()) setCompanyName(result.config.name);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Não foi possível carregar os serviços.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadServices();
    return () => { active = false; };
  }, []);

  function chooseService(service: Service) {
    try { window.sessionStorage.setItem("auto-ct-selected-service", service.id); } catch {}
    router.push("/aplicativo/agendamento");
  }

  return (
    <div className={styles.canvas}>
      <main className={styles.app}>
        <header className={styles.brandHero}>
          <span className={styles.heroArc} aria-hidden="true" />
          <div className={styles.logoWrap}>
            <Image
              src="/assets/Auto%20CT%20transparent%20logo-2.webp"
              alt="Auto CT Auto Center"
              width={420}
              height={210}
              priority
              className={styles.logo}
              style={{ width: "100%", height: "auto" }}
            />
          </div>
        </header>

        <div className={styles.content}>
          <section className={styles.welcome} aria-labelledby="welcome-title">
            <h1 id="welcome-title">Bem-vindo!</h1>
            <p>Escolha um serviço na {companyName} e agende seu horário.</p>
          </section>

          <section className={styles.servicesSection} aria-labelledby="services-title">
            <h2 id="services-title">Nossos serviços</h2>
            {loading ? (
              <>
                <p className={skeleton.srOnly} role="status">Carregando serviços...</p>
                <div className={styles.serviceList} aria-hidden="true">
                  {[0, 1, 2].map((item) => (
                    <article className={styles.serviceCard} key={item}>
                      <span className={`${styles.serviceThumb} ${styles.skeletonThumb} ${skeleton.skeleton}`} />
                      <div className={styles.skeletonServiceInfo}>
                        <span className={`${styles.skeletonName} ${skeleton.skeleton}`} />
                        <span className={`${styles.skeletonPrice} ${skeleton.skeleton}`} />
                      </div>
                      <span className={`${styles.skeletonBookButton} ${skeleton.skeleton}`} />
                    </article>
                  ))}
                </div>
              </>
            ) : error ? (
              <div className={styles.loadError} role="alert">
                <p>{error}</p>
                <button type="button" onClick={() => window.location.reload()}>Tentar novamente</button>
              </div>
            ) : services.length ? (
              <div className={styles.serviceList}>
                {services.map((service) => (
                  <article className={styles.serviceCard} key={service.id}>
                    <div
                      className={[styles.serviceThumb, service.imageUrl ? styles.servicePhoto : styles[service.tone]].join(" ")}
                      style={service.imageUrl ? { backgroundImage: "url(" + JSON.stringify(service.imageUrl) + ")" } : undefined}
                      aria-hidden="true"
                    >
                      {!service.imageUrl && <service.Icon strokeWidth={1.65} />}
                    </div>
                    <div className={styles.serviceInfo}>
                      <h3>{service.name}</h3>
                      <strong>{formatPrice(service.price)}</strong>
                    </div>
                    <button type="button" className={styles.bookButton} aria-label={`Agendar ${service.name}`} onClick={() => chooseService(service)}>
                      Agendar
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.loadMessage}>Nenhum serviço está disponível para agendamento agora.</p>
            )}
          </section>
        </div>

        <MobileTabBar active="home" />
      </main>
    </div>
  );
}
