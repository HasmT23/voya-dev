import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    tier: "FREE" | "PRO";
  } | null;
  isAuthenticated: boolean;
  setAuth: (tokens: {
    accessToken: string;
    refreshToken: string;
    user: AuthState["user"];
  }) => void;
  clearAuth: () => void;
  loadTokens: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,

  setAuth: async ({ accessToken, refreshToken, user }) => {
    await SecureStore.setItemAsync("voya_access_token", accessToken);
    await SecureStore.setItemAsync("voya_refresh_token", refreshToken);
    set({ accessToken, refreshToken, user, isAuthenticated: true });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync("voya_access_token");
    await SecureStore.deleteItemAsync("voya_refresh_token");
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },

  loadTokens: async () => {
    const accessToken = await SecureStore.getItemAsync("voya_access_token");
    const refreshToken = await SecureStore.getItemAsync("voya_refresh_token");
    if (accessToken && refreshToken) {
      set({ accessToken, refreshToken, isAuthenticated: true });
    }
  },
}));
