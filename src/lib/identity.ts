const IDENTITY_KEY = "mulliganCup.playerId";

export function getStoredPlayerId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(IDENTITY_KEY);
}

export function setStoredPlayerId(playerId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(IDENTITY_KEY, playerId);
}

export function clearStoredPlayerId(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(IDENTITY_KEY);
}
