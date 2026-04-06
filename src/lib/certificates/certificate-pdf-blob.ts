/**
 * Certificate PDF persistence in Azure Blob (same container as course assets).
 * `Certificate.pdfUrl` stores the blob **name** (path within the container), e.g.
 * `certificates/{userId}/{certificateId}.pdf` — not a public URL.
 */

export function certificatePdfBlobName(userId: string, certificateId: string): string {
  return `certificates/${userId}/${certificateId}.pdf`;
}
