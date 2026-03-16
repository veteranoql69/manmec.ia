import { getIaAutomationLogs } from "./actions";
import { AiAutomationLogsClient } from "@/components/dashboard/AiAutomationLogsClient";

export const dynamic = "force-dynamic";

export default async function AiLogsPage() {
    const { logs, error } = await getIaAutomationLogs();

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <AiAutomationLogsClient initialLogs={logs} fetchError={error} />
        </div>
    );
}
