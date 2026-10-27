-- Hujjat heshteglari va Word hujjat sozlamalari (QR-kodsiz, kelishuvchilar ro‘yxati)
ALTER TABLE "documents" ADD COLUMN "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "documents" ADD COLUMN "withoutQr" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documents" ADD COLUMN "showApprovalList" BOOLEAN NOT NULL DEFAULT true;
