-- CreateIndex
CREATE INDEX "Meme_isPublic_createdAt_idx" ON "Meme"("isPublic", "createdAt");

-- CreateIndex
CREATE INDEX "Meme_userId_createdAt_idx" ON "Meme"("userId", "createdAt");
