import { getOrganizationSettings } from "./actions";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { requireRole } from "@/lib/auth";

export const metadata = {
    title: "Configuración SaaS | Manmec IA",
    description: "Gestión de parámetros operacionales de la compañía.",
};

export default async function SettingsPage() {
    // Solo MANAGER o superior para ver la página, pero ADMIN para editar (ver actions)
    await requireRole("MANAGER");

    // Obtener datos iniciales del servidor
    const settings = await getOrganizationSettings();

    return (
        <div className="p-4 md:p-8">
            <SettingsForm initialData={settings} />
        </div>
    );
}
