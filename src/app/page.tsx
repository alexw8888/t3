"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trash2, UserPlus, Users } from "lucide-react";

export default function Home() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const utils = trpc.useUtils();

  const { data: users, isLoading } = trpc.user.getAll.useQuery();

  const createUser = trpc.user.create.useMutation({
    onSuccess: () => {
      utils.user.getAll.invalidate();
      setName("");
      setEmail("");
    },
  });

  const deleteUser = trpc.user.delete.useMutation({
    onSuccess: () => {
      utils.user.getAll.invalidate();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email) {
      createUser.mutate({ name, email });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400 bg-clip-text text-transparent">
            T3 Stack Demo
          </h1>
          <p className="text-xl text-slate-400">
            Next.js • tRPC • Drizzle ORM • shadcn/ui • Tailwind CSS
          </p>
        </div>

        {/* Add User Form */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-xl">
              <UserPlus className="h-6 w-6 text-slate-400" />
              Add New User
            </CardTitle>
            <CardDescription className="text-slate-400 text-base">
              Enter user details to add them to the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex gap-4 flex-wrap">
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 min-w-[200px] bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-slate-400 text-base h-11"
              />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 min-w-[200px] bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-slate-400 text-base h-11"
              />
              <Button
                type="submit"
                disabled={createUser.isPending || !name || !email}
                className="bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 text-base h-11 px-6"
              >
                {createUser.isPending ? "Adding..." : "Add User"}
              </Button>
            </form>
            {createUser.error && (
              <p className="text-red-400 mt-2 text-sm">
                Error: {createUser.error.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-xl">
              <Users className="h-6 w-6 text-slate-400" />
              Users
              {users && (
                <span className="ml-2 text-base font-normal text-slate-400">
                  ({users.length} total)
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-slate-400 text-base">
              Manage users stored in PostgreSQL via Drizzle ORM
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-slate-500 border-t-transparent rounded-full" />
              </div>
            ) : users && users.length > 0 ? (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-white text-lg">{user.name}</p>
                      <p className="text-base text-slate-400">{user.email}</p>
                      <p className="text-sm text-slate-500">
                        Added: {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteUser.mutate({ id: user.id })}
                      disabled={deleteUser.isPending}
                      className="bg-slate-700/50 hover:bg-red-600/40 text-slate-400 hover:text-red-400 border border-slate-600 hover:border-red-600/50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users yet. Add one above!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tech Stack Info */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { name: "Next.js" },
            { name: "tRPC" },
            { name: "Drizzle" },
            { name: "PostgreSQL" },
            { name: "shadcn/ui" },
            { name: "Tailwind" },
          ].map((tech) => (
            <div
              key={tech.name}
              className="p-4 rounded-lg bg-slate-800/80 border border-slate-700 text-center text-slate-300 text-base font-medium hover:border-slate-600 transition-colors"
            >
              {tech.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
