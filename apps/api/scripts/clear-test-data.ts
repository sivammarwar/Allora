import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearTestData() {
  try {
    console.log('Clearing test data...');

    // Delete hero profile (will cascade to related records)
    const heroDelete = await prisma.heroProfile.deleteMany({});
    console.log(`Deleted ${heroDelete.count} hero profiles`);

    // Delete agent profile
    const agentDelete = await prisma.agentProfile.deleteMany({});
    console.log(`Deleted ${agentDelete.count} agent profiles`);

    // Delete delivery boy profile
    const dboyDelete = await prisma.deliveryBoyProfile.deleteMany({});
    console.log(`Deleted ${dboyDelete.count} delivery boy profiles`);

    // Delete verification requests
    const vrDelete = await prisma.verificationRequest.deleteMany({});
    console.log(`Deleted ${vrDelete.count} verification requests`);

    // Delete users (except ADMIN and PRODUCT_MANAGER if you want to keep them)
    const userDelete = await prisma.user.deleteMany({
      where: {
        role: {
          in: ['USER', 'AGENT', 'HERO', 'DELIVERY_BOY'],
        },
      },
    });
    console.log(`Deleted ${userDelete.count} users`);

    console.log('Test data cleared successfully!');
  } catch (error) {
    console.error('Error clearing test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearTestData();
