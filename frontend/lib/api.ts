const origin = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, message: string, public fields: Record<string, string[]> = {}) {
    super(message);
  }
}

export async function api<T>(path: string, method = "GET", payload?: object, admin = false, cartToken?: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cartToken) headers["X-Cart-Token"] = cartToken;
  if (admin && method !== "GET") {
    const csrf = await fetch(origin + "/sanctum/csrf-cookie", { credentials: "include" });
    if (!csrf.ok) throw new ApiError(csrf.status, "Sesi gagal disiapkan. Coba lagi.");
    const token = document.cookie.split("; ").find((part) => part.startsWith("XSRF-TOKEN="));
    if (token) headers["X-XSRF-TOKEN"] = decodeURIComponent(token.slice("XSRF-TOKEN=".length));
  }
  const form = payload instanceof FormData;
  if (payload && !form) headers["Content-Type"] = "application/json";
  const response = form ? await upload(origin + "/api" + path, method, headers, payload as FormData, admin) : await fetch(origin + "/api" + path, {
    method, headers, credentials: admin ? "include" : "omit",
    body: payload ? (form ? payload : JSON.stringify(payload)) : undefined,
    cache: "no-store",
  });

  if (response.status === 204) return undefined as T;
  const result = await response.json().catch(() => null);
  if (response.status >= 500) throw new ApiError(response.status, "Layanan toko sedang tidak tersedia. Coba lagi.");
  if (!response.ok) {
    const fields: Record<string,string[]> = {};
    if (response.status === 422 || response.status === 409) {
      for (const [key, value] of Object.entries(result?.errors ?? {})) {
        if (Array.isArray(value)) fields[key] = value.filter((entry): entry is string => typeof entry === "string").map(safeMessage);
      }
    }
    const message = response.status === 404 ? (path.includes("/orders") ? "Pesanan tidak ditemukan." : "Data tidak ditemukan.")
      : path === "/admin/login" && response.status === 401 ? "Periksa email dan kata sandi Anda."
      : [409,422].includes(response.status) ? safeMessage(result?.message) : "Permintaan gagal. Coba lagi.";
    const error = new ApiError(response.status, message, fields);
    if (admin && path !== "/admin/login" && [401,419].includes(response.status)) await sessionExpired(error);
    throw error;
  }
  return result as T;
}

export const rupiah = (amount: number) => "Rp " + new Intl.NumberFormat("id-ID").format(amount);
export const statusName = {
  pending: "Menunggu konfirmasi", dikonfirmasi: "Dikonfirmasi", diproses: "Diproses",
  dikirim: "Dikirim", selesai: "Selesai", dibatalkan: "Dibatalkan",
};
export const paymentName = { menunggu: "Menunggu pembayaran", ditinjau: "Menunggu verifikasi", terverifikasi: "Terverifikasi", ditolak: "Bukti ditolak" };

export async function downloadProof(id: number): Promise<void> {
  const result = await fetch(origin + "/api/admin/orders/" + id + "/proof", { credentials: "include", cache: "no-store" });
  if ([401,419].includes(result.status)) await sessionExpired(new ApiError(result.status, "Sesi berakhir."));
  if (!result.ok) throw new ApiError(result.status, "Bukti pembayaran gagal diunduh.");
  const blob = await result.blob();
  const extension = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" }[blob.type] ?? "bin";
  saveDownload(blob, "bukti-transfer-" + id + "." + extension);
}

export async function downloadSalesCsv(period: { from: string; to: string }): Promise<void> {
  const result = await fetch(origin + "/api/admin/reports/sales/export?" + new URLSearchParams(period), { credentials: "include", cache: "no-store", headers: { Accept: "text/csv" } });
  if ([401,419].includes(result.status)) await sessionExpired(new ApiError(result.status, "Sesi berakhir."));
  if (!result.ok) throw new ApiError(result.status, "Laporan penjualan gagal diunduh.");
  saveDownload(await result.blob(), "penjualan-" + period.from + "-" + period.to + ".csv");
}

async function upload(url: string, method: string, headers: Record<string,string>, data: FormData, admin: boolean) {
  const { alert } = await import("./alert");
  return new Promise<Response>((resolve,reject) => {
    const request = new XMLHttpRequest();
    request.open(method,url);
    request.withCredentials = admin;
    for (const [name,value] of Object.entries(headers)) request.setRequestHeader(name,value);
    request.upload.onprogress = event => {
      if (event.lengthComputable) alert.uploadProgress(Math.round(event.loaded * 100 / event.total));
    };
    request.onload = () => resolve(new Response(request.status === 204 ? null : request.responseText,{status:request.status}));
    request.onabort = request.onerror = () => reject(new ApiError(0,"Koneksi ke toko gagal."));
    request.send(data);
  });
}

function safeMessage(value: unknown) {
  return typeof value === "string" && value.length < 400 && !/SQLSTATE|Stack trace|Exception|vendor[\\/]|^The .*field|^validation\./i.test(value) ? value : "Periksa kembali nilai yang diisi.";
}

async function sessionExpired(error: ApiError) {
  if (typeof window !== "undefined") {
    const { alert } = await import("./alert");
    await alert.handleError(error);
  }
  throw error;
}

function saveDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
