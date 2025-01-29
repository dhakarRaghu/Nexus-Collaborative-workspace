import { PrismaClient } from '@prisma/client';

declare global {
  // Declaring 'global' to avoid issues with caching in development
  var cachedPrisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(); // In production, always create a new Prisma Client instance
} else {
  // In development, use cached Prisma Client to prevent too many database connections
  if (!global.cachedPrisma) {
    global.cachedPrisma = new PrismaClient();
  }
  prisma = global.cachedPrisma;
}

export default prisma;
