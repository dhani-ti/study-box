# StudyBox

> **Organize Your Study, Simplify Your Life.**

Perpustakaan digital pribadi untuk pelajar dan mahasiswa: catatan, PDF, mata pelajaran, dan tugas dalam satu tempat.

**Stack:** Next.js 14 (App Router) · React 18 · Tailwind CSS · Supabase (Auth, Database, Storage) · Plus Jakarta Sans

## Fitur

| Halaman | Fungsi |
| --- | --- |
| Dashboard | Sapaan, total catatan / PDF / tugas aktif, deadline mendekat, aktivitas terbaru, kalender mini |
| My Notes | Tambah, edit, hapus, cari, kategori (subject), simpan otomatis |
| My Files | Upload PDF (drag & drop), preview, download, ubah nama, hapus, ukuran & tanggal upload |
| Subjects | Tambah, edit, hapus kategori; hubungkan catatan, PDF, dan tugas |
| My Tasks | Judul, deskripsi, deadline, status pending/completed, filter status |
| Settings | Profil, ganti password, info penyimpanan, keluar |

Halaman **Masuk / Daftar** (`/login`) punya 3 mode: Masuk (email + password), Daftar (email + password),
dan **Kode OTP** (passwordless) — masukkan email, Supabase mengirim kode 6 digit, lalu masukkan kodenya
untuk langsung masuk. Mode OTP otomatis membuatkan akun baru bila emailnya belum terdaftar, jadi berfungsi
sekaligus sebagai login maupun sign up.

Morph transition antar halaman memakai **View Transitions API** (Chrome/Edge/Safari terbaru). Browser lain otomatis memakai animasi fade-up.

## Cara menjalankan

### 1. Siapkan Supabase
1. Buat project di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, tempel seluruh isi `supabase/schema.sql`, lalu **Run**.
   Ini membuat semua tabel, Row Level Security, bucket privat `pdfs`, dan policy storage.
3. (Opsional, untuk uji coba cepat) **Authentication → Providers → Email** → matikan *Confirm email*.
4. Salin **Project URL** dan **anon public key** dari **Project Settings → API**.
5. **Wajib agar email berisi kode, bukan tautan**: buka **Authentication → Emails** dan ubah
   template **Magic Link** serta **Reset Password**. Gunakan `{{ .Token }}` untuk kode 6 digit,
   bukan `{{ .ConfirmationURL }}`. Contoh isi template:
   ```html
   <h2>Kode verifikasi StudyBox</h2>
   <p>Masukkan kode ini di aplikasi StudyBox:</p>
   <h1>{{ .Token }}</h1>
   <p>Kode hanya bisa dipakai sekali.</p>
   ```
   Pengaturan Magic Link dipakai untuk masuk/daftar dengan OTP, sedangkan Reset Password dipakai
   saat meminta kode untuk mengganti password. Tanpa `{{ .Token }}`, Supabase akan mengirim tautan,
   bukan kode angka, dan kode yang dimasukkan di aplikasi tidak akan bisa diverifikasi.
6. Jika aplikasi menampilkan *permission denied for table*, jalankan isi
   `supabase/fix_app_table_permissions.sql` di **SQL Editor**. Izin hanya diberikan pada tabel
   aplikasi dan tetap dibatasi kebijakan Row Level Security agar pengguna hanya dapat mengakses
   datanya sendiri.

### 2. Jalankan aplikasi
```bash
cp .env.local.example .env.local   # isi URL & anon key
npm install
npm run dev
```
Buka http://localhost:3000, daftar akun, lalu mulai belajar.

### 3. Deploy
Push ke GitHub lalu impor ke [Vercel](https://vercel.com). Isi dua environment variable yang sama
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Tambahkan domain produksi di
**Supabase → Authentication → URL Configuration**.

## Keamanan data
- Semua tabel memakai **Row Level Security**: setiap pengguna hanya bisa membaca/mengubah baris miliknya (`user_id = auth.uid()`).
- Relasi ke subject divalidasi di database, sehingga tidak bisa menautkan ke subject milik orang lain.
- PDF disimpan di bucket **privat** dalam folder `<user_id>/`. Preview dan download memakai *signed URL* yang kedaluwarsa.
- Hanya file PDF hingga 25 MB yang diterima (dibatasi di bucket dan di aplikasi).

## Struktur proyek
```
app/
  login/                 halaman masuk & daftar
  (app)/                 area terautentikasi (sidebar + transisi)
    dashboard/ notes/ files/ subjects/ tasks/ settings/
components/              UI kit, sidebar, editor catatan, toast, transisi
lib/                     klien Supabase, helper, hook
supabase/schema.sql      skema database + RLS + storage
```

## Pengembangan ke layanan berlangganan
Struktur data sudah terikat ke `user_id`, sehingga mudah ditambah tabel `subscriptions` (mis. via Stripe
atau Midtrans + webhook Supabase Edge Function) untuk membatasi kuota penyimpanan PDF per paket.
Halaman Settings sudah menampilkan pemakaian penyimpanan sebagai titik awal.
