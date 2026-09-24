-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "status" VARCHAR(16) NOT NULL DEFAULT 'Available';

-- CreateIndex
CREATE INDEX "properties_status_idx" ON "properties"("status");
