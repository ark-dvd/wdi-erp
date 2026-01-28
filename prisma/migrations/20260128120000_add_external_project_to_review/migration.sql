-- AlterTable: Make projectId optional and add externalProjectName
ALTER TABLE "IndividualReview" ALTER COLUMN "projectId" DROP NOT NULL;

-- AddColumn: External project name for projects not in system
ALTER TABLE "IndividualReview" ADD COLUMN "externalProjectName" TEXT;

-- CreateIndex: Index for queries by external project name
CREATE INDEX "IndividualReview_reviewerId_contactId_externalProjectName_idx" ON "IndividualReview"("reviewerId", "contactId", "externalProjectName");
