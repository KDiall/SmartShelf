-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'pharmacist';
