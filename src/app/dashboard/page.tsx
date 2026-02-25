import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardRootPage() {
    const profile = await requireAuth();

    // Redirección inteligente basada en rol
    if (profile.role === "MECHANIC") {
        redirect("/dashboard/mechanic");
    }

    if (["SUPERVISOR", "MANAGER", "COMPANY_ADMIN"].includes(profile.role as string)) {
        redirect("/dashboard/supervisor");
    }

    // Fallback por si algo falla
    redirect("/pending");
}
