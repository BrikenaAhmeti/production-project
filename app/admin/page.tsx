import { redirect } from "next/navigation";
import { Dashboard } from "@/components/admin/dashboard";
import { isAdminView } from "@/lib/model";
import { currentAdmin } from "@/lib/server/auth";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const email = await currentAdmin();
  if (!email) redirect("/admin/login");
  const { view } = await searchParams;
  return <Dashboard email={email} initialView={isAdminView(view) ? view : "overview"}/>;
}
