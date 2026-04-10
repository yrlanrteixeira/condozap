import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from '../../config/env'

/**
 * Supabase client instance for server-side operations
 * 
 * This client uses the service role key (if available) for admin operations,
 * or falls back to the anon key for basic operations.
 */
let supabaseClient: SupabaseClient | null = null

/**
 * Initialize Supabase client
 * @returns {SupabaseClient} Configured Supabase client
 */
export const getSupabaseClient = (): SupabaseClient => {
  if (supabaseClient) {
    return supabaseClient
  }

  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required when using Supabase storage')
  }

  // Use service role key for admin operations if available, otherwise use anon key
  const supabaseKey = config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY

  supabaseClient = createClient(config.SUPABASE_URL, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  return supabaseClient
}

/**
 * Create a Supabase client with a specific user's JWT token
 * Useful for operations that need to respect Row Level Security (RLS)
 * 
 * @param {string} accessToken - User's JWT token
 * @returns {SupabaseClient} Supabase client configured with user token
 */
export const getSupabaseClientWithToken = (accessToken: string): SupabaseClient => {
  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required when using Supabase')
  }

  return createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

/**
 * Get Supabase Storage bucket client
 * @param {string} bucketName - Name of the storage bucket
 * @returns Storage bucket client
 */
export const getStorageBucket = (bucketName: string) => {
  const client = getSupabaseClient()
  return client.storage.from(bucketName)
}

/**
 * Upload file to Supabase Storage
 * 
 * @param {Object} params - Upload parameters
 * @param {string} params.bucketName - Storage bucket name
 * @param {string} params.filePath - Path where file will be stored
 * @param {Buffer} params.fileBuffer - File content as Buffer
 * @param {string} params.contentType - MIME type of the file
 * @returns {Promise<{publicUrl: string}>} Public URL of uploaded file
 */
export const uploadFileToStorage = async ({
  bucketName,
  filePath,
  fileBuffer,
  contentType,
}: {
  bucketName: string
  filePath: string
  fileBuffer: Buffer
  contentType: string
}): Promise<{ publicUrl: string }> => {
  const bucket = getStorageBucket(bucketName)

  const { error } = await bucket.upload(filePath, fileBuffer, {
    contentType,
    upsert: true,
  })

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`)
  }

  const { data } = bucket.getPublicUrl(filePath)

  return { publicUrl: data.publicUrl }
}

/**
 * Delete file from Supabase Storage
 * 
 * @param {Object} params - Delete parameters
 * @param {string} params.bucketName - Storage bucket name
 * @param {string} params.filePath - Path of file to delete
 */
export const deleteFileFromStorage = async ({
  bucketName,
  filePath,
}: {
  bucketName: string
  filePath: string
}): Promise<void> => {
  const bucket = getStorageBucket(bucketName)

  const { error } = await bucket.remove([filePath])

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`)
  }
}

/**
 * Get file from Supabase Storage
 * 
 * @param {Object} params - Get parameters
 * @param {string} params.bucketName - Storage bucket name
 * @param {string} params.filePath - Path of file to get
 * @returns {Promise<{data: Buffer, contentType: string}>} File data and content type
 */
export const getFileFromStorage = async ({
  bucketName,
  filePath,
}: {
  bucketName: string
  filePath: string
}): Promise<{ data: Buffer; contentType: string }> => {
  const bucket = getStorageBucket(bucketName)

  const { data, error } = await bucket.download(filePath)

  if (error) {
    throw new Error(`Failed to download file: ${error.message}`)
  }

  // Get content type from file extension
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const contentTypeMap: Record<string, string> = {
    'webm': 'audio/webm',
    'mp3': 'audio/mpeg',
    'mp4': 'audio/mp4',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
  }
  const contentType = contentTypeMap[ext] || 'application/octet-stream'

  // Convert ReadableStream to Buffer - Supabase returns data as a Blob with body property
  const blob = data as unknown as { body: { getReader: () => ReadableStreamDefaultReader<Uint8Array> } };
  const chunks: Uint8Array[] = []
  const reader = blob.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const buffer = Buffer.concat(chunks)

  return { data: buffer, contentType }
}



