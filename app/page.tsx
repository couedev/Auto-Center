import Link from "next/link";
import styles from "./page.module.css";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10h11m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m4.5 10.5 3.3 3.3 7.7-7.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="m6 19 2-7a3 3 0 0 1 2.9-2h10.2A3 3 0 0 1 24 12l2 7M7 19h18v5H7v-5Zm3 0h.01M22 19h.01M9 24v2m14-2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WashIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 4c3 4.4 8 10.2 8 15a8 8 0 0 1-16 0c0-4.8 5-10.6 8-15Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 20a4 4 0 0 0 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M25 5v6m-3-3h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M6 25V7m0 18h20M10 20l6-7 4 3 6-8m-5 0h5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className={styles.shell}>
      <main className={styles.page}>
        <header className={styles.header}>
          <Link href="/" className={styles.logo} aria-label="AutoCenter, início">
            <span className={styles.logoMark}>a<span>.</span></span>
            <span>auto<strong>center</strong></span>
          </Link>

          <nav className={styles.nav} aria-label="Navegação principal">
            <a href="#recursos">Recursos</a>
            <a href="#como-funciona">Como funciona</a>
          </nav>

          <div className={styles.headerActions}>
            <Link href="/login" className={styles.loginButton}>Entrar</Link>
            <Link href="/dashboard" className={styles.headerButton}>Começar agora <ArrowIcon /></Link>
          </div>
        </header>

        <section className={styles.hero} aria-labelledby="hero-title">
          <span className={`${styles.sparkle} ${styles.sparkleOne}`} aria-hidden="true">✦</span>
          <span className={`${styles.sparkle} ${styles.sparkleTwo}`} aria-hidden="true">✦</span>
          <span className={`${styles.sparkle} ${styles.sparkleThree}`} aria-hidden="true">✧</span>

          <p className={styles.eyebrow}>GESTÃO INTELIGENTE PARA LAVA-JATOS</p>
          <h1 id="hero-title">Mais organização.<br /><em>Mais resultados.</em></h1>
          <p className={styles.heroText}>
            Organize a fila, acompanhe cada lavagem e tenha o controle
            do seu lava-jato em um só lugar. Simples, rápido e sem complicação.
          </p>
          <div className={styles.heroActions}>
            <Link href="/dashboard" className={styles.primaryButton}>Acessar dashboard <ArrowIcon /></Link>
            <Link href="#como-funciona" className={styles.heroTextLink}>Descubra como funciona</Link>
          </div>
        </section>

        <div className={styles.dividerLabel}>
          <span /> TUDO QUE SUA OPERAÇÃO PRECISA <span />
        </div>

        <div className={styles.highlightBar} aria-label="Vantagens do AutoCenter">
          <span><CheckIcon /> Fila organizada</span>
          <span><CheckIcon /> Serviços em dia</span>
          <span><CheckIcon /> Equipe alinhada</span>
          <span><CheckIcon /> Controle diário</span>
        </div>

        <section className={styles.intro} id="recursos">
          <div className={styles.introLeft}>
            <p className={styles.sectionLabel}>COMO TRABALHAMOS</p>
            <h2>Uma gestão mais simples para seu lava-jato crescer.</h2>
          </div>
          <div className={styles.introRight}>
            <p>
              Deixe a correria para trás. Tenha uma visão clara dos veículos,
              dos serviços e do movimento do dia, sem perder tempo com anotações.
            </p>
            <Link href="/dashboard" className={styles.smallButton}>Conhecer o painel <ArrowIcon /></Link>
          </div>
        </section>

        <section className={styles.steps} id="como-funciona" aria-label="Como funciona o AutoCenter">
          <article className={styles.step}>
            <span className={styles.stepConnector} aria-hidden="true" />
            <div className={styles.stepIcon}><CarIcon /></div>
            <h3>Registre cada chegada</h3>
            <p>Adicione os veículos e organize a ordem de atendimento em poucos cliques.</p>
          </article>
          <article className={styles.step}>
            <span className={styles.stepConnector} aria-hidden="true" />
            <div className={styles.stepIcon}><WashIcon /></div>
            <h3>Acompanhe os serviços</h3>
            <p>Saiba o que está na fila, em andamento ou pronto para entregar.</p>
          </article>
          <article className={styles.step}>
            <div className={styles.stepIcon}><ChartIcon /></div>
            <h3>Tenha visão do negócio</h3>
            <p>Consulte os atendimentos e acompanhe os resultados de cada dia.</p>
          </article>
        </section>

        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} AutoCenter. Sua operação, mais organizada.</span>
          <Link href="/login">Entrar na plataforma <ArrowIcon /></Link>
        </footer>
      </main>
    </div>
  );
}
