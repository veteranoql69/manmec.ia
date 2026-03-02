import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    console.log("=== CHECKING DATABASE CONTENT ===");

    // 1. Get Organizations
    const orgs = await prisma.manmecOrganization.findMany();
    console.log("\n--- Organizations ---");
    console.log(JSON.stringify(orgs, null, 2));

    // 2. Get Users
    const users = await prisma.manmecUser.findMany({
        select: { id: true, full_name: true, role: true, email: true } // Assuming email exists in Auth, but manmec_users might not have it directly. Let's just get what's there.
    });
    console.log("\n--- Users (first 5) ---");
    console.log(JSON.stringify(users.slice(0, 5), null, 2));

    // 3. Get Stations
    const stations = await prisma.manmecServiceStation.findMany({ select: { id: true, name: true, code: true } });
    console.log("\n--- Stations (first 5) ---");
    console.log(JSON.stringify(stations.slice(0, 5), null, 2));

    // 4. Get Vehicles
    const vehicles = await prisma.manmecVehicle.findMany({ select: { id: true, plate: true, brand: true } });
    console.log("\n--- Vehicles ---");
    console.log(JSON.stringify(vehicles, null, 2));

    // 5. Get Work Orders
    const ots = await prisma.manmecWorkOrder.findMany({
        include: {
            station: true,
            vehicle: true,
            creator: true,
            assignee: true,
            assignments: {
                include: { mechanic: true }
            },
            materials: {
                include: { item: true }
            }
        }
    });

    console.log("\n--- Work Orders ---");
    console.log(JSON.stringify(ots, null, 2));

}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
