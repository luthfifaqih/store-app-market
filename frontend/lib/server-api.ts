const localApi = "http://127.0.0.1:8000";

export async function fetchServerApi(path: string, options: RequestInit = {}, admin = false): Promise<Response> {
  const baseUrl = (admin && process.env.ADMIN_API_URL) || process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || localApi;
  const endpoint = new URL(baseUrl.replace(/\/$/, "") + "/api" + path);
  const hosts = endpoint.protocol === "http:" && endpoint.hostname === "localhost"
    ? ["127.0.0.1", "[::1]"]
    : [endpoint.hostname];

  for (const host of hosts) {
    endpoint.hostname = host;
    try {
      return await fetch(endpoint.href, { ...options, cache: options.cache ?? "no-store", redirect: "manual", signal: AbortSignal.timeout(admin ? 4000 : 12000) });
    } catch {
      // Coba keluarga alamat loopback berikutnya jika koneksinya gagal.
    }
  }
  throw new Error("Server toko tidak dapat dijangkau.");
}
