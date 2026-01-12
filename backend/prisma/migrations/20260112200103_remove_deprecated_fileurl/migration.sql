/*
  Warnings:

  - You are about to drop the column `fileUrl` on the `submissions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_lessonId_fkey";

-- AlterTable
ALTER TABLE "submissions" DROP COLUMN "fileUrl";
