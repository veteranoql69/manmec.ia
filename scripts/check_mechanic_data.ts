const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Looking up user bodega@manmec.cl...");
    const user = await prisma.manmecUser.findUnique({
        where: { email: 'bodega@manmec.cl' }
    });

    if (!user) {
        console.log("User not found!");
        return;
    }

    console.log("User ID:", user.id);

    // Check assignments
    const assignments = await prisma.manmecWorkOrderAssignment.findMany({
        where: { user_id: user.id },
        include: { work_order: true }
    });
    console.log("Assignments via manmecWorkOrderAssignment:", assignments.map((a: any) => a.work_order));

    // Check direct assignments
    const directOts = await prisma.manmecWorkOrder.findMany({
        where: { assigned_to: user.id }
    });
    console.log("Direct OTs (assigned_to):", directOts);

}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
