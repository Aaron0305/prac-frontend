"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ChevronRight,
  BrainCircuit,
} from "lucide-react";

const NeuralNetworkScene = dynamic(
  () => import("@/components/NeuralNetworkScene"),
  { ssr: false }
);

interface LoginFormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

// ── Animated counter for decorative stats ─────────────────────────────────────
function StatBadge({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xl font-bold text-[#E89A74]">{value}</span>
      <span className="text-[10px] uppercase tracking-widest text-[#7D6860]">
        {label}
      </span>
    </div>
  );
}

// ── Floating particle dot ──────────────────────────────────────────────────────
function Particle({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full bg-[#D97757] opacity-30 animate-float-dot"
      style={style}
    />
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.email.trim()) newErrors.email = "El email es requerido";
    if (!formData.password) newErrors.password = "La contraseña es requerida";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await authApi.login(formData.email, formData.password);
      if (response.success) {
        localStorage.setItem("token", response.token);
        localStorage.setItem("userType", response.user.role);
        localStorage.setItem("userName", response.user.name);
        localStorage.setItem("userId", response.user.id);

        if (response.user.role === "teacher") {
          router.push("/teacher");
        } else {
          router.push("/admin-teachers");
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al conectar con el servidor";
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      {/* ── Global Styles ──────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,600&display=swap');

        * { box-sizing: border-box; }

        body { font-family: 'Inter', sans-serif; }

        @keyframes float-dot {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.25; }
          50% { transform: translateY(-18px) scale(1.15); opacity: 0.45; }
        }
        .animate-float-dot { animation: float-dot var(--dur, 6s) ease-in-out infinite; }

        @keyframes glow-pulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.06); }
        }
        .animate-glow { animation: glow-pulse 4s ease-in-out infinite; }

        @keyframes card-in {
          0% { opacity: 0; transform: translateY(28px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-card-in { animation: card-in 0.7s cubic-bezier(0.22,1,0.36,1) forwards; }

        @keyframes right-in {
          0% { opacity: 0; transform: translateX(40px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-right-in { animation: right-in 0.9s cubic-bezier(0.22,1,0.36,1) 0.15s both; }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.4s ease-out; }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 24s linear infinite; }
        .animate-spin-slow-rev { animation: spin-slow 18s linear infinite reverse; }
      `}</style>

      {/* ── Root ─────────────────────────────────────────────────────────────── */}
      <div
        className="relative min-h-screen w-full overflow-hidden"
        style={{ background: "#0D0A09", fontFamily: "'Inter', sans-serif" }}
      >

        {/* ── Background ────────────────────────────────────────────────────── */}
        <div className="fixed inset-0 pointer-events-none z-0">
          {/* Warm radial glow — left */}
          <div
            className="absolute rounded-full animate-glow"
            style={{
              width: "65vw",
              height: "65vw",
              top: "-25%",
              left: "-20%",
              background:
                "radial-gradient(circle, rgba(180,70,30,0.18) 0%, transparent 70%)",
            }}
          />
          {/* Warm radial glow — right */}
          <div
            className="absolute rounded-full animate-glow"
            style={{
              width: "55vw",
              height: "55vw",
              bottom: "-20%",
              right: "-15%",
              background:
                "radial-gradient(circle, rgba(200,90,40,0.12) 0%, transparent 70%)",
              animationDelay: "2s",
            }}
          />
          {/* Subtle noise / grain texture */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
              backgroundSize: "200px",
              opacity: 0.4,
            }}
          />
          {/* Floating dots */}
          <Particle style={{ width: 6, height: 6, top: "18%", left: "12%", "--dur": "5s" } as React.CSSProperties} />
          <Particle style={{ width: 4, height: 4, top: "65%", left: "8%", "--dur": "7s", animationDelay: "1.5s" } as React.CSSProperties} />
          <Particle style={{ width: 5, height: 5, top: "40%", left: "22%", "--dur": "6.5s", animationDelay: "3s" } as React.CSSProperties} />
          <Particle style={{ width: 3, height: 3, top: "78%", left: "35%", "--dur": "8s", animationDelay: "0.5s" } as React.CSSProperties} />
        </div>

        {/* ── Main layout ───────────────────────────────────────────────────── */}
        <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">

          {/* ═══ LEFT PANE — Form ════════════════════════════════════════════ */}
          <div className="w-full lg:w-[46%] xl:w-[42%] flex flex-col justify-center items-center min-h-screen px-6 py-12 lg:px-12">

            <div className="w-full max-w-[400px] animate-card-in">

              {/* Brand header */}
              <div className="mb-10 flex flex-col items-center text-center">
                <div className="flex items-center gap-2.5 mb-6">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#D97757,#A8442A)" }}
                  >
                    <BrainCircuit className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <span
                    className="text-lg font-bold tracking-tight"
                    style={{ color: "#E8C4A8" }}
                  >
                    RedAI
                  </span>
                </div>

                <h1
                  className="text-4xl font-black tracking-tight leading-tight mb-2"
                  style={{ color: "#F5EDE6" }}
                >
                  Bienvenido de vuelta
                </h1>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#7D6860" }}
                >
                  Accede al asistente de{" "}
                  <span style={{ color: "#D97757" }}>
                    Inteligencia Artificial
                  </span>
                </p>
              </div>

              {/* Error alert */}
              {errors.general && (
                <div
                  className="mb-5 p-3.5 rounded-xl flex items-start gap-3 animate-shake"
                  style={{
                    background: "rgba(217,119,87,0.08)",
                    border: "1px solid rgba(217,119,87,0.25)",
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: "rgba(217,119,87,0.2)" }}
                  >
                    <span className="text-[10px] font-bold text-[#D97757]">!</span>
                  </div>
                  <p className="text-sm text-[#E8C4A8]">{errors.general}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Email field */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[11px] uppercase tracking-widest font-semibold"
                    style={{ color: "#7D6860" }}
                    htmlFor="login-email"
                  >
                    Correo electrónico
                  </label>
                  <div className="relative group">
                    <div
                      className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200"
                      style={{ color: "#57403A" }}
                    >
                      <Mail className="w-4 h-4 group-focus-within:!text-[#D97757] transition-colors duration-200" />
                    </div>
                    <input
                      id="login-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="tu@email.com"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all duration-200"
                      style={{
                        background: "#1A1210",
                        border: `1px solid ${errors.email ? "rgba(217,119,87,0.5)" : "#2E201A"}`,
                        color: "#F5EDE6",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.border = "1px solid rgba(217,119,87,0.5)";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(217,119,87,0.08)";
                        e.currentTarget.previousElementSibling!.querySelector("svg")!.style.color = "#D97757";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.border = `1px solid ${errors.email ? "rgba(217,119,87,0.5)" : "#2E201A"}`;
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.previousElementSibling!.querySelector("svg")!.style.color = "#57403A";
                      }}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] text-[#D97757] pl-1">{errors.email}</p>
                  )}
                </div>

                {/* Password field */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[11px] uppercase tracking-widest font-semibold"
                    style={{ color: "#7D6860" }}
                    htmlFor="login-password"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <div
                      className="absolute left-4 top-1/2 -translate-y-1/2"
                      style={{ color: "#57403A" }}
                      id="lock-icon-wrapper"
                    >
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="••••••••"
                      className="w-full pl-11 pr-11 py-3.5 rounded-xl text-sm outline-none transition-all duration-200"
                      style={{
                        background: "#1A1210",
                        border: `1px solid ${errors.password ? "rgba(217,119,87,0.5)" : "#2E201A"}`,
                        color: "#F5EDE6",
                        letterSpacing: showPassword ? "normal" : "0.12em",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.border = "1px solid rgba(217,119,87,0.5)";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(217,119,87,0.08)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.border = `1px solid ${errors.password ? "rgba(217,119,87,0.5)" : "#2E201A"}`;
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors duration-200"
                      style={{ color: "#57403A" }}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 hover:text-[#D97757]" />
                      ) : (
                        <Eye className="w-4 h-4 hover:text-[#D97757]" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-[#D97757] pl-1">{errors.password}</p>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-[11px] transition-colors duration-200 hover:text-[#D97757]"
                      style={{ color: "#57403A" }}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  id="login-submit"
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.97] overflow-hidden group"
                  style={{
                    background: "linear-gradient(135deg, #D97757 0%, #C06040 100%)",
                    color: "#FFF8F5",
                    boxShadow: "0 8px 32px rgba(180,70,30,0.35)",
                    marginTop: "8px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 10px 40px rgba(180,70,30,0.5)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(180,70,30,0.35)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {/* shine sweep on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 50%, transparent)",
                    }}
                  />
                  <span className="relative flex items-center justify-center gap-2">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Ingresar al Dashboard
                        <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </>
                    )}
                  </span>
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px" style={{ background: "#1E1410" }} />
                <span className="text-[11px]" style={{ color: "#3D2A22" }}>
                  o
                </span>
                <div className="flex-1 h-px" style={{ background: "#1E1410" }} />
              </div>

              {/* Bottom stats */}
              <div
                className="rounded-xl p-4 flex items-center justify-around"
                style={{ background: "#120E0C", border: "1px solid #1E1410" }}
              >
                <StatBadge value="2ª Ed." label="Edición" />
                <div className="w-px h-8" style={{ background: "#1E1410" }} />
                <StatBadge value="1,100+" label="Páginas" />
                <div className="w-px h-8" style={{ background: "#1E1410" }} />
                <StatBadge value="IA" label="Enfoque moderno" />
              </div>

              <p className="text-center text-[11px] mt-5" style={{ color: "#3D2A22" }}>
                Russell & Norvig · Pearson Prentice Hall
              </p>
            </div>
          </div>

          {/* ═══ RIGHT PANE — 3D Visual ══════════════════════════════════════ */}
          <div className="hidden lg:flex flex-1 relative items-center justify-center animate-right-in">

            {/* Decorative ring 1 */}
            <div
              className="absolute rounded-full animate-spin-slow pointer-events-none"
              style={{
                width: 480,
                height: 480,
                border: "1px solid rgba(217,119,87,0.12)",
              }}
            />
            {/* Decorative ring 2 */}
            <div
              className="absolute rounded-full animate-spin-slow-rev pointer-events-none"
              style={{
                width: 360,
                height: 360,
                border: "1px solid rgba(217,119,87,0.08)",
              }}
            />

            {/* Center glow */}
            <div
              className="absolute rounded-full animate-glow pointer-events-none"
              style={{
                width: 320,
                height: 320,
                background:
                  "radial-gradient(circle, rgba(180,70,30,0.14) 0%, transparent 70%)",
              }}
            />

            {/* 3D Canvas */}
            <div style={{ width: 520, height: 520 }}>
              <NeuralNetworkScene />
            </div>

            {/* Bottom label */}
            <div
              className="absolute bottom-12 flex flex-col items-center gap-2"
            >
              <p
                className="text-xs font-medium tracking-widest uppercase"
                style={{ color: "#57403A" }}
              >
                Red Neuronal Artificial
              </p>
              <div
                className="h-px w-24"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #D97757, transparent)",
                }}
              />
              <p
                className="text-[11px] text-center leading-relaxed max-w-[220px]"
                style={{ color: "#3D2A22" }}
              >
                Inteligencia Artificial: Un Enfoque Moderno
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
