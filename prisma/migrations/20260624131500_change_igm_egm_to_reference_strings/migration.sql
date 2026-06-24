-- Store IGM and EGM as reference-number strings so leading zeros and identifier semantics are preserved.

ALTER TABLE "ChaJobAdditionalData"
ALTER COLUMN "importGeneralManifest" TYPE TEXT USING "importGeneralManifest"::TEXT,
ALTER COLUMN "exportGeneralManifest" TYPE TEXT USING "exportGeneralManifest"::TEXT;
