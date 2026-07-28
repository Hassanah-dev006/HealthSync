/** Minimal fetch wrapper for the JSON API. */
window.api = {
  async get(path) {
    const res = await fetch(path);
    if (res.status === 401) {
      if (!location.pathname.endsWith("/login.html")) location.href = "/login.html";
      throw new Error(`GET ${path} -> 401`);
    }
    if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `POST ${path} -> ${res.status}`);
    return data;
  },
};