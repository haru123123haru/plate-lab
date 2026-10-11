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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
