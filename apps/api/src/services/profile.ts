import type { User } from "@supabase/supabase-js";
import { prisma } from "../lib/prisma.js";

export function getUserName(user: User) {
  const metadataName = user.user_metadata.full_name ?? user.user_metadata.name;
  return typeof metadataName === "string" && metadataName.trim() ? metadataName.trim() : null;
}

export async function ensureProfile(user: User) {
  const email = user.email;

  if (!email) {
    throw new Error("Authenticated user does not have an email address");
  }

  return prisma.profile.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email,
      fullName: getUserName(user),
    },
    update: {
      email,
      fullName: getUserName(user),
    },
  });
}
