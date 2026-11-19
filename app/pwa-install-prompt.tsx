"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Bell, CalendarDays, ChartNoAxesCombined, Copy, Package, Tag, X } from "lucide-react";
import styles from "./pwa-install-prompt.module.css";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};
type Platform = { isAndroid: boolean; isIos: boolean; isMobile: boolean; isSafari: boolean };
type NavigatorWithInstall = Navigator & { install?: () => Promise<void> };

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function getPlatform(): Platform {
  if (typeof window === "undefined") return { isAndroid: false, isIos: false, isMobile: false, isSafari: false };

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  const isAndroid = /android/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios|edgios|opr\//.test(userAgent);

  return { isAndroid, isIos, isMobile: isAndroid || isIos, isSafari };
}

export default function PwaInstallPrompt({ kind = "client" }: { kind?: "client" | "admin" }) {
  const isAdmin = kind === "admin";
  const [ready, setReady] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isDismissed, setIsDismissed] = useState(true);
  const [platform, setPlatform] = useState<Platform>({ isAndroid: false, isIos: false, isMobile: false, isSafari: false });
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [supportsWebInstall, setSupportsWebInstall] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const dismissPrompt = useCallback(() => {
    setIsDismissed(true);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const nativeInstall = typeof (window.navigator as NavigatorWithInstall).install === "function";

    function handleDisplayModeChange() {
      setIsStandalone(isStandaloneMode());
    }

    function handleBeforeInstallPrompt(event: Event) {
      if (isAdmin && !getPlatform().isMobile) return;
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsStandalone(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    media.addEventListener?.("change", handleDisplayModeChange);
    if (!media.addEventListener) media.addListener?.(handleDisplayModeChange);

    const frame = window.requestAnimationFrame(() => {
      setPlatform(getPlatform());
      setSupportsWebInstall(nativeInstall);
      setIsStandalone(isStandaloneMode());
      setIsDismissed(false);
      setReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      media.removeEventListener?.("change", handleDisplayModeChange);
      if (!media.removeEventListener) media.removeListener?.(handleDisplayModeChange);
    };
  }, [isAdmin]);

  const canInstall = supportsWebInstall || Boolean(deferredPrompt);
  const shouldShow = ready && !isStandalone && !isDismissed &&
    (isAdmin ? platform.isMobile : platform.isMobile || canInstall);

  useEffect(() => {
    if (!shouldShow) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [shouldShow]);

  useEffect(() => {
    if (!shouldShow) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") dismissPrompt();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [shouldShow, dismissPrompt]);

  async function installApp() {
    if (isInstalling) return;
    setIsInstalling(true);
    setInstallError(false);

    try {
      const install = (window.navigator as NavigatorWithInstall).install;
      if (install) {
        await install.call(window.navigator);
        setIsStandalone(true);
        return;
      }

      if (!deferredPrompt) return;
      const promptEvent = deferredPrompt;
      setDeferredPrompt(null);
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setIsStandalone(true);
      } else {
        dismissPrompt();
      }
    } catch {
      setInstallError(true);
    } finally {
      setIsInstalling(false);
    }
  }

  async function copyAppLink() {
    const appLink = new URL(isAdmin ? "/dashboard" : "/aplicativo", window.location.origin).toString();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(appLink);
      } else {
        const input = document.createElement("textarea");
        input.value = appLink;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(input);
        if (!copied) throw new Error("clipboard unavailable");
      }
      setCopiedLink(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  }

  if (!shouldShow) return null;

  const showIosGuide = platform.isIos;
  const showAndroidGuide = platform.isAndroid && !canInstall;

  return (
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) dismissPrompt(); }}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={`${kind}-install-title`}>
        <header className={styles.header}>
          <Image
            src={isAdmin ? "/icon/admin/icon-auto-admin-192.png" : "/assets/Auto%20CT%20transparent%20logo-2.webp"}
            alt={isAdmin ? "Auto CT Admin" : "Auto CT Auto Center"}
            width={isAdmin ? 64 : 220}
            height={isAdmin ? 64 : 110}
            priority
            className={isAdmin ? styles.adminIcon : styles.logo}
          />
          <button type="button" className={styles.closeButton} onClick={dismissPrompt} aria-label="Fechar aviso de instalação"><X /></button>
        </header>

        <p className={styles.eyebrow}>{isAdmin ? "PAINEL ADMINISTRATIVO" : "APLICATIVO AUTO CT"}</p>
        <h2 className={styles.title} id={`${kind}-install-title`}>Instale o aplicativo <span>{isAdmin ? "Auto CT Admin" : "Auto CT"}</span></h2>
        <p className={styles.description}>
          {showIosGuide
            ? `Siga os passos abaixo para adicionar o ${isAdmin ? "Auto CT Admin" : "Auto CT"} à tela inicial.`
            : isAdmin
              ? "Acompanhe a operação da Auto CT direto da tela inicial do celular."
              : "Mais praticidade para cuidar do seu veículo, direto da tela inicial do celular."}
        </p>

        {!showIosGuide && (
          <ul className={styles.features}>
            {isAdmin ? (
              <>
                <li><span className={styles.featureIcon}><ChartNoAxesCombined aria-hidden="true" /></span><span><strong>Veja o faturamento</strong><small>Acompanhe os resultados do negócio.</small></span></li>
                <li><span className={styles.featureIcon}><CalendarDays aria-hidden="true" /></span><span><strong>Gerencie agendamentos</strong><small>Atenda solicitações e acompanhe serviços.</small></span></li>
                <li><span className={styles.featureIcon}><Package aria-hidden="true" /></span><span><strong>Organize o catálogo</strong><small>Atualize produtos e serviços.</small></span></li>
              </>
            ) : (
              <>
                <li><span className={styles.featureIcon}><CalendarDays aria-hidden="true" /></span><span><strong>Agende seu serviço</strong><small>Escolha o dia e o horário ideal.</small></span></li>
                <li><span className={styles.featureIcon}><Tag aria-hidden="true" /></span><span><strong>Confira serviços e preços</strong><small>Veja as opções disponíveis na unidade.</small></span></li>
                <li><span className={styles.featureIcon}><Bell aria-hidden="true" /></span><span><strong>Acompanhe seus agendamentos</strong><small>Consulte os pedidos direto no seu perfil.</small></span></li>
              </>
            )}
          </ul>
        )}

        {canInstall && (
          <button type="button" className={styles.installButton} onClick={installApp} disabled={isInstalling}>
            <ArrowDownToLine aria-hidden="true" />{isInstalling ? "Abrindo instalação..." : "Instalar aplicativo"}
          </button>
        )}
        {installError && <p className={styles.installError} role="alert">O navegador não conseguiu abrir a instalação. Tente pelo menu do navegador.</p>}

        {showAndroidGuide && (
          <div className={styles.guide}>
            <p><strong>Para instalar:</strong> abra o menu do navegador e escolha <b>Instalar aplicativo</b> ou <b>Adicionar à tela inicial</b>.</p>
          </div>
        )}

        {showIosGuide && (
          <div className={styles.guide}>
            <div className={styles.guideStep}>
              <span className={styles.guideIcon}><ArrowUpFromLine aria-hidden="true" /></span>
              <span><strong>1. Toque em Compartilhar</strong><small>Use o botão de compartilhamento do Safari.</small></span>
            </div>
            <div className={styles.guideStep}>
              <span className={styles.guideIcon}><ArrowDownToLine aria-hidden="true" /></span>
              <span><strong>2. Adicionar à Tela de Início</strong><small>Ative “Abrir como App da Web”, se aparecer, e toque em Adicionar.</small></span>
            </div>
          </div>
        )}

        {showIosGuide && !platform.isSafari && (
          <div className={styles.copyArea}>
            <p>Abra este endereço no Safari para concluir a instalação.</p>
            <button type="button" className={styles.copyButton} onClick={copyAppLink}>
              <Copy aria-hidden="true" />{copiedLink ? "Link copiado" : "Copiar link do aplicativo"}
            </button>
            {copyError && <span role="alert">Não foi possível copiar. Copie o endereço do navegador.</span>}
          </div>
        )}

        <button type="button" className={styles.dismissButton} onClick={dismissPrompt}>
          {showIosGuide ? "Entendi" : "Agora não"}
        </button>
      </section>
    </div>
  );
}
