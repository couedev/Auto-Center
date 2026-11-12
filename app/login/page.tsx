"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CarFront,
  ChartNoAxesCombined,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Package,
  Wrench,
} from "lucide-react";

// Os espaços nos nomes dos arquivos foram codificados como %20 para uso em URLs.
const ASSETS = {
  logo: "/assets/Auto%20CT%20transparent%20logo-2.webp",
  upperCorner: "/assets/Metallic%20lime%20neon%20corner%20border-3.webp",
  lowerCorner: "/assets/Lower-right%20neon%20metallic%20corner%20border-4.webp",
  asphalt: "/assets/Neon%20Green%20Wet%20Asphalt%20Reflections-7.webp",
  hexagonsSubtle: "/assets/Subtle%20Transparent%20Honeycomb%20Line%20Overlay-5.webp",
  hexagons: "/assets/Transparent%20honeycomb%20grid%20overlay-6.webp",
  car: "/assets/Wet%20Black%20Car%20with%20Neon%20Reflections-1.webp",
};

const features = [
  { title: "Lavagem", subtitle: "Automotiva", Icon: CarFront },
  { title: "Serviços", subtitle: "Automotivos", Icon: Wrench },
  { title: "Estoque", subtitle: "e Produtos", Icon: Package },
  { title: "Gestão", subtitle: "Completa", Icon: ChartNoAxesCombined },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // ADAPTE ESTA CHAMADA à autenticação real do Auto CT.
      // O endpoint /api/auth/login é apenas o contrato sugerido para o backend.
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: email.trim(),
          password,
          remember,
        }),
      });

      if (!response.ok) {
        let message = "Não foi possível entrar. Verifique seus dados.";
        try {
          const data: { message?: unknown } = await response.json();
          if (typeof data.message === "string" && data.message.trim()) {
            message = data.message;
          }
        } catch {
          // A resposta pode não conter JSON.
        }
        throw new Error(message);
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao entrar.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-dvh items-center overflow-hidden bg-[#030505] font-sans text-white">
      {/* Iluminação ambiente: os elementos não interferem no formulário. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_9%_9%,rgba(125,255,20,0.075),transparent_29%),radial-gradient(ellipse_at_96%_85%,rgba(86,230,0,0.085),transparent_27%)]"
      />

      {/* Texturas de fundo: ambas ficam abaixo das imagens e do conteúdo. */}
      <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-[1] hidden h-[min(48vh,470px)] w-[min(52vw,780px)] opacity-[0.045] sm:block">
        <Image src={ASSETS.hexagonsSubtle} alt="" fill sizes="(max-width: 1280px) 52vw, 780px" className="object-contain object-left-top" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 z-[1] hidden h-[min(44vh,400px)] w-[min(43vw,640px)] opacity-[0.12] sm:block">
        <Image src={ASSETS.hexagons} alt="" fill sizes="(max-width: 1280px) 43vw, 640px" className="object-contain object-right-bottom" />
      </div>

      {/* Reflexo do asfalto na base */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-[3vh] z-[1] h-[min(20vh,160px)] opacity-35 sm:h-[min(24vh,240px)] sm:opacity-50"
        style={{ maskImage: "linear-gradient(to bottom, transparent, black 52%, black)" }}
      >
        <Image src={ASSETS.asphalt} alt="" fill sizes="100vw" className="object-cover object-bottom" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute bottom-[10%] left-0 z-[1] hidden h-px w-[58%] bg-gradient-to-r from-transparent via-lime-400/30 to-transparent shadow-[0_0_12px_1px_rgba(119,255,0,0.14)] sm:block" />

      {/* Cantos metálicos/neon */}
      <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-[2] hidden aspect-[2/1] w-[min(31vw,500px)] lg:block">
        <Image src={ASSETS.upperCorner} alt="" fill sizes="(max-width: 1613px) 31vw, 500px" className="object-contain object-left-top" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 z-[2] hidden aspect-[3/1] w-[min(58vw,880px)] lg:block">
        <Image src={ASSETS.lowerCorner} alt="" fill sizes="(max-width: 1280px) 58vw, 880px" className="object-contain object-right-bottom" />
      </div>

      {/* Carro recortado: decorativo no desktop, omitido no celular. */}
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-[5vh] -left-[9vw] z-[3] hidden h-[min(68vh,640px)] w-[min(42vw,590px)] overflow-hidden lg:block">
        <Image
          src={ASSETS.car}
          alt=""
          fill
          priority
          sizes="(max-width: 1400px) 42vw, 590px"
          className="object-contain object-left-bottom drop-shadow-[0_0_16px_rgba(105,255,0,0.16)]"
        />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-[1690px] grid-cols-1 items-center gap-7 px-5 py-8 sm:px-8 lg:min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(470px,630px)] lg:gap-10 lg:px-[clamp(36px,5.5vw,90px)] lg:py-14 xl:gap-14">
        {/* Marca e serviços */}
        <section aria-label="Auto CT Auto Center" className="relative order-2 flex w-full flex-col items-center lg:order-1 lg:items-start lg:pl-[clamp(10px,8vw,135px)]">
          <div className="relative h-[160px] w-full max-w-[500px] sm:h-[205px] lg:h-[245px] lg:max-w-[550px]">
            <Image
              src={ASSETS.logo}
              alt="Auto CT Auto Center"
              fill
              priority
              sizes="(max-width: 1023px) 90vw, 550px"
              className="object-contain"
            />
          </div>

          <div className="mt-0 grid w-full max-w-[530px] grid-cols-4 sm:mt-3 lg:mt-6">
            {features.map(({ title, subtitle, Icon }, index) => (
              <div
                key={title}
                className={`flex min-w-0 flex-col items-center justify-start px-1 text-center sm:px-3 ${index !== 0 ? "border-l border-white/20" : ""}`}
              >
                <Icon aria-hidden="true" size={33} strokeWidth={1.55} className="mb-2 h-7 w-7 text-[#8fff00] drop-shadow-[0_0_7px_rgba(121,255,0,0.22)] sm:h-9 sm:w-9" />
                <span className="text-[10px] leading-[1.3] text-white/90 sm:text-[13px] xl:text-[14px]">
                  {title}
                  <br />
                  {subtitle}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Borda em degradê e painel de login */}
        <div className="relative z-20 order-1 mx-auto w-full max-w-[500px] rounded-[32px] bg-[linear-gradient(135deg,rgba(216,255,187,0.92)_0%,rgba(122,255,0,0.78)_9%,rgba(100,112,104,0.35)_33%,rgba(78,91,80,0.28)_75%,rgba(121,255,0,0.52)_100%)] p-[1.5px] shadow-[0_25px_85px_rgba(0,0,0,0.62),0_0_48px_rgba(100,255,0,0.08)] lg:order-2">
          <section className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(155deg,rgba(32,36,34,0.97),rgba(8,11,10,0.97)_54%,rgba(4,7,6,0.98))] px-6 py-9 sm:px-10">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_at_42%_0%,rgba(111,255,0,0.08),transparent_65%)]" />

            <div className="relative">
              <h1 className="text-[29px] font-semibold leading-tight tracking-[-0.025em] sm:text-[36px]">
                Acesso ao Sistema
              </h1>
              <p className="mt-1 text-[17px] text-zinc-300 sm:text-[23px]">Dashboard Administrativo</p>
              <div aria-hidden="true" className="mt-5 h-[4px] w-[64px] rounded-full bg-[#85fa00] shadow-[0_0_9px_rgba(120,255,0,0.36)]" />
            </div>

            <form onSubmit={handleSubmit} className="relative mt-8 space-y-5">
              <div className="relative">
                <label htmlFor="email" className="sr-only">E-mail</label>
                <Mail aria-hidden="true" size={25} strokeWidth={1.65} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-white/90" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  placeholder="E-mail"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  style={{ height: 56 }}
                  className="w-full rounded-[13px] border border-white/35 bg-white/[0.035] pl-[66px] pr-5 text-[17px] text-white outline-none transition-colors placeholder:text-zinc-400 hover:border-white/55 focus:border-[#8afa00] focus:ring-2 focus:ring-lime-400/15"
                />
              </div>

              <div className="relative">
                <label htmlFor="password" className="sr-only">Senha</label>
                <LockKeyhole aria-hidden="true" size={25} strokeWidth={1.65} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-white/90" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Senha"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  style={{ height: 56 }}
                  className="w-full rounded-[13px] border border-white/35 bg-white/[0.035] pl-[66px] pr-[60px] text-[17px] text-white outline-none transition-colors placeholder:text-zinc-400 hover:border-white/55 focus:border-[#8afa00] focus:ring-2 focus:ring-lime-400/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-2 text-white/90 transition-colors hover:text-[#9aff20] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
                >
                  {showPassword ? <EyeOff size={24} strokeWidth={1.7} /> : <Eye size={24} strokeWidth={1.7} />}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pt-1">
                <label className="flex cursor-pointer items-center gap-3 text-[13px] text-white sm:text-[15px]">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="h-6 w-6 cursor-pointer rounded-[5px] accent-[#8ffa00]"
                  />
                  Lembrar acesso
                </label>
                <Link href="/recuperar-senha" className="text-[13px] font-medium text-[#8ffa00] transition-colors hover:text-[#b9ff5a] hover:underline sm:text-[15px]">
                  Esqueci minha senha
                </Link>
              </div>

              {error && (
                <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                style={{ height: 60 }}
                className="group mt-2 flex w-full items-center justify-center gap-4 rounded-[13px] border border-[#c2ff72] bg-[linear-gradient(180deg,#b8ff4b_0%,#91ff0d_44%,#6adb00_100%)] text-[25px] font-bold text-black shadow-[0_12px_25px_rgba(102,242,0,0.17),0_0_24px_rgba(103,255,0,0.1)] transition duration-200 hover:brightness-110 hover:shadow-[0_12px_32px_rgba(102,242,0,0.26)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-300 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 sm:text-[29px]"
              >
                {isLoading ? (
                  <><LoaderCircle aria-hidden="true" className="animate-spin" size={27} /> Entrando...</>
                ) : (
                  <>Entrar <ArrowRight aria-hidden="true" size={34} strokeWidth={2.1} className="transition-transform group-hover:translate-x-1" /></>
                )}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
