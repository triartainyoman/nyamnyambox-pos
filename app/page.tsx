import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth";
import { homePathForRole } from "@/lib/constants";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  redirect(profile ? homePathForRole(profile.role) : "/login");
}
