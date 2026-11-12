"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import MobileTabBar from "./mobile-tab-bar";
import { services } from "./services";
import type { Service } from "./services";
import styles from "./home.module.css";

export default function ApplicationHomePage() {
  const router = useRouter();

  function chooseService(service: Service) {
    try {
      window.sessionStorage.setItem("auto-ct-selected-service", service.id);
    } catch {
      // O agendamento ainda pode ser aberto com o serviço padrão.
    }
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
            <p>Escolha um serviço e agende seu horário.</p>
          </section>

          <section className={styles.servicesSection} aria-labelledby="services-title">
            <h2 id="services-title">Nossos serviços</h2>
            <div className={styles.serviceList}>
              {services.map((service) => {
                return (
                  <article className={styles.serviceCard} key={service.id}>
                    <div className={`${styles.serviceThumb} ${styles[service.tone]}`} aria-hidden="true">
                      <service.Icon strokeWidth={1.65} />
                    </div>
                    <div className={styles.serviceInfo}>
                      <h3>{service.name}</h3>
                      <strong>R$ {service.price}</strong>
                    </div>
                    <button type="button" className={styles.bookButton} aria-label={`Agendar ${service.name}`} onClick={() => chooseService(service)}>
                      Agendar
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <MobileTabBar active="home" />
      </main>
    </div>
  );
}
