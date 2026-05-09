import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const MAGIC = Buffer.from("GPB1");
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

type SensitiveBlobMetadata = {
  contentType: string;
  fileName: string;
};

function getEncryptionKey() {
  const secret = process.env.BLOB_DOCUMENTS_ENCRYPTION_KEY?.trim();
  if (!secret) {
    throw new Error("Falta BLOB_DOCUMENTS_ENCRYPTION_KEY para cifrar documentos sensibles.");
  }
  return createHash("sha256").update(secret).digest();
}

function encodePayload(bytes: Buffer, metadata: SensitiveBlobMetadata) {
  const metadataBuffer = Buffer.from(JSON.stringify(metadata), "utf8");
  const metadataLength = Buffer.alloc(4);
  metadataLength.writeUInt32BE(metadataBuffer.length, 0);
  return Buffer.concat([metadataLength, metadataBuffer, bytes]);
}

function decodePayload(payload: Buffer) {
  if (payload.length < 4) {
    throw new Error("Payload sensible invalido.");
  }

  const metadataLength = payload.readUInt32BE(0);
  const metadataStart = 4;
  const metadataEnd = metadataStart + metadataLength;
  if (payload.length < metadataEnd) {
    throw new Error("Metadata de documento sensible incompleta.");
  }

  const metadata = JSON.parse(payload.subarray(metadataStart, metadataEnd).toString("utf8")) as SensitiveBlobMetadata;
  return {
    metadata,
    bytes: payload.subarray(metadataEnd),
  };
}

export async function encryptSensitiveFile(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const metadata: SensitiveBlobMetadata = {
    contentType: file.type || "application/octet-stream",
    fileName: file.name || "documento",
  };
  const payload = encodePayload(bytes, metadata);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([MAGIC, iv, authTag, encrypted]);
}

export function decryptSensitiveBlob(input: ArrayBuffer | Buffer) {
  const data = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const headerLength = MAGIC.length + IV_LENGTH + AUTH_TAG_LENGTH;
  if (data.length <= headerLength) {
    throw new Error("Documento sensible invalido.");
  }

  const magic = data.subarray(0, MAGIC.length);
  if (!magic.equals(MAGIC)) {
    throw new Error("Formato de documento sensible no reconocido.");
  }

  const ivStart = MAGIC.length;
  const ivEnd = ivStart + IV_LENGTH;
  const tagEnd = ivEnd + AUTH_TAG_LENGTH;

  const iv = data.subarray(ivStart, ivEnd);
  const authTag = data.subarray(ivEnd, tagEnd);
  const encrypted = data.subarray(tagEnd);

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  const { metadata, bytes } = decodePayload(decrypted);

  return {
    contentType: metadata.contentType || "application/octet-stream",
    fileName: metadata.fileName || "documento",
    bytes,
  };
}
