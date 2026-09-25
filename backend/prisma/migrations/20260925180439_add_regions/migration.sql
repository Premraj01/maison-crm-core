-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "regionId" UUID;

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "regionId" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "regionId" UUID;

-- CreateTable
CREATE TABLE "regions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(12) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "orgId" UUID,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "regions_orgId_idx" ON "regions"("orgId");

-- CreateIndex
CREATE INDEX "leads_regionId_idx" ON "leads"("regionId");

-- CreateIndex
CREATE INDEX "properties_regionId_idx" ON "properties"("regionId");

-- CreateIndex
CREATE INDEX "users_regionId_idx" ON "users"("regionId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
