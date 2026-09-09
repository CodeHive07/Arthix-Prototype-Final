import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const allowedTypes = new Set(['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const maxBytes = 20 * 1024 * 1024;

function client() {
  if (!process.env.S3_BUCKET || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY || !process.env.S3_REGION) return null;
  return new S3Client({ region: process.env.S3_REGION, endpoint: process.env.S3_ENDPOINT, forcePathStyle: Boolean(process.env.S3_ENDPOINT), credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY } });
}

export function validateUpload(input: { filename?: unknown; contentType?: unknown; size?: unknown }) {
  const filename = typeof input.filename === 'string' ? input.filename.trim() : '';
  const contentType = typeof input.contentType === 'string' ? input.contentType : '';
  const size = typeof input.size === 'number' ? input.size : 0;
  if (!filename || filename.length > 180 || /[\\/\0]/.test(filename)) return 'A safe filename is required.';
  if (!allowedTypes.has(contentType)) return 'Only PDF, DOC, DOCX and text files are accepted.';
  if (!Number.isInteger(size) || size <= 0 || size > maxBytes) return 'File size must be between 1 byte and 20 MB.';
  return null;
}

export async function createUploadUrl(caseId: string, filename: string, contentType: string, size: number) {
  const storage = client();
  if (!storage || !process.env.S3_BUCKET) return null;
  const key = `cases/${caseId}/documents/${crypto.randomUUID()}-${filename}`;
  const command = new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, ContentType: contentType, ContentLength: size, ServerSideEncryption: 'AES256' });
  return { key, url: await getSignedUrl(storage, command, { expiresIn: 300 }) };
}
