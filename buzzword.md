# **Konsep Autentikasi dan Otorisasi dalam Pengembangan Web**

## **1. SESSION (Status Login)**
**Definisi**: Status yang menunjukkan pengguna telah berhasil login.  
**Konten**: Data pengguna (ID, email, peran, dll)  
**Tujuan**: Memberi tahu server identitas pengguna yang sedang mengakses.

### **Jenis Session:**
- **Database Session**: Data session disimpan di database. Klien hanya menerima **Session ID**. Setiap akses, server memverifikasi Session ID di database.
- **JWT Session**: Semua data pengguna dienkripsi dalam token JWT. Server tidak menyimpan data, hanya memverifikasi validitas token.

## **2. COOKIE**
**Definisi**: Izin akses yang disimpan browser. Browser mengirimkan cookie otomatis ke server setiap permintaan.  
**Contoh**: `next-auth.session-token=abc123`  
**HttpOnly Cookie**: Cookie yang tidak dapat diakses JavaScript (aman dari pencurian data).

## **3. JWT (JSON Web Token)**
**Definisi**: Token digital yang berisi data pengguna dengan tanda tangan digital.  
**Format**: `header.payload.signature`  
Contoh payload: `{"user_id": 123, "exp": 1234567890}`

## **4. ACCESS TOKEN**
**Definisi**: Token sementara untuk mengakses resource atau API.  
**Karakteristik**:
- Masa hidup singkat (15 menit - 1 jam)
- Digunakan untuk akses resource/API
- **Alasan masa hidup singkat**: Jika dicuri, pencuri hanya memiliki waktu terbatas untuk menyalahgunakan.

## **5. REFRESH TOKEN**
**Definisi**: Token panjang umur untuk memperbarui access token.  
**Karakteristik**:
- Masa hidup panjang (7-30 hari)
- Disimpan dengan aman (httpOnly cookie atau secure storage)
- Hanya digunakan untuk meminta access token baru
- **Alasan tidak digunakan sebagai access token**: Jika dicuri, pencuri dapat mengakses data dalam periode yang panjang.

## **Alasan Penggunaan Dua Token: Analogi**

Akses ke klub malam:
1. **Access Token** = **Gelang pengunjung** (hanya berlaku malam ini)
2. **Refresh Token** = **Kartu anggota** (dapat digunakan untuk meminta gelang baru besok)

Jika gelang hilang (access token dicuri) → hanya dapat digunakan malam ini.  
Jika kartu anggota hilang (refresh token dicuri) → pencuri dapat meminta gelang baru setiap hari.

## **6. SESSION ID**
**Definisi**: **Nomor identifikasi** yang diberikan ke pengguna. Server menyimpan data sesungguhnya di database.

## **7. BEARER TOKEN**
**Definisi**: Metode pengiriman token: `Authorization: Bearer <token>`

## **8. OAUTH 2.0 / OPENID CONNECT**
**Definisi**: **Sistem login menggunakan akun pihak ketiga** (Google, Facebook, dll).  
Alur: Aplikasi → Provider → Kembali ke aplikasi dengan token.

## **9. CSRF TOKEN**
**Definisi**: **Token pengaman formulir** untuk mencegah serangan CSRF.

## **10. CORS (Cross-Origin Resource Sharing)**
**Definisi**: **Kebijakan keamanan lintas asal** untuk mengontrol akses ke API.

---

## **CARA KERJA INTEGRASI**

### **Skenario 1: Session Tradisional (Default Next-Auth)**
```
1. Login → Next-Auth membuat session di database
2. Session ID dikirim ke browser melalui httpOnly cookie
3. Setiap permintaan: browser mengirim cookie → server memverifikasi Session ID di database
4. Logout → menghapus session dari database
```

### **Skenario 2: JWT + Refresh Token**
```
1. Login → Server memberikan:
   - Access Token (15 menit) → disimpan di memori
   - Refresh Token (7 hari) → disimpan di httpOnly cookie

2. Akses API:
   Klien: "Hey API, ini Access Token saya"
   API: "Token valid, ini datanya"

3. Access Token kedaluwarsa:
   Klien: "Hey Server, ini Refresh Token saya, berikan Access Token baru"
   Server: "Ini Access Token baru (15 menit)"
```

### **Skenario 3: Hybrid (Next-Auth + API Eksternal)**
```
1. Login melalui Next-Auth → membuat session
2. Butuh akses API eksternal → meminta Access Token ke API pihak ketiga
3. Menyimpan Access Token di session Next-Auth
4. Menggunakan Access Token untuk memanggil API eksternal
```

---

## **LOKASI PENYIMPANAN**

### **1. Aplikasi Web Biasa (SSR):**
- **Session ID** → httpOnly cookie
- **Data session** → Database (jika menggunakan database session) atau JWT (jika menggunakan JWT session)

### **2. SPA/Aplikasi Mobile:**
- **Access Token** → Memori / Secure Storage (BUKAN localStorage!)
- **Refresh Token** → httpOnly cookie (web) / Secure Storage (mobile)

### **3. Next-Auth Default:**
- **Semua dihandle otomatis**:
  - Session di cookie
  - Pembaruan session otomatis
  - Keamanan default terkonfigurasi

---

## **ALASAN NEXT-AUTH DEFAULT TIDAK MENGGUNAKAN ACCESS/REFRESH TOKEN**

Next-Auth default menggunakan **SESSION COOKIE**, bukan token-based authentication.  
Dapat dikembangkan jika memerlukan token.

---

## **CONTOH IMPLEMENTASI**

```javascript
// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions = {
  // PILIH STRATEGI:
  // 1. "jwt" = menggunakan JWT token (stateless)
  // 2. "database" = menggunakan session di database (stateful)
  session: { strategy: "jwt" },
  
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // 1. VERIFIKASI DATABASE
        const user = await db.user.findUnique({
          where: { email: credentials.email }
        })
        
        // 2. VERIFIKASI PASSWORD
        if (!user) return null
        
        // 3. RETURN DATA PENGGUNA
        return {
          id: user.id,
          email: user.email,
          name: user.name
        }
      }
    })
  ],
  
  // JIKA MENGGUNAKAN STRATEGI JWT:
  callbacks: {
    jwt({ token, user }) {
      // Token = JWT yang akan dibuat
      // User = object dari authorize()
      if (user) {
        token.id = user.id
      }
      return token
    },
    
    session({ session, token }) {
      // Session = data yang dikirim ke klien
      if (session.user) {
        session.user.id = token.id
      }
      return session
    }
  },
  
  // JIKA MENGGUNAKAN STRATEGI DATABASE:
  // adapter: PrismaAdapter(prisma),
  // session: { strategy: "database" },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

---

## **PERBANDINGAN TEKNIS:**

| **Konsep** | **Disimpan Dimana** | **Dikirim Kemana** | **Contoh Nyata** |
|------------|---------------------|-------------------|------------------|
| **Session** | Database Server / Memory Server | - | `{userId: 123, loggedIn: true, expires: 2024-...}` |
| **Cookie** | Browser User | Otomatis ke Server setiap request | `sessionId=abc123; HttpOnly; Secure` |
| **Access Token** | Memory Client / Secure Storage | Header API Request: `Authorization: Bearer <token>` | `eyJhbGciOiJIUzI1NiIs...` |
| **Refresh Token** | httpOnly Cookie / Secure Storage | Hanya ke Endpoint Refresh Token | Disimpan aman, tidak diekspos |
| **JWT** | Cookie / Local Storage | Bisa sebagai Cookie atau Header | Berisi payload: `{sub: "123", name: "John", exp: 1516239022}` |

---

## **KESIMPULAN**

1. **Untuk penggunaan standar, gunakan Next-Auth default** (session + cookie)
2. **Access & Refresh Token hanya diperlukan ketika**:
   - Mengakses API eksternal
   - Membangun aplikasi mobile
   - Membangun SPA (Single Page Application)
3. **Simpan token di httpOnly cookie** jika memungkinkan
4. **Gunakan solusi yang sudah tersedia** - Next-Auth telah menangani aspek keamanan

**Rekomendasi**:
- Aplikasi web biasa? → Next-Auth default (session)
- Butuh API eksternal? → Kembangkan Next-Auth dengan token
- Aplikasi mobile? → Gunakan Next-Auth dengan token

---

## **PERTANYAAN UMUM:**

**Q: Mengapa Session ada di database?**  
**A**: Karena menggunakan `session.strategy = "database"`. Next-Auth perlu menyimpan status login di suatu tempat.

**Q: Mengapa Account memiliki access_token/refresh_token?**  
**A**: Token tersebut berasal dari provider OAuth (Google/Facebook/GitHub), BUKAN token aplikasi Anda. Digunakan untuk mengakses API provider.

**Q: Mengapa ada VerificationToken?**  
**A**: Untuk fitur verifikasi email & reset password.

**Q: Apakah aplikasi memerlukan access/refresh token sendiri?**  
**A**: Tidak. Aplikasi tidak memerlukan access/refresh token untuk autentikasi internal. Namun perlu:
- Menyimpan session (di table Session)
- Menyimpan token OAuth (di table Account) jika menggunakan OAuth
- Menyimpan token verifikasi (di table VerificationToken)

1. PROVIDERS = CARA LOGIN

providers: [
  Credentials({...}),  // Login pake email/password
  Google({...}),       // Login pake Google  
  GitHub({...}),       // Login pake GitHub
  // Bisa banyak provider
]

2. CREDENTIALS PROVIDER = LOGIN EMAIL/PASSWORD
Credentials({
  name: "credentials",  // Nama provider
  credentials: {        // Field yang dibutuhkan di form
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    // Fungsi ini yang verify email & password
    // Return user object kalo bener
    // Return null kalo salah
  }
})

3. KENAPA BISA EXPORT handlers, auth, DLL?
export const { 
  handlers,  // ← Auto dibuat NextAuth untuk API routes
  auth,      // ← Auto dibuat untuk get session di server
  signIn,    // ← Auto dibuat untuk trigger login  
  signOut,   // ← Auto dibuat untuk trigger logout
} = NextAuth(authOptions);

4. STRUKTUR WAJIB vs OPTIONAL

WAJIB ADA:

export const authOptions = {
  providers: [          // ✅ WAJIB minimal 1 provider
    Credentials({...})  // atau Google() atau GitHub()
  ],
  
  session: {            // ✅ WAJIB (default ada tapi better define)
    strategy: "jwt"     // atau "database"
  }
}

export const { handlers, auth } = NextAuth(authOptions) // ✅ WAJIB

OPTIONAL (tapi recommended):
typescript
export const authOptions = {
  adapter: PrismaAdapter(prisma),  // Optional (kalo pake database)
  
  pages: {                         // Optional (custom halaman)
    signIn: "/login",
    error: "/error",
  },
  
  callbacks: {                     // Optional (custom logic)
    jwt() {...},
    session() {...}
  },
  
  // Lain-lain optional...
}

6. STRUKTUR LENGKAP (RECOMMENDED):
typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

// 1. Schema validation
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const authOptions = {
  // 2. Database adapter (kalo pake DB)
  adapter: PrismaAdapter(prisma),
  
  // 3. Session config
  session: { strategy: "jwt" },
  
  // 4. Custom pages
  pages: { signIn: "/login" },
  
  // 5. Providers
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // 6. Validasi input
        const validated = loginSchema.safeParse(credentials)
        if (!validated.success) return null
        
        const { email, password } = validated.data
        
        // 7. Cari user di database
        const user = await prisma.user.findUnique({
          where: { email }
        })
        if (!user) return null
        
        // 8. Verify password
        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) return null
        
        // 9. Return user data
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    })
  ],
  
  // 10. Callbacks (tambah data ke session/jwt)
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    }
  }
}

// 11. Export utilities
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)


7. ALUR KERJA:
text
1. User submit form login
2. NextAuth panggil authorize() di credentials provider
3. authorize() cek email/password di database
4. Kalo valid → return user object
5. NextAuth bikin session/jwt
6. Session disimpan (cookie/database)
7. User logged in


User login → auth system verifikasi (password / OAuth / token / session).

Auth system bikin session / JWT / cookie signed.

Request masuk → middleware jalan duluan.

Middleware baca hasil auth (req.auth).

Middleware:

boleh lanjut

atau redirect

Page / API handler tetap cek auth lagi


👉 GET gak bisa manggil function server
👉 GET gak bisa kirim FormData aman


Tailwind itu DEV DEPENDENCY karena DIA MATI SAAT BUILD.
Di production YANG HIDUP ITU CSS HASILNYA, BUKAN TAILWIND-NYA.

Tailwind gak bisa masuk ke build

Tailwind JALAN DI ATAS PostCSS.
Tanpa PostCSS:


autoprefixer
Ini plugin PostCSS.
nambah prefix browser

contoh:
display: flex
jadi:
-webkit-flex
-ms-flexbox
dll
CSS modern bisa retak di browser tertentu
