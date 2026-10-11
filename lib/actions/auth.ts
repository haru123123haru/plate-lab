"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { signUpSchema, signInSchema } from "@/lib/validations";

export async function signUp(formData: {
  email: string;
  password: string;
  name: string;
}) {
  const parsed = signUpSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    // Prisma の User テーブルにも Supabase Auth と同じ ID でレコード作成
    await prisma.user.create({
      data: {
        id: data.user.id,
        email: parsed.data.email,
        name: parsed.data.name,
      },
    });
  }

  redirect("/");
}

export async function signIn(formData: { email: string; password: string }) {
  const parsed = signInSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}

// Google から戻ったとき、/auth/callback のページから呼ぶ。
// コードをセッションに替え（Cookie を書くので Server Component ではできない）、
// User が無ければ作ってからホームへ移る
export async function completeOAuthSignIn(code: string) {
  if (!code) {
    return { error: "Missing authorization code" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return { error: error?.message ?? "Failed to sign in" };
  }

  const user = data.user;
  await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email || "",
      name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User",
    },
    update: {},
  });

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
