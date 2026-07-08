/**
 * ============================================
 * QZ Tray — Impresión directa (con firma digital)
 * ============================================
 * Carga qz-tray.js desde /public/qz-tray.js (archivo local)
 * Usa certificado digital + firma del servidor para eliminar
 * los diálogos de "Action Required" / "Untrusted website"
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

let qz: any = null;
let isConnected = false;
let isConnecting = false;
let selectedPrinter: string | null = null;
let loadPromise: Promise<any> | null = null;

const getApiUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    if (typeof window !== "undefined") {
        return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
            ? "http://localhost:3001" 
            : "https://inglesbackend-9p7og.ondigitalocean.app";
    }
    return "http://localhost:3001";
};

const API_URL = getApiUrl();

/** Cargar qz-tray.js desde /public (archivo local) */
function loadQzScript(): Promise<any> {
    if (qz) return Promise.resolve(qz);
    if (typeof window === "undefined") return Promise.reject("No browser");
    if ((window as any).qz) {
        qz = (window as any).qz;
        return Promise.resolve(qz);
    }
    if (loadPromise) return loadPromise;

    loadPromise = new Promise((resolve, reject) => {
        console.log("[QZ] Cargando script desde /qz-tray.js ...");
        const script = document.createElement("script");
        // Cargar desde la carpeta public/ del proyecto (local, sin CDN)
        script.src = "/qz-tray.js";
        script.async = true;

        script.onload = () => {
            qz = (window as any).qz;
            if (!qz) {
                console.error("[QZ] Script cargó pero window.qz no existe");
                reject("window.qz undefined");
                return;
            }
            console.log("[QZ] ✅ Script cargado, versión:", qz.version);

            // ============================================
            // CERTIFICADO DIGITAL — elimina "Untrusted website"
            // ============================================
            // Cargar el certificado público desde /digital-certificate.txt
            // QZ Tray internamente hace: new Promise(certHandler)
            // por lo tanto certHandler debe ser (resolve, reject) => resolve(valor)
            qz.security.setCertificatePromise(function (
                resolve: (v: string) => void,
                reject: (e: any) => void
            ) {
                fetch("/digital-certificate.txt?t=" + new Date().getTime(), { cache: "no-store", headers: {} })
                    .then(function (response) {
                        if (response.ok) {
                            return response.text();
                        }
                        throw new Error("No se pudo cargar el certificado: " + response.status);
                    })
                    .then(function (cert) {
                        console.log("[QZ] 🔐 Certificado cargado correctamente");
                        resolve(cert);
                    })
                    .catch(function (err) {
                        console.warn("[QZ] ⚠️ Error cargando certificado, usando vacío:", err);
                        alert("ALERTA POS: El navegador bloqueó la descarga del certificado de seguridad (digital-certificate.txt). Apaga los escudos de Brave o el bloqueador de anuncios. Error: " + err.message);
                        // Fallback: resolver con cadena vacía (modo sin firma)
                        resolve("");
                    });
            });

            // ============================================
            // FIRMA DIGITAL — permite "Remember this decision"
            // ============================================
            // Algoritmo SHA512 para mayor seguridad
            qz.security.setSignatureAlgorithm("SHA512");

            // signatureFactory debe retornar un resolver: (resolve, reject) => ...
            // porque QZ internamente hace: new Promise(signatureFactory(toSign))
            qz.security.setSignaturePromise(function (toSign: string) {
                return function (
                    resolve: (v: string) => void,
                    reject: (e: any) => void
                ) {
                    fetch(`${API_URL}/api/pos/qz-sign`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ request: toSign }),
                    })
                        .then(function (response) {
                            if (response.ok) {
                                return response.text();
                            }
                            throw new Error("Firma fallida: " + response.status);
                        })
                        .then(function (signature) {
                            console.log("[QZ] ✍️ Solicitud firmada correctamente");
                            resolve(signature);
                        })
                        .catch(function (err) {
                            console.warn("[QZ] ⚠️ Error firmando solicitud:", err);
                            alert("ALERTA DE SEGURIDAD POS: No se pudo conectar con el backend para firmar el ticket. \nRevisa si tu navegador (como Brave) está bloqueando la conexión, o si el servidor backend no responde. \nError: " + err.message);
                            // Fallback: resolver con cadena vacía (sin firma)
                            resolve("");
                        });
                };
            });

            resolve(qz);
        };

        script.onerror = (err) => {
            console.error("[QZ] ❌ Error cargando /qz-tray.js:", err);
            reject("Script load failed");
        };

        document.head.appendChild(script);
    });

    return loadPromise;
}

/** Conectar a QZ Tray */
export async function connectQz(): Promise<boolean> {
    if (isConnected && qz?.websocket?.isActive()) return true;
    if (isConnecting) {
        await new Promise(r => setTimeout(r, 3000));
        return isConnected;
    }

    isConnecting = true;

    try {
        await loadQzScript();
        if (!qz) {
            console.warn("[QZ] Librería no cargada");
            isConnecting = false;
            return false;
        }

        if (qz.websocket.isActive()) {
            console.log("[QZ] Ya estaba conectado");
            isConnected = true;
            isConnecting = false;
            return true;
        }

        // Intentar conexión segura (wss) primero
        console.log("[QZ] Intentando conexión wss:// (segura)...");
        try {
            await qz.websocket.connect({ retries: 1, delay: 0 });
            isConnected = true;
            isConnecting = false;
            console.log("[QZ] ✅ Conectado via wss:// (seguro)!");
            return true;
        } catch (wssErr) {
            console.warn("[QZ] wss:// falló:", wssErr, "→ intentando ws:// ...");
        }

        // Fallback: conexión insegura (ws)
        try {
            await qz.websocket.connect({
                usingSecure: false,
                retries: 1,
                delay: 0,
            });
            isConnected = true;
            isConnecting = false;
            console.log("[QZ] ✅ Conectado via ws:// (inseguro)!");
            return true;
        } catch (wsErr) {
            console.warn("[QZ] ws:// también falló:", wsErr);
        }

        isConnecting = false;
        return false;
    } catch (err) {
        console.warn("[QZ] ❌ Conexión fallida:", err);
        isConnected = false;
        isConnecting = false;
        return false;
    }
}

/** Desconectar */
export async function disconnectQz(): Promise<void> {
    if (!qz || !isConnected) return;
    try { await qz.websocket.disconnect(); } catch {}
    isConnected = false;
    selectedPrinter = null;
}

/** Lista de impresoras */
export async function getAvailablePrinters(): Promise<string[]> {
    if (!isConnected || !qz) return [];
    try {
        const printers = await qz.printers.find();
        console.log("[QZ] Impresoras encontradas:", printers);
        return Array.isArray(printers) ? printers : [printers];
    } catch (err) {
        console.error("[QZ] Error impresoras:", err);
        return [];
    }
}

/** Buscar impresora */
export async function findPrinter(name: string): Promise<string | null> {
    if (!isConnected || !qz) return null;
    try { return (await qz.printers.find(name)) || null; } catch { return null; }
}

/** Establecer impresora activa */
export function setActivePrinter(printerName: string) {
    selectedPrinter = printerName;
    if (typeof window !== "undefined") localStorage.setItem("qz_printer", printerName);
}

/** Obtener impresora activa */
export function getActivePrinter(): string | null {
    if (selectedPrinter) return selectedPrinter;
    if (typeof window !== "undefined") {
        const saved = localStorage.getItem("qz_printer");
        if (saved) { selectedPrinter = saved; return saved; }
    }
    return null;
}

/** ¿Conectado? */
export function isQzConnected(): boolean {
    return isConnected && !!qz?.websocket?.isActive();
}

/** Imprimir HTML via QZ Tray o fallback */
export async function printHtml(html: string): Promise<boolean> {
    const connected = await connectQz();

    if (connected && qz) {
        const printer = getActivePrinter();
        if (!printer) {
            console.warn("[QZ] Sin impresora seleccionada → fallback");
            printFallback(html);
            return false;
        }

        try {
            const config = qz.configs.create(printer, {
                size: { width: 80, height: null },
                units: "mm",
                margins: { top: 0, right: 0, bottom: 0, left: 0 },
                colorType: "blackwhite",
                scaleContent: true,
            });

            await qz.print(config, [{
                type: "pixel",
                format: "html",
                flavor: "plain",
                data: html,
            }]);

            console.log("[QZ] ✅ Impreso directamente sin diálogo!");
            return true;
        } catch (err) {
            console.error("[QZ] ❌ Error impresión:", err);
            printFallback(html);
            return false;
        }
    }

    printFallback(html);
    return false;
}

/** Fallback: iframe oculto (con diálogo del SO) */
function printFallback(html: string) {
    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, {
        position: "fixed", right: "0", bottom: "0",
        width: "0", height: "0", border: "none", visibility: "hidden",
    });
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
        doc.open(); doc.write(html); doc.close();
        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 2000);
        }, 500);
    }
}
