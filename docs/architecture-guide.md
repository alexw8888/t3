# How Next.js, tRPC, Drizzle, and PostgreSQL Work Together

This guide explains how the technologies in this project connect and communicate with each other. It's designed for developers who may be new to tRPC, Drizzle ORM, or PostgreSQL.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           BROWSER (Client)                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              React Components (page.tsx)                        │   │
│  │                         │                                        │   │
│  │              trpc.user.getAll.useQuery()                        │   │
│  └─────────────────────────────┼───────────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
                                  ▼ HTTP Request to /api/trpc
┌─────────────────────────────────────────────────────────────────────────┐
│                           SERVER (Next.js)                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │          tRPC Router (src/server/routers/_app.ts)               │   │
│  │                         │                                        │   │
│  │          Procedures (src/server/routers/user.ts)                │   │
│  │                         │                                        │   │
│  │          Drizzle ORM (src/db/index.ts)                          │   │
│  │                         │                                        │   │
│  └─────────────────────────────┼───────────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
                                  ▼ SQL Query
┌─────────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL Database                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        users table                               │   │
│  │              (id, name, email, created_at)                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. PostgreSQL - The Database

### What is PostgreSQL?
PostgreSQL (often called "Postgres") is a powerful, open-source **relational database**. Think of it as a sophisticated Excel spreadsheet that can:
- Store millions of rows efficiently
- Handle multiple users simultaneously
- Ensure data consistency and security
- Support complex queries

### In This Project
PostgreSQL runs in a **Docker container** (see `docker-compose.mac.yml`), which means it's isolated and easy to set up. Your data lives in a folder called `pgdata/`.

### Connection
The database URL in `.env` tells the application how to connect:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/myapp"
```
This breaks down as:
- `postgresql://` - Protocol
- `postgres:password` - Username and password
- `localhost:5432` - Host and port
- `myapp` - Database name

---

## 2. Drizzle ORM - The Database Layer

### What is Drizzle?
Drizzle is an **ORM (Object-Relational Mapper)**. Instead of writing raw SQL like:
```sql
SELECT * FROM users WHERE email = 'john@example.com';
```

You write TypeScript that looks like this:
```typescript
db.select().from(users).where(eq(users.email, 'john@example.com'));
```

### Why Use Drizzle?
1. **Type Safety** - Catch errors at compile time, not runtime
2. **Autocompletion** - Your IDE knows your database structure
3. **SQL-like Syntax** - Easy to learn if you know SQL
4. **Migrations** - Safely update your database schema

### Key Files in This Project

#### Schema Definition (`src/db/schema.ts`)
This file **defines your database tables** in TypeScript:

```typescript
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// These types are auto-generated from your schema!
export type User = typeof users.$inferSelect;    // For reading data
export type NewUser = typeof users.$inferInsert; // For inserting data
```

#### Database Connection (`src/db/index.ts`)
This creates the connection to PostgreSQL:

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });
```

### Common Drizzle Operations

```typescript
// SELECT all users
await db.select().from(users);

// SELECT with condition
await db.select().from(users).where(eq(users.email, 'john@example.com'));

// INSERT a new user
await db.insert(users).values({ name: 'John', email: 'john@example.com' });

// UPDATE a user
await db.update(users).set({ name: 'Johnny' }).where(eq(users.id, 1));

// DELETE a user
await db.delete(users).where(eq(users.id, 1));
```

---

## 3. tRPC - The API Layer

### What is tRPC?
tRPC stands for **TypeScript Remote Procedure Call**. It lets you call server functions directly from the client **as if they were local functions**, with full type safety.

### Why tRPC Instead of REST APIs?

| Traditional REST | tRPC |
|------------------|------|
| `fetch('/api/users')` | `trpc.user.getAll.useQuery()` |
| Response type is `any` | Response is fully typed |
| Need to manually define types | Types are inferred automatically |
| Separate API route files | Functions in router files |

### How tRPC Works

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   CLIENT         │         │   tRPC           │         │   SERVER         │
│                  │         │                  │         │                  │
│ trpc.user.getAll │ ──────► │ Serializes call  │ ──────► │ userRouter       │
│    .useQuery()   │         │ via HTTP         │         │   .getAll()      │
│                  │ ◄────── │                  │ ◄────── │                  │
│ Typed response   │         │ Deserializes     │         │ Returns data     │
└──────────────────┘         └──────────────────┘         └──────────────────┘
```

### Key Files

#### 1. tRPC Initialization (`src/server/trpc.ts`)
Sets up tRPC and creates a **context** (shared data available in all procedures):

```typescript
import { initTRPC } from "@trpc/server";
import { db } from "@/db";

// Context provides the database connection to all procedures
export const createTRPCContext = async () => {
  return { db };  // <-- This `db` is available in every procedure
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
```

#### 2. Router Definition (`src/server/routers/user.ts`)
Defines the **actual API endpoints** (called "procedures"):

```typescript
import { router, publicProcedure } from "../trpc";
import { users } from "@/db/schema";
import { z } from "zod";

export const userRouter = router({
  // GET all users - a "query" (read operation)
  getAll: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(users);
    //           ↑ ctx.db comes from the context we created
  }),

  // CREATE a user - a "mutation" (write operation)
  create: publicProcedure
    .input(z.object({                           // Validate input with Zod
      name: z.string().min(1),
      email: z.string().email(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [newUser] = await ctx.db
        .insert(users)
        .values({ name: input.name, email: input.email })
        .returning();
      return newUser;
    }),

  // DELETE a user
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),
});
```

#### 3. App Router (`src/server/routers/_app.ts`)
Combines all routers into one:

```typescript
import { router } from "../trpc";
import { userRouter } from "./user";

export const appRouter = router({
  user: userRouter,  // accessible as trpc.user.*
});

export type AppRouter = typeof appRouter;  // Export type for client
```

#### 4. API Route Handler (`src/app/api/trpc/[trpc]/route.ts`)
Exposes tRPC as a Next.js API route:

```typescript
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers/_app";
import { createTRPCContext } from "@/server/trpc";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

export { handler as GET, handler as POST };
```

#### 5. Client Setup (`src/trpc/client.ts` & `src/trpc/Provider.tsx`)
Makes tRPC available in React components:

```typescript
// client.ts
"use client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/routers/_app";

export const trpc = createTRPCReact<AppRouter>();
```

---

## 4. Next.js - The Framework

### Role in This Stack
Next.js ties everything together:
- **React Components** - The UI (`src/app/page.tsx`)
- **API Routes** - Hosts tRPC endpoints (`src/app/api/trpc/[trpc]/route.ts`)
- **Server-Side Rendering** - Pages can fetch data during build or request
- **File-based Routing** - `src/app/page.tsx` → `/`

---

## 5. The Complete Data Flow

Here's what happens when you load a list of users:

### Step 1: Component Calls tRPC
```typescript
// In src/app/page.tsx
const { data: users } = trpc.user.getAll.useQuery();
```

### Step 2: Request Sent to API
The tRPC client sends an HTTP request to:
```
GET /api/trpc/user.getAll
```

### Step 3: tRPC Handler Receives Request
`src/app/api/trpc/[trpc]/route.ts` catches the request and routes it to the correct procedure.

### Step 4: Procedure Executes
`userRouter.getAll` runs:
```typescript
return await ctx.db.select().from(users).orderBy(users.createdAt);
```

### Step 5: Drizzle Generates SQL
Drizzle converts this to:
```sql
SELECT * FROM users ORDER BY created_at;
```

### Step 6: PostgreSQL Returns Data
The database executes the query and returns the results.

### Step 7: Data Flows Back
The data flows back through Drizzle → tRPC → React component, fully typed!

---

## 6. Adding New Features

### Adding a New Table

1. **Define the schema** in `src/db/schema.ts`:
```typescript
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  authorId: integer("author_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

2. **Generate and run migration**:
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

### Adding a New tRPC Router

1. **Create router** in `src/server/routers/post.ts`:
```typescript
import { router, publicProcedure } from "../trpc";
import { posts } from "@/db/schema";

export const postRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(posts);
  }),
});
```

2. **Register router** in `src/server/routers/_app.ts`:
```typescript
import { postRouter } from "./post";

export const appRouter = router({
  user: userRouter,
  post: postRouter,  // Add this line
});
```

3. **Use in components**:
```typescript
const { data: posts } = trpc.post.getAll.useQuery();
```

---

## 7. Quick Reference

### tRPC Concepts
| Term | Meaning |
|------|---------|
| **Router** | A group of related procedures |
| **Procedure** | A single API endpoint (query or mutation) |
| **Query** | Read operation (GET) |
| **Mutation** | Write operation (POST/PUT/DELETE) |
| **Context** | Shared data available in all procedures (like `db`) |
| **Input** | Validated data sent from client (uses Zod) |

### Drizzle Concepts
| Term | Meaning |
|------|---------|
| **Schema** | TypeScript definition of your tables |
| **Migration** | SQL file that updates database structure |
| **Query Builder** | Chainable methods to build SQL queries |

### File Structure Summary
```
src/
├── app/
│   ├── api/trpc/[trpc]/route.ts  # API endpoint for tRPC
│   └── page.tsx                   # React page component
├── db/
│   ├── index.ts                   # Database connection
│   └── schema.ts                  # Table definitions
├── server/
│   ├── trpc.ts                    # tRPC initialization
│   └── routers/
│       ├── _app.ts                # Main router (combines all)
│       └── user.ts                # User-related procedures
└── trpc/
    ├── client.ts                  # Client-side tRPC setup
    └── Provider.tsx               # React provider for tRPC
```

---

## 8. Helpful Commands

```bash
# Start the development server
npm run dev

# Generate a new migration after schema changes
npx drizzle-kit generate

# Push schema changes to database
npx drizzle-kit push

# Open Drizzle Studio (database GUI)
npx drizzle-kit studio

# Start PostgreSQL (Docker)
docker compose -f docker-compose.mac.yml up -d
```
