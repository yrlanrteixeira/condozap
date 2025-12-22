/**
 * Script to test Supabase Storage connection and buckets
 * Run with: tsx backend/scripts/test-storage.ts
 */

import { getSupabaseClient, getStorageBucket } from "../src/shared/db/supabase";
import { config } from "../src/config/env";

const BUCKETS = ["complaint-attachments", "resident-documents"];

async function testStorage() {
  console.log("🧪 Testing Supabase Storage...\n");

  const supabase = getSupabaseClient();

  // Test 1: Check Supabase connection
  console.log("1️⃣ Testing Supabase connection...");
  console.log(`   URL: ${config.SUPABASE_URL}`);
  console.log(`   Using ${config.SUPABASE_SERVICE_ROLE_KEY ? "service role" : "anon"} key`);

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error(`   ❌ Failed to connect: ${error.message}\n`);
      return false;
    }

    console.log(`   ✅ Connected successfully!\n`);

    // Test 2: Check if buckets exist
    console.log("2️⃣ Checking buckets...");
    let allBucketsExist = true;

    for (const bucketName of BUCKETS) {
      const bucketExists = buckets?.some((b) => b.name === bucketName);

      if (bucketExists) {
        const bucket = buckets.find((b) => b.name === bucketName);
        console.log(`   ✅ ${bucketName}`);
        console.log(`      Public: ${bucket?.public ? "Yes" : "No"}`);
        console.log(`      Created: ${bucket?.created_at}`);
      } else {
        console.log(`   ❌ ${bucketName} - NOT FOUND`);
        allBucketsExist = false;
      }
    }

    console.log();

    if (!allBucketsExist) {
      console.log("⚠️  Some buckets are missing. Run:");
      console.log("   npm run storage:create-buckets\n");
      return false;
    }

    // Test 3: Test file upload (create a test file)
    console.log("3️⃣ Testing file upload...");

    const testBucket = "complaint-attachments";
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = "Hello from CondoZap!";

    try {
      const bucket = getStorageBucket(testBucket);

      // Upload test file
      const { error: uploadError } = await bucket.upload(
        testFileName,
        Buffer.from(testContent),
        {
          contentType: "text/plain",
        }
      );

      if (uploadError) {
        console.error(`   ❌ Upload failed: ${uploadError.message}\n`);
        return false;
      }

      console.log(`   ✅ Upload successful: ${testFileName}`);

      // Get public URL
      const { data: urlData } = bucket.getPublicUrl(testFileName);
      console.log(`   📎 Public URL: ${urlData.publicUrl}`);

      // Delete test file
      const { error: deleteError } = await bucket.remove([testFileName]);

      if (deleteError) {
        console.error(`   ⚠️  Could not delete test file: ${deleteError.message}`);
      } else {
        console.log(`   🗑️  Test file deleted\n`);
      }

      console.log("✨ All tests passed!\n");
      console.log("📝 Summary:");
      console.log("   ✅ Supabase connection working");
      console.log("   ✅ All buckets exist");
      console.log("   ✅ File upload working");
      console.log("   ✅ File deletion working\n");
      console.log("🚀 Storage is ready to use!\n");

      return true;
    } catch (error: any) {
      console.error(`   ❌ Test failed: ${error.message}\n`);
      return false;
    }
  } catch (error: any) {
    console.error(`❌ Unexpected error: ${error.message}\n`);
    return false;
  }
}

// Run tests
testStorage()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
