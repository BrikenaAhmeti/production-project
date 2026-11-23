import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/server/auth";
import { Login } from "@/components/admin/login";

export default async function LoginPage() {
  if (await currentAdmin()) redirect("/admin");
  return <Login/>;
}
