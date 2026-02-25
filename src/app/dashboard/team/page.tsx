import { requireRole } from "@/lib/auth";
import { getTeamMembers } from "@/components/team/actions";
import { TeamListClient } from "@/components/team/TeamListClient";

export default async function TeamPage() {
    const profile = await requireRole("MECHANIC"); // Todos pueden ver el equipo
    const members = await getTeamMembers();

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <TeamListClient
                    initialMembers={members}
                    currentUserRole={profile.role!}
                />
            </div>
        </div>
    );
}
