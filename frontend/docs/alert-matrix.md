# Matriks interaksi frontend

| Halaman | Aksi | Jenis | Fungsi alert yang dipakai |
| --- | --- | --- | --- |
| Beranda, katalog, detail | Tambah barang dan ubah jumlah | Optimistis, validasi, notifikasi | `toast` dengan Lihat, `warning`, `handleError` |
| Katalog, keranjang | Kurangi sampai nol | Notifikasi dan pemulihan | `toast` dengan Urungkan |
| Keranjang | Hapus lewat ikon sampah | Konfirmasi bahaya, notifikasi | `confirm`, `toast` dengan Urungkan |
| Checkout | Keranjang kosong, data penerima, zona, alamat dan minimum | Validasi | `warning`, `validation` dan error inline |
| Checkout | Buat pesanan | Loading, hasil penting, navigasi | `withLoading` dengan sukses modal |
| Checkout, konfirmasi | Salin rekening atau kode | Notifikasi | `toast`, `warning` |
| Konfirmasi, lacak | Pilih dan unggah bukti transfer | Validasi, loading, progres, hasil | `warning`, `validation`, `withLoading`, `uploadProgress` |
| Lacak | Cari kode dan HP | Validasi, loading, retry aman | `validation`, `withLoading`, `handleError` |
| Lacak | Pesan lagi | Loading satu batch, notifikasi termasuk item yang terlewat | `withLoading`, `toast`, `warning` |
| Login admin | Masuk | Validasi, loading, kegagalan | `validation`, `withLoading`, `handleError` |
| Panel admin | Keluar atau sesi berakhir | Konfirmasi, loading, peringatan | `confirm`, `withLoading`, `handleError` |
| Produk | Tambah/edit produk, satuan, harga grosir | Validasi, loading, notifikasi | `validation`, `withLoading` |
| Produk | Arsipkan atau nonaktifkan produk/satuan | Konfirmasi bahaya, loading, notifikasi | `confirm`, `withLoading` |
| Produk | Pilih dan unggah foto | Validasi, loading, progres, notifikasi | `warning`, `withLoading`, `uploadProgress` |
| Dashboard, stok, produk | Penyesuaian stok | Validasi, konfirmasi, loading, notifikasi | `validation`, `confirm`, `withLoading` |
| Harga massal | Simpan atau buang beberapa perubahan | Validasi, konfirmasi jumlah satuan, loading saat simpan, hasil | `validation`, `confirm`, `withLoading` dengan sukses modal |
| Kategori | Tambah/edit, nonaktifkan, arsipkan | Validasi, konfirmasi saat menonaktifkan/mengarsipkan, loading, notifikasi | `validation`, `confirm`, `withLoading` |
| Zona | Tambah/edit dan nonaktifkan | Validasi, konfirmasi saat menonaktifkan, loading, notifikasi | `validation`, `confirm`, `withLoading` |
| Banner | Tambah/edit, nonaktifkan, hapus | Validasi, konfirmasi bahaya, loading, notifikasi | `validation`, `confirm`, `withLoading` |
| Editor produk, kategori, zona, banner | Tutup editor dengan isian berubah | Konfirmasi | `confirm` |
| Pesanan | Ubah status | Konfirmasi, loading, notifikasi | `confirm`, `withLoading` |
| Pesanan | Batalkan dan kembalikan stok | Konfirmasi dengan alasan, loading, hasil penting | `confirmWithInput`, `withLoading` dengan sukses modal |
| Pesanan, pembayaran | Unduh bukti, verifikasi atau tolak transfer | Loading, konfirmasi untuk keputusan, hasil | `confirm`, `withLoading` |
| Pengaturan | Simpan profil, rekening dan ambang stok | Validasi, loading, notifikasi | `validation`, `withLoading` |
| Laporan | Terapkan periode dan ekspor CSV | Validasi rentang, loading ekspor, retry aman | `validation`, `withLoading` |
| Header, katalog | Cari produk, buka menu, filter, quick view atau perbesar foto | Panel interaktif | `panel`, `photo`, `warning` |
| Kartu produk, detail, wishlist | Simpan, lepas atau pindah barang | Notifikasi, mutasi keranjang optimistis | `toast`, `handleError` |
| Mini-cart, keranjang | Hapus barang atau kosongkan isi | Konfirmasi bahaya, loading saat mengosongkan, notifikasi | `confirm`, `withLoading`, `toast` |
| Kontak | Susun pesan WhatsApp | Validasi | `validation` melalui `useAlertForm` |
| Seluruh halaman data | Buka halaman, muat ulang, cari, filter, paginasi | State halaman, skeleton | Error lokal untuk query biasa. Sesi admin kedaluwarsa memakai `handleError`. |

Halaman informasi, tautan WhatsApp dan cetak dokumen memakai navigasi atau fasilitas cetak browser. Fitur yang tersedia untuk zona adalah menonaktifkan melalui editor. Pengosongan keranjang memakai endpoint hapus per item. Jika satu penghapusan gagal, tampilan memuat ulang isi aktual dari server.
