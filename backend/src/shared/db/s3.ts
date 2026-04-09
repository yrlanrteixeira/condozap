import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { config } from "../../config/env";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  s3Client = new S3Client({
    endpoint: config.AWS_S3_ENDPOINT,
    region: config.AWS_REGION || "auto",
    credentials: {
      accessKeyId: config.AWS_ACCESS_KEY_ID!,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });

  return s3Client;
}

export async function uploadFileToStorage({
  bucketName,
  filePath,
  fileBuffer,
  contentType,
}: {
  bucketName: string;
  filePath: string;
  fileBuffer: Buffer;
  contentType: string;
}): Promise<{ publicUrl: string }> {
  const client = getS3Client();
  const bucket = config.AWS_S3_BUCKET!;
  const key = `${bucketName}/${filePath}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );

  const publicUrl = `${config.AWS_S3_ENDPOINT}/${bucket}/${key}`;
  return { publicUrl };
}

export async function getObjectFromStorage({
  bucketName,
  filePath,
}: {
  bucketName: string;
  filePath: string;
}): Promise<{ data: Buffer; contentType: string }> {
  const client = getS3Client();
  const bucket = config.AWS_S3_BUCKET!;
  const key = `${bucketName}/${filePath}`;

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  const bodyBytes = await response.Body!.transformToByteArray();
  const contentType = response.ContentType || "application/octet-stream";

  return { data: Buffer.from(bodyBytes), contentType };
}

export async function deleteFileFromStorage({
  bucketName,
  filePath,
}: {
  bucketName: string;
  filePath: string;
}): Promise<void> {
  const client = getS3Client();
  const bucket = config.AWS_S3_BUCKET!;
  const key = `${bucketName}/${filePath}`;

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}
