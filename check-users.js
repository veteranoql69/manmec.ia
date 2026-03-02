"use strict";
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.manmecOrganizationUser.findMany({
        include: {
            user: true,
            organization: true
        }
    });

    console.log(JSON.stringify(users, null, 2));
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
