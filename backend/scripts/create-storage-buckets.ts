/**
 * Script to create Supabase Storage buckets
 * Run with: tsx backend/scripts/create-storage-buckets.ts
 */

import { getSupabaseClient } from "../src/shared/db/supabase";

const BUCKETS = [
  {
    name: "complaint-attachments",
    public: true,
    allowedMimeTypes: [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "audio/mpeg",
      "audio/mp4",
      "audio/ogg",
      "audio/webm",
      "audio/wav",
    ],
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
  },
  {
    name: "resident-documents",
    public: false,
    allowedMimeTypes: [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/pdf",
    ],
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
  },
];

async function createBuckets() {
  const supabase = getSupabaseClient();

  console.log("🚀 Creating Supabase Storage buckets...\n");

  for (const bucket of BUCKETS) {
    console.log(`📦 Creating bucket: ${bucket.name}`);
    console.log(`   Public: ${bucket.public}`);
    console.log(`   Max file size: ${bucket.fileSizeLimit / 1024 / 1024}MB`);

    try {
      // Check if bucket already exists
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();

      if (listError) {
        console.error(`   ❌ Error listing buckets: ${listError.message}`);
        continue;
      }

      const bucketExists = existingBuckets?.some((b) => b.name === bucket.name);

      if (bucketExists) {
        console.log(`   ⚠️  Bucket already exists, skipping...\n`);
        continue;
      }

      // Create bucket
      const { data, error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes,
      });

      if (error) {
        console.error(`   ❌ Error creating bucket: ${error.message}\n`);
        continue;
      }

      console.log(`   ✅ Bucket created successfully!\n`);
    } catch (error) {
      console.error(`   ❌ Unexpected error:`, error, "\n");
    }
  }

  console.log("✨ Done!\n");
  console.log("📝 Next steps:");
  console.log("   1. Go to Supabase Dashboard > Storage");
  console.log("   2. Configure bucket policies if needed");
  console.log("   3. Test file uploads from the application\n");
}

createBuckets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
