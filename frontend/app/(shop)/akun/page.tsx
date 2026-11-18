import {redirect} from "next/navigation";
import {customerAccount} from "@/lib/customer-account";
export const metadata={title:"Akun pelanggan",robots:{index:false}};
export default function Account(){if(!customerAccount)redirect("/");return <section className="shop-container page"><h1>Akun pelanggan</h1><div className="customer-account"><article><h2>Masuk</h2><p>Lanjutkan dengan akun pelanggan Anda.</p><a className="store-cta" href={customerAccount.login}>Masuk ke akun</a></article><article><h2>Daftar</h2><p>Buat akun melalui layanan pelanggan toko.</p><a className="store-cta" href={customerAccount.signup}>Daftar akun</a></article></div></section>}
