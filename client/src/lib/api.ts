export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

// Auth header without Content-Type (for FormData/file uploads)
export function authToken(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(url: string, options: RequestInit = {}) {
  const headers = { ...authHeaders(), ...options.headers };
  const res = await fetch(url, { ...options, headers });
  return res;
}
