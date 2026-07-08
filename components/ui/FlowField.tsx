"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ColorTheme = "aurora" | "ember" | "ocean";
type ParticleDensity = "sparse" | "medium" | "dense";

interface Particle {
    x: number;
    y: number;
    speed: number;
    hue: number;
    life: number;
    maxLife: number;
}

interface ThemeConfig {
    hueStart: number;
    hueRange: number;
    saturation: number;
    lightness: number;
    bg: string;
    trailAlpha: number;
    particleAlpha: number;
}

interface FlowFieldProps {
    className?: string;
    theme?: ColorTheme;
    density?: ParticleDensity;
}

const PARTICLE_COUNTS: Record<ParticleDensity, number> = {
    sparse: 220,
    medium: 420,
    dense: 760,
};

const THEMES_DARK: Record<ColorTheme, ThemeConfig> = {
    aurora: {
        hueStart: 120,
        hueRange: 200,
        saturation: 90,
        lightness: 62,
        bg: "5, 5, 8",
        trailAlpha: 0.06,
        particleAlpha: 0.9,
    },
    ember: {
        hueStart: 0,
        hueRange: 55,
        saturation: 95,
        lightness: 58,
        bg: "8, 4, 2",
        trailAlpha: 0.07,
        particleAlpha: 0.9,
    },
    ocean: {
        hueStart: 180,
        hueRange: 90,
        saturation: 88,
        lightness: 60,
        bg: "2, 6, 10",
        trailAlpha: 0.06,
        particleAlpha: 0.9,
    },
};

const THEMES_LIGHT: Record<ColorTheme, ThemeConfig> = {
    aurora: {
        hueStart: 145,
        hueRange: 165,
        saturation: 75,
        lightness: 42,
        bg: "244, 248, 255",
        trailAlpha: 0.075,
        particleAlpha: 0.42,
    },
    ember: {
        hueStart: 8,
        hueRange: 48,
        saturation: 80,
        lightness: 40,
        bg: "255, 248, 244",
        trailAlpha: 0.08,
        particleAlpha: 0.4,
    },
    ocean: {
        hueStart: 196,
        hueRange: 72,
        saturation: 76,
        lightness: 38,
        bg: "241, 247, 255",
        trailAlpha: 0.075,
        particleAlpha: 0.42,
    },
};

function fieldAngle(x: number, y: number, t: number): number {
    const s = 0.0025;
    return (
        Math.sin(x * s + t * 0.0007) * Math.PI +
        Math.cos(y * s + t * 0.0005) * Math.PI +
        Math.sin((x + y) * s * 0.6 + t * 0.0009) * Math.PI * 0.6 +
        Math.cos((x - y) * s * 0.4 + t * 0.0006) * Math.PI * 0.4
    );
}

export default function FlowField({
    className,
    theme = "ocean",
    density = "sparse",
}: FlowFieldProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const updateTheme = () => setIsDarkMode(media.matches);

        updateTheme();

        media.addEventListener("change", updateTheme);
        return () => media.removeEventListener("change", updateTheme);
    }, []);

    useEffect(() => {
        const wrapper = wrapperRef.current;
        const canvas = canvasRef.current;
        if (!wrapper || !canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const cfg = (isDarkMode ? THEMES_DARK : THEMES_LIGHT)[theme];
        const count = PARTICLE_COUNTS[density];
        const dpr = window.devicePixelRatio ?? 1;

        let width = 0;
        let height = 0;
        let animId = 0;
        let time = 0;
        let particles: Particle[] = [];
        let isVisible = document.visibilityState === "visible";
        let lastFrame = 0;
        const targetFps = 40;
        const frameInterval = 1000 / targetFps;

        const spawnParticle = (): Particle => {
            const maxLife = 200 + Math.floor(Math.random() * 300);
            return {
                x: Math.random() * width,
                y: Math.random() * height,
                speed: 1.1 + Math.random() * 1.8,
                hue: cfg.hueStart + Math.random() * cfg.hueRange,
                life: Math.floor(Math.random() * maxLife),
                maxLife,
            };
        };

        const resize = () => {
            width = wrapper.clientWidth;
            height = wrapper.clientHeight;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);

            ctx.fillStyle = `rgb(${cfg.bg})`;
            ctx.fillRect(0, 0, width, height);

            particles = Array.from({ length: count }, spawnParticle);
        };

        const render = (now: number) => {
            if (!isVisible) {
                animId = requestAnimationFrame(render);
                return;
            }

            if (now - lastFrame < frameInterval) {
                animId = requestAnimationFrame(render);
                return;
            }

            lastFrame = now;
            time++;
            ctx.fillStyle = `rgba(${cfg.bg}, ${cfg.trailAlpha})`;
            ctx.fillRect(0, 0, width, height);

            for (const p of particles) {
                const angle = fieldAngle(p.x, p.y, time);

                p.x += Math.cos(angle) * p.speed;
                p.y += Math.sin(angle) * p.speed;
                p.life++;

                if (p.life > p.maxLife) {
                    p.x = Math.random() * width;
                    p.y = Math.random() * height;
                    p.life = 0;
                    p.hue = cfg.hueStart + Math.random() * cfg.hueRange;
                    continue;
                }

                if (p.x < 0) p.x += width;
                else if (p.x > width) p.x -= width;
                if (p.y < 0) p.y += height;
                else if (p.y > height) p.y -= height;

                const progress = p.life / p.maxLife;
                const fadeIn = Math.min(progress * 8, 1);
                const fadeOut = Math.min((1 - progress) * 6, 1);
                const alpha = fadeIn * fadeOut * cfg.particleAlpha;
                const hueMod = (p.hue + (angle / (Math.PI * 2)) * 70 + 360) % 360;

                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${hueMod}, ${cfg.saturation}%, ${cfg.lightness}%, ${alpha})`;
                ctx.fill();
            }

            animId = requestAnimationFrame(render);
        };

        const handleVisibilityChange = () => {
            isVisible = document.visibilityState === "visible";
        };

        const resizeObserver = new ResizeObserver(() => resize());
        resizeObserver.observe(wrapper);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        resize();
        animId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(animId);
            resizeObserver.disconnect();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [theme, density, isDarkMode]);

    const bgColor = (isDarkMode ? THEMES_DARK : THEMES_LIGHT)[theme].bg;

    return (
        <div
            ref={wrapperRef}
            className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
            aria-hidden="true"
            style={{ background: `rgb(${bgColor})` }}
        >
            <canvas className="absolute inset-0" ref={canvasRef} />
            <div
                className="absolute inset-0"
                style={{
                    background: isDarkMode
                        ? `radial-gradient(ellipse 70% 65% at 50% 45%, transparent 25%, rgba(${bgColor}, 0.88) 100%)`
                        : `radial-gradient(ellipse 70% 65% at 50% 45%, transparent 15%, rgba(${bgColor}, 0.58) 100%)`,
                }}
            />
        </div>
    );
}
