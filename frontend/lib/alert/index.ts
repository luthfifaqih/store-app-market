"use client";

import Swal, { type SweetAlertOptions } from "sweetalert2";
import { confirmed, createRunner, type LoadingOptions, type Notice } from "./core";

const shown = new WeakSet<object>();
let busy = false;
let sessionWarning: Promise<void> | undefined;

async function fire(options: SweetAlertOptions, danger = false) {
  const target = (!options.toast && document.querySelector<HTMLElement>(".admin-dialog")) || document.body;
  let disposed!: () => void;
  const cleanup = new Promise<void>(resolve => { disposed = resolve; });
  const result = await Swal.fire({
    target, heightAuto: false, scrollbarPadding: false, buttonsStyling: false,
    keydownListenerCapture: true, confirmButtonText: "Tutup", cancelButtonText: "Batal",
    customClass: { container: "store-alert-layer", popup: "store-alert", confirmButton: danger ? "store-alert-danger" : "store-alert-primary", cancelButton: "store-alert-cancel" },
    ...options,
    didDestroy: disposed,
  });
  await cleanup;
  return result;
}
function message(icon: Notice, title: string, text?: string) {
  return fire({ icon, titleText: title, text });
}

type Problem = { status?: number; fields?: Record<string, string[]>; message?: string };
const labels: Record<string,string> = { customer_name: "Nama penerima", phone: "Nomor HP", name: "Nama", password: "Kata sandi", email: "Email", address: "Alamat", quantity: "Jumlah", shipping_zone_id: "Zona pengiriman", code: "Kode pesanan", unit: "Satuan", price: "Harga", image: "Foto", proof: "Bukti transfer", note: "Catatan", delta: "Penyesuaian", category_id: "Kategori", minimum: "Minimum belanja", fee: "Ongkir", title: "Judul" };
export function validationLines(errors: unknown, path = ""): [string,string][] {
  if (typeof errors === "string") return [[path, errors]];
  if (!errors || typeof errors !== "object") return [];
  if ("issues" in errors && Array.isArray(errors.issues)) return errors.issues.flatMap(i => validationLines(i.message, i.path.join(".")));
  if ("message" in errors && typeof errors.message === "string") return [[path, errors.message]];
  if (Array.isArray(errors)) return errors.flatMap((value, i) => validationLines(value, typeof value === "string" ? path : [path,i].join(".")));
  return Object.entries(errors).filter(([key]) => !["ref","type","types"].includes(key)).flatMap(([key,value]) => validationLines(value, path ? path + "." + key : key));
}
async function validation(errors: unknown, title = "Periksa kembali isian Anda") {
  const lines = validationLines(errors);
  await fire({ icon:title === "Login gagal" ? "error" : "warning", titleText:title, returnFocus:false, text:lines.map(([key,value]) => (labels[key] ?? key.replaceAll("_"," ")) + " — " + value).join("\n") || "Lengkapi isian yang diperlukan." });
}
async function handleError(error: unknown, options: Partial<LoadingOptions> = {}) {
  const p = (error ?? {}) as Problem;
  if (typeof error === "object" && error !== null) {
    if (shown.has(error)) return false;
    shown.add(error);
  }
  if (p.status === 422) {
    const focus = options.onInvalid?.(p.fields ?? {});
    await validation(Object.keys(p.fields ?? {}).length ? p.fields : { Formulir: p.message }, options.errorTitle);
    if (typeof focus === "function") focus();
  } else if ((p.status === 401 || p.status === 419) && location.pathname.startsWith("/admin") && location.pathname !== "/admin/login") {
    sessionWarning ??= message("warning","Sesi berakhir, silakan login lagi").then(() => location.replace("/admin/login"));
    await sessionWarning;
  } else if (p.status === 403) await message("error","Anda tidak memiliki akses");
  else if (p.status === 409) await message("warning","Periksa ketersediaan barang",Object.values(p.fields ?? {}).flat().join("\n") || p.message);
  else if (p.status === 429) await message("warning","Terlalu banyak percobaan, coba lagi beberapa saat");
  else if (p.status === 404 || p.status === 401) await message("error", options.errorTitle ?? "Permintaan gagal", p.message);
  else {
    const network = !p.status || p.status >= 500;
    const result = await fire({ icon:"error", titleText: options.errorTitle ?? "Permintaan gagal", text: network ? "Terjadi kesalahan pada server/koneksi." : "Permintaan tidak dapat diproses.", showCancelButton: !!options.safeRetry && network, confirmButtonText: options.safeRetry && network ? "Coba lagi" : "Tutup" });
    return !!options.safeRetry && network && result.isConfirmed;
  }
  return false;
}
function loading(title = "Memproses...", text?: string) {
  busy = true;
  void fire({ titleText: title, text, allowOutsideClick:false, allowEscapeKey:false, showConfirmButton:false, didOpen: () => Swal.showLoading() });
}
function close() { busy = false; Swal.close(); }
function toast(icon: Notice,title: string, action?: {label: string; run: () => void; afterTimer?:()=>void}) {
  if (busy || (Swal.isVisible() && !Swal.getPopup()?.classList.contains("swal2-toast") && !Swal.getPopup()?.classList.contains("swal2-hide"))) return;
  void fire({ toast:true, position: matchMedia("(max-width: 640px)").matches ? "top" : "top-end", icon, titleText:title, timer:2500, timerProgressBar:true,
    showConfirmButton:!!action, confirmButtonText:action?.label, didOpen: popup => {
      popup.onmouseenter = () => Swal.stopTimer();
      popup.onmouseleave = () => Swal.resumeTimer();
    },
  }).then(result => { if (result.isConfirmed) action?.run(); else if(result.dismiss==="timer") action?.afterTimer?.(); });
}
const run = createRunner({ loading, close, success: title => fire({titleText:title, icon:"success", timer:1600}), toast: title => toast("success",title), failure:handleError });
let tail: Promise<unknown> = Promise.resolve();
function withLoading<T>(fn: () => Promise<T>, options: LoadingOptions) {
  const next = tail.then(() => run(fn, options));
  tail = next.catch(() => undefined);
  return next;
}

export const alert = {
  success: (title: string,text?:string) => message("success",title,text),
  error: (title: string,text?:string) => message("error",title,text),
  warning: (title: string,text?:string) => message("warning",title,text),
  info: (title: string,text?:string) => message("info",title,text),
  toast, validation, loading, close, withLoading, handleError,
  photo(title:string,url:string) {return fire({titleText:title,imageUrl:url,imageAlt:title,confirmButtonText:"Tutup"});},
  panel(title: string, variant: string, mount: (element: HTMLElement) => void) {
    const content = document.createElement("div");
    return fire({titleText:title, html:content, showConfirmButton:false, showCloseButton:true, closeButtonAriaLabel:"Tutup panel", customClass:{container:"store-alert-layer shop-panel-layer",popup:"store-alert shop-panel shop-panel-" + variant}, didOpen:()=>mount(content)});
  },
  uploadProgress(percent: number) { if (busy && Swal.isLoading()) Swal.update({text:"Mengunggah… " + percent + "%"}); },
  async confirm({title,text,confirmText = "Ya, lanjutkan",cancelText = "Batal",danger = false}: {title:string;text?:string;confirmText?:string;cancelText?:string;danger?:boolean}) {
    return confirmed(await fire({titleText:title,text,icon:danger ? "warning":"question",showCancelButton:true,confirmButtonText:confirmText,cancelButtonText:cancelText,focusCancel:danger},danger));
  },
  async confirmWithInput({title,label,placeholder,required}: {title:string;label:string;placeholder?:string;required:boolean}) {
    const result = await fire({titleText:title,input:"textarea",inputLabel:label,inputPlaceholder:placeholder,icon:"warning",showCancelButton:true,focusCancel:true,confirmButtonText:"Ya, lanjutkan",inputValidator: value => required && !value.trim() ? "Isi alasan untuk melanjutkan." : null},true);
    return result.isConfirmed ? String(result.value ?? "").trim() : null;
  },
};
