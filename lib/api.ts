// ============================================
// API CLIENT - Conexión con el Backend
// ============================================

const API_URL = process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== 'undefined' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
        ? 'https://prac-server-z2md.onrender.com'
        : 'http://127.0.0.1:3001');

// ============================================
// TIPOS
// ============================================

export interface Student {
    id: string;
    studentNumber: string;
    name: string;
    email: string;
    studentPhone?: string;
    emergencyPhone?: string;
    level: "Beginner 1" | "Beginner 2" | "Intermediate 1" | "Intermediate 2" | "Advanced 1" | "Advanced 2";
    monthlyFee: number;
    status: "active" | "inactive" | "baja";
    teacherId?: string;
    createdAt?: string;
    lastAccess?: string;
    paymentScheme?: "daily" | "weekly" | "biweekly" | "monthly_28";
    classDays?: number[];
    enrollmentDate?: string;
    enrollmentVersion?: number;
    dropoutDate?: string;
    dropoutReason?: string;
}

export interface Admin {
    id: string;
    name: string;
    email: string;
    role: "admin" | "superadmin";
    status: "active" | "inactive";
    createdAt: string;
}

export interface Teacher {
    id: string;
    name: string;
    email: string;
    status: "active" | "inactive";
    schedule?: any[];
    createdAt: string;
}


export interface LoginResponse {
    success: boolean;
    user: {
        id: string;
        name: string;
        email: string;
        role: "admin" | "superadmin" | "teacher";
    };
    token: string;
}

export interface ApiError {
    error: string;
}

export interface StudentsPageResponse {
    items: Student[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function handleResponse<T>(response: Response): Promise<T> {
    const rawText = await response.text();
    const contentType = response.headers.get("content-type") || "";

    let data: unknown = null;
    if (rawText.trim().length > 0) {
        if (contentType.includes("application/json")) {
            try {
                data = JSON.parse(rawText);
            } catch {
                if (!response.ok) {
                    throw new Error("Respuesta JSON inválida del servidor");
                }
            }
        } else {
            data = rawText;
        }
    }

    if (!response.ok) {
        if (data && typeof data === "object" && "error" in data) {
            throw new Error((data as { error?: string }).error || "Error en la petición");
        }

        if (typeof data === "string" && data.trim()) {
            throw new Error(data);
        }

        throw new Error(`Error en la petición (${response.status})`);
    }

    return (data as T) ?? ({} as T);
}

function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
    };
}

// ============================================
// AUTH API
// ============================================

export const authApi = {
    async login(email: string, password: string): Promise<LoginResponse> {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        return handleResponse<LoginResponse>(response);
    },

    logout(): void {
        localStorage.removeItem("token");
        localStorage.removeItem("userType");
        localStorage.removeItem("userName");
    },

    isAuthenticated(): boolean {
        return !!localStorage.getItem("token");
    },

    getUserType(): string | null {
        return localStorage.getItem("userType");
    },

    getUserName(): string | null {
        return localStorage.getItem("userName");
    },
};

// ============================================
// STUDENTS API
// ============================================

export const studentsApi = {
    async getAll(params?: {
        studentNumber?: string;
        teacherId?: string;
        assignableForTeacherId?: string;
        search?: string;
    }): Promise<Student[]> {
        const searchParams = new URLSearchParams();
        if (params?.studentNumber) searchParams.set("studentNumber", params.studentNumber);
        if (params?.teacherId) searchParams.set("teacherId", params.teacherId);
        if (params?.assignableForTeacherId) searchParams.set("assignableForTeacherId", params.assignableForTeacherId);
        if (params?.search) searchParams.set("search", params.search);

        const query = searchParams.toString();
        const response = await fetch(`${API_URL}/api/students${query ? `?${query}` : ""}`, {
            headers: getAuthHeaders(),
        });

        return handleResponse<Student[]>(response);
    },

    async getPage(params: {
        page: number;
        limit?: number;
        search?: string;
        teacherId?: string;
        assignableForTeacherId?: string;
    }): Promise<StudentsPageResponse> {
        const searchParams = new URLSearchParams();
        searchParams.set("page", String(params.page));
        searchParams.set("limit", String(params.limit ?? 10));
        if (params.search) searchParams.set("search", params.search);
        if (params.teacherId) searchParams.set("teacherId", params.teacherId);
        if (params.assignableForTeacherId) searchParams.set("assignableForTeacherId", params.assignableForTeacherId);

        const response = await fetch(`${API_URL}/api/students?${searchParams.toString()}`, {
            headers: getAuthHeaders(),
        });

        return handleResponse<StudentsPageResponse>(response);
    },

    async getById(id: string): Promise<Student> {
        const response = await fetch(`${API_URL}/api/students/${id}`, {
            headers: getAuthHeaders(),
        });

        return handleResponse<Student>(response);
    },

    async create(data: {
        name: string;
        email: string;
        level: "Beginner 1" | "Beginner 2" | "Intermediate 1" | "Intermediate 2" | "Advanced 1" | "Advanced 2";
        monthlyFee?: number;
        studentPhone?: string;
        emergencyPhone?: string;
        paymentScheme?: "daily" | "weekly" | "biweekly" | "monthly_28";
        classDays?: number[];
        enrollmentDate?: string;
    }): Promise<Student> {
        const response = await fetch(`${API_URL}/api/students`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });

        return handleResponse<Student>(response);
    },

    async update(id: string, data: Partial<Student>): Promise<Student> {
        const response = await fetch(`${API_URL}/api/students/${id}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });

        return handleResponse<Student>(response);
    },

    async delete(id: string): Promise<{ success: boolean }> {
        const response = await fetch(`${API_URL}/api/students/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
        });

        return handleResponse<{ success: boolean }>(response);
    },

    async toggleStatus(id: string, currentStatus: string): Promise<Student> {
        const newStatus = currentStatus === "active" ? "inactive" : "active";
        return this.update(id, { status: newStatus as "active" | "inactive" });
    },

    async assignTeacher(studentId: string, teacherId: string | null): Promise<Student> {
        return this.update(studentId, { teacherId: teacherId || null } as any);
    },
};

// ============================================
// ADMINS API
// ============================================

export const adminsApi = {
    async getAll(): Promise<Admin[]> {
        const response = await fetch(`${API_URL}/api/admins`, {
            headers: getAuthHeaders(),
        });

        return handleResponse<Admin[]>(response);
    },

    async create(data: {
        name: string;
        email: string;
        password: string;
        role?: "admin" | "superadmin";
    }): Promise<Admin> {
        const response = await fetch(`${API_URL}/api/admins`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });

        return handleResponse<Admin>(response);
    },

    async update(id: string, data: Partial<Admin>): Promise<Admin> {
        const response = await fetch(`${API_URL}/api/admins/${id}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });

        return handleResponse<Admin>(response);
    },

    async delete(id: string): Promise<{ success: boolean }> {
        const response = await fetch(`${API_URL}/api/admins/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
        });

        return handleResponse<{ success: boolean }>(response);
    }
};

// ============================================
// TEACHERS API
// ============================================

export const teachersApi = {
    async getAll(): Promise<Teacher[]> {
        const response = await fetch(`${API_URL}/api/teachers`, {
            headers: getAuthHeaders(),
        });
        return handleResponse<Teacher[]>(response);
    },

    async getById(id: string): Promise<Teacher> {
        const response = await fetch(`${API_URL}/api/teachers/${id}`, {
            headers: getAuthHeaders(),
        });
        return handleResponse<Teacher>(response);
    },

    async create(data: { name: string; email: string; password?: string }): Promise<Teacher> {
        const response = await fetch(`${API_URL}/api/teachers`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse<Teacher>(response);
    },

    async update(id: string, data: Partial<Teacher>): Promise<Teacher> {
        const response = await fetch(`${API_URL}/api/teachers/${id}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse<Teacher>(response);
    },

    async delete(id: string): Promise<{ success: boolean }> {
        const response = await fetch(`${API_URL}/api/teachers/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
        });
        return handleResponse<{ success: boolean }>(response);
    },

    async toggleStatus(id: string, currentStatus: string): Promise<Teacher> {
        const newStatus = currentStatus === "active" ? "inactive" : "active";
        return this.update(id, { status: newStatus as "active" | "inactive" });
    },

    async updateSchedule(id: string, schedule: any[]): Promise<Teacher> {
        return this.update(id, { schedule });
    }
};

// ============================================
// AI API (Asistente)
// ============================================
export const aiApi = {
    sendMessageStream: async (
        message: string,
        historyContext: { role: "user" | "assistant", content: string }[] = [],
        teacherId?: string,
        onChunk?: (text: string) => void
    ): Promise<string> => {
        const response = await fetch(`${API_URL}/api/ai/chat`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ message, historyContext, teacherId }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Error respondiendo mensaje");
        }

        // Leer el stream SSE
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No se pudo iniciar el stream");

        const decoder = new TextDecoder();
        let fullReply = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            // Cada línea SSE es "data: {...}\n\n"
            const lines = text.split("\n").filter(l => l.startsWith("data: "));

            for (const line of lines) {
                const payload = line.replace("data: ", "");
                if (payload === "[DONE]") break;

                try {
                    const parsed = JSON.parse(payload);
                    if (parsed.text) {
                        fullReply += parsed.text;
                        onChunk?.(parsed.text);
                    }
                    if (parsed.error) {
                        throw new Error(parsed.error);
                    }
                } catch (e) {
                    // Ignorar líneas malformadas
                    if (e instanceof Error && e.message !== "Error durante la generación.") continue;
                    throw e;
                }
            }
        }

        return fullReply;
    },

    getHistory: async (teacherId: string, limit: number = 50) => {
        const response = await fetch(`${API_URL}/api/ai/chat?teacherId=${teacherId}&limit=${limit}`, {
            headers: getAuthHeaders(),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Error cargando historial");
        return data as { messages: { role: "user" | "assistant"; content: string; created_at: string }[] };
    }
};

