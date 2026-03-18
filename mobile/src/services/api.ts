import { useAuthStore } from "../store/auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

async function request(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const { accessToken } = useAuthStore.getState();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // Auto-refresh on 401
  if (res.status === 401 && accessToken) {
    const refreshed = await refreshToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`;
      return fetch(`${API_URL}${path}`, { ...options, headers });
    }
    useAuthStore.getState().clearAuth();
  }

  return res;
}

async function refreshToken(): Promise<boolean> {
  const { refreshToken: token } = useAuthStore.getState();
  if (!token) return false;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    useAuthStore.setState({ accessToken: data.accessToken });
    return true;
  } catch {
    return false;
  }
}

export const api = {
  login: (idToken: string) =>
    request("/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    }),

  getUsage: () => request("/usage"),

  checkLimit: () => request("/usage/check"),

  createCheckout: () =>
    request("/billing/checkout", { method: "POST" }),

  initiatePairing: (deviceName: string, deviceType: string) =>
    request("/devices/pair/initiate", {
      method: "POST",
      body: JSON.stringify({ deviceName, deviceType }),
    }),

  confirmPairing: (code: string) =>
    request("/devices/pair/confirm", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  listDevices: () => request("/devices"),

  removeDevice: (deviceId: string) =>
    request(`/devices/${deviceId}`, { method: "DELETE" }),
};
