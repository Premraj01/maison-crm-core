-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "portrait" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tag" VARCHAR(32);
