import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Keyboard, Camera } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface Props {
    /** Se llama cuando se detecta un código */
    onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ onScan }: Props) {
    const [manualInput, setManualInput] = useState("");
    const [showManual, setShowManual] = useState(false);

    // Estado para la cámara web
    const [useCamera, setUseCamera] = useState(false);
    // Guardamos la instancia headless de Html5Qrcode
    const html5QrcodeRef = useRef<any | null>(null);
    // Flag para evitar que onScan se llame más de una vez por sesión
    const hasScannedRef = useRef(false);

    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [flash, setFlash] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // ── Lógica de escáner HID (USB/Bluetooth) ──────────────────────
    useEffect(() => {
        if (useCamera) return; // Si la cámara está activa, ignoramos HID para no chocar

        let buffer = "";
        let lastTime = 0;
        const SCANNER_THRESHOLD_MS = 30;

        const handleKey = (e: KeyboardEvent) => {
            if (
                document.activeElement?.tagName === "INPUT" ||
                document.activeElement?.tagName === "TEXTAREA"
            ) return;

            const now = Date.now();
            const delta = now - lastTime;
            lastTime = now;

            if (e.key === "Enter" && buffer.length >= 4) {
                (window as any).__lastScanTime = Date.now();
                const code = buffer.trim();
                buffer = "";
                triggerScan(code);
                return;
            }

            if (delta < SCANNER_THRESHOLD_MS || buffer.length === 0) {
                if (e.key.length === 1) buffer += e.key;
            } else {
                buffer = e.key.length === 1 ? e.key : "";
            }
        };

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [useCamera]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Lógica de Cámara Web (html5-qrcode Headless) ────────────────────────
    useEffect(() => {
        if (useCamera) {
            hasScannedRef.current = false; // Reset al abrir la cámara

            // Delay para asegurar que el DOM esté montado
            const timer = setTimeout(async () => {
                try {
                    const { Html5Qrcode } = await import("html5-qrcode");

                    if (!useCamera) return;

                    const scanner = new Html5Qrcode("html5qr-code-reader");
                    html5QrcodeRef.current = scanner;

                    // 1. Obtener cámaras disponibles
                    const cameras = await Html5Qrcode.getCameras();

                    if (!cameras || cameras.length === 0) {
                        throw new Error("No se encontraron cámaras en este dispositivo.");
                    }

                    // 2. Intentar priorizar la trasera (Móvil) o la primera disponible (PC)
                    const backCamera = cameras.find(c => c.label.toLowerCase().includes("back") || c.label.toLowerCase().includes("trasera"));
                    const cameraId = backCamera ? backCamera.id : cameras[0].id;

                    await scanner.start(
                        cameraId,
                        {
                            fps: 22, // Balance ideal entre fluidez y rendimiento
                            disableFlip: true, // Ahorra CPU al no invertir la imagen
                            qrbox: (viewfinderWidth, viewfinderHeight) => {
                                const width = Math.min(viewfinderWidth * 0.8, 450);
                                const height = Math.min(viewfinderHeight * 0.5, 250);
                                return { width, height };
                            },
                        },
                        (decodedText: string) => {
                            if (hasScannedRef.current) return;
                            hasScannedRef.current = true;
                            triggerScan(decodedText);
                            cleanupCamera();
                        },
                        undefined
                    );
                } catch (e: any) {
                    console.error("Error al arrancar la cámara:", e);
                    alert(
                        "Error de cámara: " + (e.message || "No se pudo acceder a la cámara. Asegúrate de dar permisos en tu navegador.")
                    );
                    cleanupCamera();
                }
            }, 400);

            return () => clearTimeout(timer);
        } else {
            cleanupCamera();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [useCamera]);

    const cleanupCamera = () => {
        const scanner = html5QrcodeRef.current;
        if (scanner) {
            try {
                if (scanner.isScanning) {
                    scanner
                        .stop()
                        .then(() => scanner.clear())
                        .catch(console.warn);
                } else {
                    scanner.clear();
                }
            } catch (_) { }
            html5QrcodeRef.current = null;
        }
        setUseCamera(false);
    };

    const triggerScan = (code: string) => {
        setLastScanned(code);
        setFlash(true);
        setTimeout(() => setFlash(false), 600);
        onScan(code);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const code = manualInput.trim();
        if (code) {
            triggerScan(code);
            setManualInput("");
        }
    };

    return (
        <div className="flex items-center gap-2">
            <div
                className="flex bg-[var(--surface-alt)] rounded-xl overflow-hidden border"
                style={{ borderColor: "var(--border-color)" }}
            >
                {/* Entrada manual */}
                <button
                    type="button"
                    onClick={() => {
                        setShowManual((p) => !p);
                        setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    title="Ingresar código manualmente"
                    className="p-2 transition-all hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/40"
                    style={{ color: "var(--text-secondary)" }}
                >
                    <Keyboard className="w-4 h-4" />
                </button>

                {/* Botón de Cámara */}
                <button
                    type="button"
                    onClick={() => setUseCamera(true)}
                    title="Escanear con cámara Web/Laptop"
                    className="p-2 transition-all border-l hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/40"
                    style={{
                        borderColor: "var(--border-color)",
                        color: "var(--text-secondary)",
                    }}
                >
                    <Camera className="w-4 h-4" />
                </button>
            </div>

            {/* Input manual (slide-in) */}
            {showManual && (
                <form onSubmit={handleManualSubmit} className="flex items-center gap-1">
                    <input
                        ref={inputRef}
                        type="text"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="Escribe el código..."
                        className="w-36 px-3 py-2 text-sm rounded-xl border-2 border-blue-400 focus:outline-none focus:border-blue-600"
                        style={{ background: "var(--surface)", color: "var(--text-primary)" }}
                    />
                    <button
                        type="button"
                        onClick={() => setShowManual(false)}
                        className="px-2 py-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </form>
            )}

            {/* Modal de Cámara Web — Portal para garantizar z-index superior */}
            {useCamera && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop con desenfoque profundo */}
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-lg animate-in fade-in duration-300" onClick={cleanupCamera} />

                    {/* Contenedor del Modal */}
                    <div className="relative w-full max-w-3xl aspect-square md:aspect-video bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(37,99,235,0.4)] border border-white/10 flex flex-col animate-in zoom-in duration-300">

                        {/* Barra Superior de Control */}
                        <div className="absolute top-0 inset-x-0 z-[10000] p-6 flex items-center justify-between pointer-events-none">
                            <div className="flex items-center gap-4 bg-black/40 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-white/10 pointer-events-auto">
                                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-white text-sm leading-none">Cámara de Escaneo</h3>
                                    <span className="text-[9px] text-blue-300 uppercase font-black tracking-widest mt-1">Lector de código activo</span>
                                </div>
                            </div>

                            <button
                                onClick={cleanupCamera}
                                className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-white transition-all duration-300 active:scale-90 border border-red-500/20 pointer-events-auto"
                            >
                                <X className="w-7 h-7" />
                            </button>
                        </div>

                        {/* Área de Video Principal */}
                        <div className="flex-1 bg-black relative flex items-center justify-center">
                            {/* Guía de Enfoque (Overlay) */}
                            <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center px-10">
                                <div className="w-full max-w-[500px] aspect-[2/1] border-2 border-dashed border-blue-500/50 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] relative overflow-hidden">
                                    {/* Línea Laser animada */}
                                    <div className="absolute inset-x-0 h-1 bg-blue-500 shadow-[0_0_20px_#3b82f6] animate-[scanner_2.5s_infinite]" />
                                </div>
                            </div>

                            <style jsx>{`
                                @keyframes scanner {
                                    0% { top: 5%; opacity: 0; }
                                    10% { opacity: 1; }
                                    90% { opacity: 1; }
                                    100% { top: 95%; opacity: 0; }
                                }
                            `}</style>

                            {/* Cámara — Usamos object-cover para llenar el espacio */}
                            <div id="html5qr-code-reader" className="w-full h-full [&>video]:object-cover" />
                        </div>

                        {/* Tip / Ayuda al fondo */}
                        <div className="absolute bottom-10 inset-x-0 z-30 flex justify-center px-6 pointer-events-none">
                            <div className="bg-blue-600/20 backdrop-blur-2xl px-6 py-3 rounded-2xl border border-blue-500/30 flex items-center gap-3">
                                <Camera className="w-4 h-4 text-blue-400" />
                                <p className="text-[11px] text-blue-100 font-bold uppercase tracking-wide">
                                    Coloca el código dentro del recuadro para detectar
                                </p>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
