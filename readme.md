This project uses Prisma v5, which is currently more stable and better documented compared to the experimental v7 release.

Authentication is implemented using NextAuth with the Prisma Adapter and a database-backed session model. However, the active session strategy in NextAuth remains JWT-based, not database sessions.

The sessions table in the database is only utilized when the database session strategy is explicitly enabled. When using JWT sessions, this table is not involved in the authentication flow.

The tsconfig.json file is configured to support path aliases (e.g. @/), simplifying imports and improving code readability across the project.
