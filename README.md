# Pasar Sembako

Toko sembako berbahasa Indonesia dengan frontend Next.js di `frontend`, REST API Laravel 13 dan Sanctum di `backend`, serta MySQL 8.4. Pelanggan bisa memesan tanpa akun. Area staf tersedia di `/admin`.

## Setup lokal

Siapkan PHP 8.3–8.5, Composer 2, MySQL 8 dengan InnoDB, dan Node.js 20.9 atau lebih baru. PHP memerlukan ekstensi Laravel standar, `bcmath`, `fileinfo`, dan `pdo_mysql`. Tambahkan `pdo_sqlite` untuk tes SQLite, serta `gd` untuk tes unggah gambar.

Buat database kosong `pasar_sembako`, lalu jalankan dari root proyek.

```powershell
cd backend
composer install
Copy-Item .env.example .env
php artisan key:generate
```

Sesuaikan koneksi `DB_*` di `backend/.env`. Akun admin memakai email `admin@pasarsembako.test` secara default. Isi `SEED_ADMIN_PASSWORD` dengan kata sandi pilihan Anda. Seeder mempertahankan akun yang sudah ada.

```powershell
php artisan migrate
php artisan db:seed --class=AdminSeeder
php artisan storage:link
php artisan serve --host=localhost --port=8000
```

Untuk data demo, jalankan `php artisan db:seed`. Pada database kosong, seeder menambahkan 8 kategori, 40 produk, satuan dan harga grosir, zona contoh, serta banner. Pada database lama, jalankan `php artisan migrate` untuk menerapkan migrasi tertunda dengan data yang ada.

Buka terminal kedua di root proyek.

```powershell
cd frontend
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Buka [toko](http://localhost:3000) atau [login admin](http://localhost:3000/admin/login). Pakai `localhost` pada URL browser untuk kedua aplikasi agar cookie Sanctum dan CSRF cocok. `API_INTERNAL_URL` mengatur koneksi server Next.js, sehingga koneksi itu bisa memakai `127.0.0.1` secara terpisah. Pengguna macOS atau Linux dapat mengganti `Copy-Item` dengan `cp`.

## Docker Compose

Salin `.env.example` di root menjadi `.env`. Isi `APP_KEY`, `DB_PASSWORD`, dan `MYSQL_ROOT_PASSWORD` dengan nilai yang berbeda. Buat `APP_KEY` dengan perintah berikut, lalu simpan nilainya di `.env`.

```sh
docker run --rm php:8.4-cli-bookworm php -r 'echo "base64:".base64_encode(random_bytes(32)).PHP_EOL;'
```

Isi juga `SEED_ADMIN_PASSWORD` jika akan membuat admin dari seeder. Jalankan stack dari root proyek.

```sh
docker compose up -d --build
docker compose ps
docker compose exec backend php artisan db:seed --class=AdminSeeder --force
```

Backend menerapkan migrasi saat startup setelah MySQL sehat. Port default frontend adalah 3000 dan backend 8000. Jika port sudah dipakai Laragon, sesuaikan port Compose, URL publik, serta SANCTUM_STATEFUL_DOMAINS. MySQL berjalan di jaringan internal. Volume `mysql-data` menyimpan database dan volume `uploads` menyimpan foto publik serta bukti pembayaran privat. Jalankan `docker compose exec backend php artisan db:seed --force` bila membutuhkan data demo.

## Deploy

- Gunakan reverse proxy HTTPS di depan kedua layanan. Atur `SITE_URL` dan `API_URL` ke origin publik, misalnya `https://toko.example.com` dan `https://api.toko.example.com`. Compose meneruskan nilai itu ke Next.js dan Laravel. Pertahankan `BIND_ADDRESS=127.0.0.1` jika proxy berjalan di host yang sama.
- Atur `SANCTUM_STATEFUL_DOMAINS=toko.example.com`, `SESSION_DOMAIN=.toko.example.com`, dan `SESSION_SECURE_COOKIE=true`. Gunakan parent domain yang Anda kendalikan untuk kedua host. Isi `TRUSTED_PROXIES` dengan IP atau CIDR proxy yang benar-benar terlihat oleh Laravel. Proxy harus menimpa header `X-Forwarded-For`, `X-Forwarded-Proto`, dan `X-Forwarded-Port`.
- Jalankan `docker compose up -d --build` setelah mengubah URL publik atau nilai build frontend. Compose memakai `APP_DEBUG=false`; bila deploy tanpa Compose, setel nilai itu di backend dan sajikan Laravel hanya melalui `backend/public`.
- Cadangkan database serta volume unggahan secara terpisah. Simpan `APP_KEY` bersama konfigurasi deployment. Buat akun admin produksi dengan `AdminSeeder`. Foto produk disajikan dari disk publik, sedangkan bukti transfer diunduh melalui API admin.
- Atur WhatsApp dan rekening melalui **Pengaturan toko**. `NEXT_PUBLIC_STORE_WHATSAPP` pada setup lokal atau `STORE_WHATSAPP` pada Compose menjadi cadangan untuk tautan WhatsApp. Gunakan format internasional seperti `628xxxxxxxxxx`.
- Periksa `/robots.txt` dan `/sitemap.xml` pada domain publik. Sitemap memuat beranda, katalog, dan URL detail produk aktif.

## Endpoint utama

Semua path API berikut memiliki prefix `/api`. Kirim `Accept: application/json` untuk respons JSON. Koleksi produk, pesanan, laporan, dan riwayat stok yang dipaginasi menyertakan `meta` dan `links`.

| Publik | Keterangan |
|---|---|
| `GET /categories`, `/banners`, `/delivery-zones` | Data aktif untuk beranda, katalog, dan checkout. |
| `GET /products` | Filter `q`, `category_id` atau `category`, serta `sort`, `page`, dan `per_page`. Urutan yang tersedia adalah `default`, `newest`, `name_asc`, `name_desc`, `price_asc`, dan `price_desc`. |
| `GET /products/{id}`, `/catalog/sitemap` | Detail produk publik dan daftar ID untuk sitemap. |
| `POST /cart`, `GET /cart` | Buat atau baca keranjang. Pembuatan mengembalikan token. Kirim `X-Cart-Token` untuk membaca dan mengubahnya. |
| `POST /cart/items`, `PUT` atau `DELETE /cart/items/{unit}` | Tambah, tetapkan, atau hapus satuan. Kirim `quantity` sebagai string desimal, misalnya `"1.250"`. |
| `POST /orders/quote`, `POST /orders` | Hitung atau buat pesanan berdasarkan keranjang. Kirim `fulfillment` dan zona bila diantar. Checkout juga meminta nama, nomor HP, metode bayar, serta alamat bila diantar. |
| `POST /orders/track`, `POST /orders/proof` | Lacak dengan `code` dan `phone`. Unggah mengirim field `proof` dengan multipart. |

| Admin | Keterangan |
|---|---|
| `POST /admin/login`, `GET /admin/me`, `POST /admin/logout` | Sesi Sanctum. Panggil `GET /sanctum/csrf-cookie` sebelum mutasi, teruskan cookie sesi, lalu kirim nilai cookie `XSRF-TOKEN` yang sudah di-decode lewat header `X-XSRF-TOKEN`. |
| `GET /admin/dashboard` | Penjualan hari ini dan 7 hari kalender, pesanan baru, serta stok menipis. |
| `/admin/categories`, `/admin/products`, `/admin/delivery-zones`, `/admin/banners` | Daftar, detail, buat, ubah, dan arsipkan atau hapus sesuai jenis data. |
| `/admin/products/{product}/units`, `POST /admin/products/{product}/image` | Kelola satuan dan tingkat grosir. Unggah foto produk dengan field multipart `image`. |
| `PATCH /admin/units/prices` | Ubah maksimal 100 harga eceran sekaligus. Tiap baris berisi `unit_id`, `expected_price`, dan `price`. |
| `POST /admin/units/{unit}/stock`, `GET /admin/stock-movements` | Sesuaikan stok dengan alasan dan baca riwayat. Filter `unit_id` bersifat opsional. |
| `/admin/orders`, `PATCH /admin/orders/{id}/status`, `PATCH /admin/orders/{id}/payment`, `GET /admin/orders/{id}/proof` | Kelola pesanan dan bukti transfer. Halaman cetak tersedia di `/admin/pesanan/{id}/invoice` dan `/admin/pesanan/{id}/surat-jalan` pada frontend. |
| `GET` atau `PUT /admin/settings` | Profil toko, WhatsApp, rekening transfer, dan ambang stok menipis. |
| `GET /admin/reports/sales`, `GET /admin/reports/sales/export` | Laporan dan CSV dengan `from` dan `to` berformat `YYYY-MM-DD`. |

## Tes dan audit

Jalankan pemeriksaan Laravel dari direktori `backend`.

```sh
php artisan test
php vendor/bin/pint --test
composer validate
composer audit
```

Tes bawaan menggunakan SQLite in-memory. Jika ekstensi SQLite tersedia namun belum aktif di Laragon, jalankan `php -d extension=pdo_sqlite vendor/bin/phpunit`. Untuk tes MySQL, setel variabel `DB_*` ke **database uji yang boleh dikosongkan** sebelum menjalankan suite. Tes checkout paralel memerlukan MySQL dan dua koneksi independen.

Jalankan pemeriksaan Next.js dari direktori `frontend`.

```sh
npm ci
npm run lint
npm run typecheck
npm run build
npm audit
```

## Asumsi

- Stok setiap satuan independen. Barang curah mendukung tiga angka desimal. Satu pesanan memuat hingga 100 satuan berbeda dan 99.999,999 per baris. Harga grosir memakai ambang tertinggi yang terpenuhi pada tiap baris. Server membulatkan nilai per baris sebelum menjumlahkan.
- Keranjang tidak menahan stok. Checkout menghitung ulang dari database dan mengurangi stok dalam transaksi. Pembatalan sebelum selesai mengembalikan stok satu kali. Checkout dibatasi 8 kali per menit per IP. Pelacakan dibatasi 15 kali, unggah bukti 6 kali, dan login admin 8 kali.
- Minimum zona dihitung dari subtotal setelah grosir. Ambil di toko gratis. Transfer diverifikasi sebelum konfirmasi dan pengembalian dana dilakukan manual oleh toko. Bukti menerima JPG, PNG, atau PDF hingga 2 MB. Foto produk menerima JPG, PNG, atau WebP hingga 2 MB dan 4096 × 4096 piksel.
- Produk, kategori, satuan, dan zona diarsipkan agar riwayat tetap tersimpan. Produk unggulan memakai delapan produk aktif pertama dengan satuan aktif. Pengurutan harga katalog memakai harga eceran terendah tiap produk. Foto demo yang tersedia dibuat dengan ImageGen dan tersimpan di `frontend/public`.
- Cache katalog server berlaku 60 detik untuk daftar umum, detail, kategori, banner, dan zona. Perubahan katalog, harga, dan stok membatalkan hasil cache setelah commit. Pencarian tetap membaca database. Harga dan stok checkout dibaca langsung pada transaksi pesanan.
- Laporan memakai tanggal pesanan selesai dalam WIB, inklusif, maksimal 366 hari. Total mencakup subtotal dan ongkir. Pesanan sebelum fitur pencatatan tanggal selesai memakai `updated_at` sebagai tanggal selesai awal.

## UI Admin

Panel mengikuti komposisi referensi dengan latar lavender, shell krem membulat, sidebar di dalam shell, dan deretan lima kartu statistik pastel. Grafik, penyesuaian stok, dan tabel terlaris mengisi area utama. Pesanan terbaru dan stok menipis berada di kolom kanan pada desktop. Di bawah 1024 px, sidebar menjadi drawer. Detail produk yang memiliki banyak satuan memakai daftar yang dapat dibuka per produk.

Token admin berada di `frontend/app/admin/admin.css` dan mencakup warna permukaan, teks, aksi, fokus, dan status. Panel menggunakan Inter Variable dari aset lokal. Warna teks sekunder pada konten dan tombol memakai varian yang lebih gelap untuk menjaga kontras.

| Komponen | Varian dan penggunaan |
| --- | --- |
| `AppShell`, `Sidebar`, `Topbar` | Sidebar desktop dan drawer mobile. Topbar memuat pencarian menu serta jumlah pesanan baru dan satuan dengan stok menipis. |
| `StatCard`, `Sparkline`, `ChartCard` | Kartu solid, lavender, pink, kuning, dan biru. Sparkline memakai warna sesuai kartu atau tabel. Grafik penjualan mendukung 24J, 7H, 1B, dan 1T. |
| `PillTabs`, `PillSelect`, `StatusBadge` | Tombol filter, dropdown tertutup, dan badge pastel untuk status pesanan, pembayaran, atau aktivitas. |
| `DataTable`, `ListItemCard` | Tabel dengan scroll horizontal dan daftar ringkas dengan avatar atau thumbnail opsional. |
| `PageHeader`, `EmptyState`, `SkeletonCard`, `EditorDialog` | Judul dengan slot aksi, keadaan kosong, skeleton dengan jumlah baris yang dapat diatur, serta dialog Radix dalam ukuran biasa atau lebar. |

### Data dashboard

- `GET /api/admin/dashboard` memasok ringkasan dan notifikasi. `GET /api/admin/dashboard/analytics` menerima `sales_period` (24h, 7d, 1m, 1y), `order_period` (today, 7d, all), `top_period` (7d, 30d), dan `category_id`. `GET /api/admin/low-stock` menyediakan daftar stok menipis yang bisa dicari dan dipaginasi. Ketiganya memerlukan sesi admin.
- Penjualan memakai pesanan selesai dan batas hari WIB. Rentang 24J menampilkan jam pada hari berjalan, 1B memakai 30 hari kalender, dan 1T memakai 12 bulan kalender. Perbandingan pendapatan bulanan memakai jumlah hari yang setara pada bulan sebelumnya jika tersedia.
- Produk terlaris diperingkat per satuan berdasarkan kuantitas order selesai. Harga yang ditampilkan adalah harga eceran saat ini dan kuantitas dibandingkan dengan periode sebelumnya yang sama panjang. Kartu pesanan menggunakan pesanan yang berstatus sesuai saat ini, lalu tren dikelompokkan menurut hari pembuatan. Tren stok merekonstruksi saldo katalog yang aktif saat ini dari riwayat pergerakan dan menggunakan ambang toko saat ini.
- Halaman Pembayaran menampilkan transfer manual untuk pemeriksaan bukti. Alurnya memakai endpoint verifikasi pesanan yang sama. Penyesuaian stok cepat memakai endpoint stok yang sudah ada.

## UI pelanggan

Storefront berbagi token warna, tipografi Inter, filter pill, status badge, dan keadaan loading/kosong dengan panel admin. Token dan primitif bersama ada di `frontend/components/ui-shared`, sedangkan komponen belanja berada di `frontend/components/shop`.

- Katalog ada di `/produk`. Filter kategori, urutan, stok, dan grosir tersimpan di URL. `/katalog` meneruskan ke katalog baru, dan URL detail produk lama berbasis ID diarahkan ke slug kanonis.
- Produk terlaris diurutkan berdasarkan jumlah pesanan selesai yang berisi produk dalam 30 hari terakhir. Beranda menampilkan “Pilihan Toko” ketika belum ada penjualan selesai. Produk terkait berasal dari kategori yang sama. Galeri menampilkan foto yang disediakan data produk.
- Ongkir dan minimum belanja memakai data zona yang sudah ada. Progress bar mengikuti minimum zona yang dipilih. Harga grosir dan total checkout berasal dari quote dan checkout Laravel. Konfigurasi promo pada info bar berupa teks, tanpa aturan diskon atau gratis ongkir tambahan.
- Data kontak dan rekening untuk pelanggan tersedia di `GET /api/store`. Atur kontak dan rekening melalui Pengaturan admin. Jam buka dan info bar opsional dapat disetel di backend lewat `STORE_HOURS` dan `STORE_INFO_BAR`.
- Jalankan `php artisan migrate` setelah memperbarui backend untuk menambahkan kolom catatan opsional pada pesanan. Halaman konfirmasi lokal menyimpan ringkasan minimal di sesi browser. Pelacakan dan bukti transfer memerlukan kode pesanan dan nomor HP pemesan.

## Panduan Alert

Komponen interaktif mengimpor `alert` dari `@/lib/alert`. Tema berlaku untuk guest dan admin melalui `frontend/styles/swal.css`. Daftar halaman dan aksi ada di [matriks interaksi](frontend/docs/alert-matrix.md).

```ts
import { alert } from "@/lib/alert";
import { api } from "@/lib/api";

async function arsipkanKategori(id: number, nama: string) {
  const lanjut = await alert.confirm({
    title: "Arsipkan kategori?",
    text: nama,
    danger: true,
  });
  if (!lanjut) return;
  return alert.withLoading(
    () => api("/admin/categories/" + id, "DELETE", undefined, true),
    { loadingTitle: "Mengarsipkan kategori…", successTitle: "Kategori diarsipkan", successMode: "toast" },
  );
}

await alert.validation({ phone: ["Masukkan nomor HP Indonesia yang valid."] });
```

Formulir menggunakan `useAlertForm` untuk ringkasan Zod, pesan inline dan fokus. Pasangkan `onInvalid: form.onInvalid` dengan `useActionMutation` agar respons 422 masuk ke React Hook Form. Hook mutasi mengunci submit sejak klik pertama dan menjalankan `withLoading`. Helper mengembalikan hasil operasi atau melempar kembali error yang telah ditampilkan. Aktifkan `safeRetry` hanya untuk operasi baca seperti pelacakan dan unduhan. Keranjang menggunakan update optimistis dan rollback.

Panel pembatalan meminta alasan serta mengingatkan bahwa stok akan dikembalikan. Backend saat ini memproses status dan pengembalian stok. Penyimpanan alasan sebagai riwayat memerlukan dukungan backend tersendiri.

Dari direktori `frontend`, jalankan `npm run test:alert`, `npm run lint`, `npm run typecheck`, dan `npm run build`.

## UI Customer

Storefront mengambil susunan hero, carousel kategori dan produk, kartu putih, mini-cart samping, serta footer bertepi kuas dari referensi. Foto katalog toko, ikon tunas, tepi kuas SVG dan teks berbahasa Indonesia menjadi identitas Pasar Sembako. Tema lime, navy dan magenta ada di `frontend/styles/storefront.css`. Next Font menyajikan Quicksand dan Jost secara lokal.

Pencarian menampilkan saran setelah 300 ms. Riwayat pencarian dan ID wishlist disimpan di browser. Filter harga menguji harga eceran dan kemasan pada satuan aktif yang sama. Endpoint baca `GET /api/catalog/facets` menyediakan jumlah produk per kategori, daftar kemasan dan batas harga slider. Tampilan daftar/grid, filter dan halaman dapat dibagikan melalui URL.

Countdown memakai `promo_ends_at` dari profil toko atau `STORE_PROMO_ENDS_AT` dalam format ISO 8601 dengan zona waktu. Banner disembunyikan bila tanggal kosong atau sudah lewat. Badge penghematan memakai selisih harga grosir yang berlaku. Merek, ulasan, kupon, newsletter, jadwal antar dan tarif gratis ongkir memerlukan data pendukung. Minimum zona ditampilkan pada keranjang. Galeri menyediakan zoom untuk foto produk yang tersedia.

Checkout menggabungkan rincian wilayah ke alamat tujuan dan email opsional ke catatan yang diterima toko. WhatsApp membuka draf pesan untuk dikirim sendiri oleh pelanggan. Toko berjalan dalam mode guest secara bawaan. Jika toko memiliki penyedia akun pelanggan, setel `NEXT_PUBLIC_ENABLE_CUSTOMER_ACCOUNT=true` serta URL HTTPS login dan registrasi pada `frontend/.env.example` di lingkungan build. Halaman akun meneruskan pelanggan ke penyedia tersebut. Endpoint Sanctum di proyek ini khusus staf admin.
Pada build produksi lokal, beranda mendapat Lighthouse mobile Performance 90 dan Accessibility 100 dengan CLS 0. Pengujian Chrome mencakup lebar 360, 768 dan 1280 px. Skenario transaksi memakai API simulasi untuk memeriksa pemindahan wishlist ke keranjang, validasi checkout, dan pencegahan submit ganda. Etalase beranda menggunakan revalidasi 30 detik. Quote dan pembuatan pesanan tetap meminta perhitungan dari Laravel.

