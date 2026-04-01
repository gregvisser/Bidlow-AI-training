import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { getBlobContainerName, isBlobStorageConfigured } from "@/lib/azure/blob-config";

export function getBlobServiceClient(): BlobServiceClient {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (conn) {
    return BlobServiceClient.fromConnectionString(conn);
  }
  const name = process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim();
  const key = process.env.AZURE_STORAGE_ACCOUNT_KEY?.trim();
  if (!name || !key) {
    throw new Error("Azure Storage is not configured");
  }
  const cred = new StorageSharedKeyCredential(name, key);
  return new BlobServiceClient(`https://${name}.blob.core.windows.net`, cred);
}

export function publicBlobUrl(blobName: string): string {
  const publicBase = process.env.AZURE_STORAGE_PUBLIC_BASE_URL?.trim();
  const pathEncoded = blobName.split("/").map(encodeURIComponent).join("/");
  if (publicBase) {
    return `${publicBase.replace(/\/$/, "")}/${pathEncoded}`;
  }
  const name = process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim();
  const container = getBlobContainerName();
  if (!name) {
    throw new Error("AZURE_STORAGE_ACCOUNT_NAME is required for public URLs (or set AZURE_STORAGE_PUBLIC_BASE_URL)");
  }
  return `https://${name}.blob.core.windows.net/${encodeURIComponent(container)}/${pathEncoded}`;
}

export async function ensureContainerExists(): Promise<void> {
  const client = getBlobServiceClient();
  const container = client.getContainerClient(getBlobContainerName());
  await container.createIfNotExists({
    access: "blob",
  });
}

export async function uploadBufferToBlob(opts: {
  blobName: string;
  buffer: Buffer;
  contentType: string;
}): Promise<{ url: string; blobName: string }> {
  const client = getBlobServiceClient();
  const container = client.getContainerClient(getBlobContainerName());
  const block = container.getBlockBlobClient(opts.blobName);
  await block.uploadData(opts.buffer, {
    blobHTTPHeaders: { blobContentType: opts.contentType },
  });
  return { blobName: opts.blobName, url: publicBlobUrl(opts.blobName) };
}

export async function deleteBlobIfExists(blobName: string): Promise<void> {
  const client = getBlobServiceClient();
  const container = client.getContainerClient(getBlobContainerName());
  const block = container.getBlockBlobClient(blobName);
  await block.deleteIfExists();
}

export { isBlobStorageConfigured };
