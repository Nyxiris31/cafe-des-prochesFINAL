// Session boundary: Identity owns the browser session; the frontend clears cached data
// so one account's data never renders for the next.
import { queryClient } from "./queryClient";
import { logout } from "@netlify/identity";

let sessionStarted = false;

export function hasSessionMarker(): boolean {
  return sessionStarted;
}

export function markSession(): void {
  sessionStarted = true;
}

export function clearSessionMarker(): void {
  sessionStarted = false;
}

// Call after every successful login/signup when a caller needs to clear stale queries.
export function beginSession(): void {
  queryClient.clear();
}

// Call from every sign-out control; the hard redirect resets all in-memory state.
export async function endSession(redirectTo: string = "/login"): Promise<void> {
  try {
    await logout();
  } finally {
    clearSessionMarker();
    queryClient.clear();
    window.location.assign(redirectTo);
  }
}
