/*
  Warnings:

  - A unique constraint covering the columns `[url]` on the table `webAnalysis` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `content` to the `webAnalysis` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "webAnalysis" ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "embedding" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "webAnalysis_url_key" ON "webAnalysis"("url");
