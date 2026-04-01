/**
 * Azure Blob configuration (App Service env vars or Key Vault references).
 */
export function isBlobStorageConfigured(): boolean {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  const name = process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim();
  const key = process.env.AZURE_STORAGE_ACCOUNT_KEY?.trim();
  return Boolean(conn || (name && key));
}

export function getBlobContainerName(): string {
  return process.env.AZURE_STORAGE_CONTAINER_NAME?.trim() || "course-assets";
}
