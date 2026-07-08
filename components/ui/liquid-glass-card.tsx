"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const GLASS_SHADOW_LIGHT =
    "shadow-[0_8px_22px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.92),inset_0_-1px_0_rgba(148,163,184,0.18)]";

const GLASS_SHADOW_DARK =
    "dark:shadow-[0_0_8px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.09),inset_-3px_-3px_0.5px_-3.5px_rgba(255,255,255,0.85),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.6),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.6),inset_0_0_6px_6px_rgba(255,255,255,0.12),inset_0_0_2px_2px_rgba(255,255,255,0.06),0_0_12px_rgba(0,0,0,0.15)]";

const GLASS_SHADOW = `${GLASS_SHADOW_LIGHT} ${GLASS_SHADOW_DARK}`;

interface GlassFilterProps {
    id: string;
    scale?: number;
}

function GlassFilter({ id, scale = 30 }: GlassFilterProps) {
    return (
        <svg className="hidden" aria-hidden="true">
            <defs>
                <filter
                    id={id}
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                    colorInterpolationFilters="sRGB"
                >
                    <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="1" seed="1" result="turbulence" />
                    <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="blurredNoise"
                        scale={scale}
                        xChannelSelector="R"
                        yChannelSelector="B"
                        result="displaced"
                    />
                    <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
                    <feComposite in="finalBlur" in2="finalBlur" operator="over" />
                </filter>
            </defs>
        </svg>
    );
}

export interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    glassEffect?: boolean;
}

export function LiquidGlassCard({ className, glassEffect = true, children, ...props }: LiquidGlassCardProps) {
    const filterId = React.useId();

    return (
        <Card
            className={cn(
                "group relative overflow-hidden rounded-[2rem] border border-white/55 bg-white/82 p-6 backdrop-blur-[6px] transition-all duration-300",
                "dark:border-white/10 dark:bg-white/[0.04]",
                className
            )}
            {...props}
        >
            <div className={cn("pointer-events-none absolute inset-0 rounded-[2rem]", GLASS_SHADOW)} />

            {glassEffect && (
                <>
                    <div
                        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[2rem]"
                        style={{ backdropFilter: `url(\"#${filterId}\")` }}
                    />
                    <GlassFilter id={filterId} scale={30} />
                </>
            )}

            <div className="relative z-10">{children}</div>

            <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-r from-transparent via-black/3 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:via-white/5" />
        </Card>
    );
}

export default LiquidGlassCard;
