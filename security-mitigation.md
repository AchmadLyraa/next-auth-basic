## 1️⃣ CSRF — SERVER ACTION + NEXTAUTH (KODE NYATA)

### KENYATAAN

* Server Action **lebih aman** dari CSRF
* Tapi **login / mutate state** tetap wajib aman

### NEXTAUTH → CSRF OTOMATIS

Kalau lu pake NextAuth **DENGAN FORM / SERVER ACTION**, CSRF **SUDAH KEHANDLE**.

Contoh **Server Action dipanggil dari form**:

```tsx
<form action={createPost}>
  <input name="title" />
  <textarea name="content" />
  <button type="submit">Create</button>
</form>
```

Server Action:

```ts
"use server"

export async function createPost(formData: FormData) {
  // TIDAK BISA DIPANGGIL DARI DOMAIN LAIN
}
```

👉 Browser **tidak bisa** kirim Server Action cross-site.
Itu sebabnya Server Action **lebih CSRF-resistant**.

---

### ⚠️ CSRF MASIH RELEVAN KALAU:

* Lu expose **Route Handler** (`/api/*`)
* Lu bikin endpoint public

Contoh **Route Handler + CSRF CHECK**:

```ts
import { getToken } from "next-auth/jwt"

export async function POST(req: Request) {
  const token = await getToken({ req })

  if (!token) {
    return new Response("UNAUTHORIZED", { status: 401 })
  }

  // lanjut logic
}
```

---

## 2️⃣ CSP (Content Security Policy) — KODE HEADER NYATA

INI YANG  SUKA, TAPI DEV BANYAK YANG MOLOR.

### Next.js Middleware → CSP HEADER

```ts
// middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const res = NextResponse.next()

  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
    ].join("; ")
  )

  return res
}
```

INI LANGSUNG:

* ❌ Inline script
* ❌ Injected script
* ❌ Clickjacking iframe

---

## 3️⃣ CLICKJACKING — HEADER TAMBAHAN (WAJIB)

Masih di `middleware.ts`:

```ts
res.headers.set("X-Frame-Options", "DENY")
```

Walaupun CSP `frame-ancestors 'none'` **udah cukup**,
ini **double lock** buat browser tua.

---

## 4️⃣ XSS — SERVER ACTION AMAN, DATA TETAP BERACUN

### MASALAH NYATA

Lu simpan:

```html
<script>alert(1)</script>
```

Server Action:

* Aman
* Tapi **pas render di UI → BOOM**

---

### SOLUSI 1: SANITASI SEBELUM SIMPAN (WAJIB KALAU HTML)

```ts
import DOMPurify from "isomorphic-dompurify"

const clean = DOMPurify.sanitize(rawHtml)

await prisma.post.create({
  data: {
    content: clean,
    ownerId: session.user.id,
  },
})
```

---

### SOLUSI 2: JANGAN SIMPAN HTML

Simpan:

* Markdown
* Plain text

Render:

* Encode otomatis JSX

```tsx
<p>{post.content}</p>
```

❌ JANGAN:

```tsx
<div dangerouslySetInnerHTML={{ __html: post.content }} />
```

Kalau lu pake ini tanpa sanitasi → **lu minta dirampok**.

---

## 5️⃣ SECURITY HEADERS TAMBAHAN (PROD MINIMAL)

Masih di `middleware.ts`:

```ts
res.headers.set("X-Content-Type-Options", "nosniff")
res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
res.headers.set("Permissions-Policy", "geolocation=(), microphone=()")
```

Ini:

* Cegah MIME sniffing
* Cegah data bocor lewat referrer
* Lock fitur browser

---

## 6️⃣ FILE UPLOAD — SERVER ACTION AMAN

### SERVER ACTION UPLOAD (VALIDASI TOTAL)

```ts
"use server"

export async function uploadAvatar(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("UNAUTHORIZED")

  const file = formData.get("file") as File

  if (!file) throw new Error("NO_FILE")

  if (!["image/png", "image/jpeg"].includes(file.type)) {
    throw new Error("INVALID_TYPE")
  }

  if (file.size > 2_000_000) {
    throw new Error("FILE_TOO_LARGE")
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const filename = `${crypto.randomUUID()}.png`

  await writeFile(`./uploads/${filename}`, buffer)

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatar: filename },
  })
}
```

INI PENTING:

* ❌ Jangan percaya extension
* ✅ Cek MIME
* ✅ Rename file
* ✅ DB cuma simpan path

---

## 7️⃣ MASS ASSIGNMENT (SERING GAK DISADARI)

### CONTOH :

```ts
prisma.user.update({
  where: { id },
  data: formData, // ROLE BISA IKUT KEUPDATE
})
```

### FIX:

```ts
const safeData = {
  name: formData.name,
  bio: formData.bio,
}

prisma.user.update({
  where: { id },
  data: safeData,
})
```

INI **SERANGAN NYATA**, bukan teori.

---

## 8️⃣ DEPENDENCY / SUPPLY CHAIN (MINIMAL CODE)

`package.json`:

```json
"scripts": {
  "audit": "npm audit --audit-level=high"
}
```

CI:

* Fail kalau vulnerability critical

---

## 9️⃣ RANGKUMAN OTAK (TERAKHIR, BUKAN ULANG)

* CSRF → Server Action + NextAuth
* CSP → middleware header
* XSS → sanitasi + no innerHTML
* Clickjacking → frame-ancestors + X-Frame-Options
* Upload → MIME + size + rename
* Prisma → jangan mass assignment
* Headers → HTTP layer wajib
