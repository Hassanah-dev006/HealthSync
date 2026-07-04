window.api = {
  async get(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
    return res.json();
  },
  async post(path, data) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
    return data;
  },
};