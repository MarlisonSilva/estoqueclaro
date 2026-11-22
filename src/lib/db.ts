import { PrismaClient } from "@prisma/client";

// Reaproveita o client entre hot reloads do Next em desenvolvimento.
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalParaPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = prisma;
