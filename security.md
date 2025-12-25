# Keamanan Aplikasi

**(Versi Dunia Nyata dan Gak Ngibul)**

Dokumen ini menjelaskan **keamanan aplikasi web** yang diterapkan pada proyek ini.
Isinya **bukan teori sok akademik**, tapi **risiko dan serangan yang benar-benar kejadian di dunia nyata**, plus **mitigasi yang realistis** sesuai skala aplikasi.

Tujuan dokumen ini sederhana:

* Developer ngerti apa yang dia bangun
* Reviewer **nggak bisa asal nyerang**
* Sistem **nggak gampang dibobol orang waras**

---

## 1. Authentication vs Authorization (INI DASAR, SALAH = MATI)

**Authentication** = *lu siapa?*
Contoh: login pakai email + password.

**Authorization** = *lu boleh ngapain?*
Contoh: user biasa **tidak boleh** akses `/dashboard/admin`.

Kesalahan paling sering:

* User sudah login → dianggap boleh akses semua resource

Solusi di proyek ini:

* Authentication di-handle oleh **NextAuth**
* Authorization di-handle di **middleware + API handler**
* Tidak ada asumsi “kalau sudah login berarti aman”

Login ≠ bebas akses. Ini dua hal beda.

---

## 2. Middleware = Security Gate (SATPAM DEPAN GERBANG)

Middleware dipakai buat **mencegat request sebelum page atau API diproses**.

Contoh kasus:

* User belum login → ditendang ke `/login`
* User sudah login → tidak boleh buka `/login`
* User role biasa → tidak boleh akses route admin

Kenapa ini penting?
Tanpa middleware:

* Orang bisa langsung nembak URL `/dashboard/admin`
* Page bisa keburu ke-render sebelum dicek → bocor data

Middleware bekerja **sebelum kejadian**, bukan sesudah.

Catatan penting:

* Middleware **bukan satu-satunya benteng**
* API tetap wajib cek authorization ulang

---

## 3. OWASP Top 10 (YANG BENERAN KEPAKE, BUKAN PAJANG DOANG)

### A1 – Broken Access Control

Masalah:

* User bisa akses data yang bukan miliknya

Contoh bodoh tapi sering kejadian:

```ts
GET /dashboard/123
```

Tanpa cek apakah `123` milik user tersebut.

Mitigasi:

* Middleware untuk proteksi route
* Cek kepemilikan resource di API:

  * `session.user.id` vs `resource.ownerId`

---

### A2 – Cryptographic Failures

Masalah:

* Password disimpan plaintext
* Atau hash asal-asalan

Solusi:

* Password di-hash (bcrypt)
* Tidak ada password asli di database

Kalau database bocor:

* Password **tidak langsung bisa dipakai**

---

### A3 – Injection (SQL Injection, dll)

Contoh klasik:

```sql
SELECT * FROM users WHERE email = '" + email + "'
```

Solusi:

* ORM (Prisma) → parameterized query
* Raw query **boleh**, asal sadar diri

Injection bukan soal ORM vs raw,
tapi **cara nulis query**.

---

### A5 – Security Misconfiguration

Masalah umum:

* `.env` ke-push ke GitHub
* Debug mode nyala di production
* Secret hardcoded

Mitigasi:

* `.gitignore` bener
* Secret hanya di environment variable
* Konfigurasi production ≠ development

---

### A7 – Identification & Authentication Failures

Masalah:

* Session gampang dipalsuin
* Token dikelola manual tanpa standar

Solusi:

* NextAuth untuk session & token
* Tidak bikin sistem auth DIY sotoy

---

## 4. Session: JWT vs Database Session

### JWT Session

Kelebihan:

* Cepat
* Tidak query DB tiap request

Kekurangan:

* Sulit revoke sebelum expired

### Database Session

Kelebihan:

* Bisa revoke
* Cocok untuk aplikasi skala besar / sensitif

Di proyek ini:

* Auth pakai adapter database
* Session masih JWT

Alasan:

* Kebutuhan belum kompleks
* Trade-off sadar, bukan kebetulan

Kalau skala naik → desain siap diganti.

---

## 5. Rate Limiting & Brute Force Protection (INI WAJIB)

Ancaman nyata:

* Brute force login
* Credential stuffing
* OTP bombing

Contoh serangan:

```
POST /login
100.000 request / jam
```

Tanpa rate limit:

* Password sekuat apa pun → tetap bisa jebol

Mitigasi:

* Rate limit per IP
* Rate limit per user/email
* Delay atau lock sementara

Catatan:

* NextAuth **tidak otomatis rate limit**
* Ini harus disadari dan ditambahkan sesuai kebutuhan

---

## 6. XSS (Cross-Site Scripting)

Ancaman:

```html
<script>
fetch('/api/steal-session')
</script>
```

Dampak:

* Session dicuri
* Account takeover
* Admin panel dibajak

Mitigasi:

* JSX auto-escape (default Next.js)
* Sanitasi input/output (misalnya DOMPurify)
* Hindari `dangerouslySetInnerHTML`
* Terapkan Content Security Policy (CSP)

---

## 7. Content Security Policy & Security Headers

Lapisan keamanan di level browser & HTTP.

Yang diterapkan / direncanakan:

* CSP (`script-src`, `object-src 'none'`)
* Proteksi clickjacking (`frame-ancestors`)
* Header keamanan tambahan sesuai kebutuhan

Tujuan:

* Mempersempit dampak XSS
* Mencegah abuse dari browser

---

## 8. CSRF (Cross-Site Request Forgery)

Masalah:

* User login → buka web jahat → request dikirim atas nama user

Mitigasi:

* NextAuth menyediakan proteksi CSRF otomatis
* Server Action tidak bisa dipanggil sembarangan

CSRF adalah masalah **state**, bukan UI.

---

## 9. CORS (JANGAN SALAH PAHAM)

CORS = **proteksi browser**, bukan proteksi server.

Masalah:

* Website lain mencoba fetch API kita

Mitigasi:

* Tentukan origin yang boleh
* Jangan asal `Access-Control-Allow-Origin: *` untuk API sensitif

Catatan:

* Untuk aplikasi same-origin, CORS sering “nggak kerasa”
* Itu bukan berarti nggak penting

---

## 10. Validation (JANGAN PERCAYA USER)

Semua input divalidasi pakai Zod.

Karena user:

* Bisa salah
* Bisa bodoh
* Bisa jahat

Validasi:

* Email format
* Panjang password
* Data wajib / opsional

---

## 11. File Upload Security (KALAU ADA UPLOAD)

Ancaman:

* Upload script
* Stored XSS
* Malware

Mitigasi:

* Whitelist MIME type
* Size limit
* Rename file
* Storage terpisah dari server utama

---

## 12. Logging, Monitoring, dan Error Handling

Security bukan cuma mencegah, tapi **mendeteksi**.

Yang diperhatikan:

* Login gagal
* Akses ilegal
* Error tidak bocorin detail sensitif

User:

* Dapat error generik

Server:

* Simpan detail di log internal

---

## 13. Dependency & Supply Chain Risk

Risiko:

* Library npm vulnerable
* Dependency disusupi

Mitigasi:

* Update dependency berkala
* Gunakan lockfile
* Tidak asal install package aneh

---

## Prinsip Penting

* Security bukan fitur tempelan
* Security adalah **arsitektur**
* Tidak overengineering
* Tidak sotoy

Yang penting:

* Tahu risiko
* Tahu mitigasi
* Tahu kapan perlu, kapan tidak

---

## Penutup

Dokumentasi ini dibuat supaya:

* Developer paham apa yang dia bangun
* Reviewer tidak bisa asal bacot
* Sistem tidak gampang jebol
