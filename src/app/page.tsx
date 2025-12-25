import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900">
          Next.js Authentication
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Full-stack auth dengan Next.js, Prisma & NextAuth
        </p>

        <div className="mt-8 flex gap-4">
          {session ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg border-2 border-blue-600 px-6 py-3 font-semibold text-blue-600 hover:bg-blue-50"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
