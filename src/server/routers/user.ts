import { router, publicProcedure } from "../trpc";
import { users } from "@/db/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";

export const userRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.select().from(users).orderBy(users.createdAt);
  }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email address"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [newUser] = await ctx.db
        .insert(users)
        .values({
          name: input.name,
          email: input.email,
        })
        .returning();
      return newUser;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),
});
