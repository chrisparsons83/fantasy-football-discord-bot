/*
  Warnings:

  - A unique constraint covering the columns `[newsIdentifier]` on the table `NewsPost` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "NewsPost_newsIdentifier_key" ON "NewsPost"("newsIdentifier");
