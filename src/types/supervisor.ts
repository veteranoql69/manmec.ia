export interface WorkOrderOp {
    id: string;
    mechanicName: string;
    vehicle: string;
    ot: string;
    externalId?: string | null;
    stationCode?: string | null;
    otType?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}
