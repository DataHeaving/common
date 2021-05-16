import * as storage from "@azure/storage-blob";
import * as id from "@azure/identity";
import * as common from "@data-heaving/common";

export type BlobClientOrInfo =
  | storage.BlockBlobClient
  | BlobClientConstructionInfo;

export interface BlobClientConstructionInfo {
  url: string;
  credential:
    | storage.StorageSharedKeyCredential
    | storage.AnonymousCredential
    | id.TokenCredential;
}

export function createObjectStorageFunctionality<TObject>(
  blobOrURL: BlobClientOrInfo,
): common.ObjectStorageFunctionality<TObject> {
  const blobClient =
    blobOrURL instanceof storage.BlockBlobClient
      ? blobOrURL
      : new storage.BlockBlobClient(blobOrURL.url, blobOrURL.credential);
  return {
    storageID: blobClient.url,
    readExistingData: () => blobClient.downloadToBuffer(),
    writeNewDataWhenDifferent: async (data) => {
      await blobClient.uploadData(Buffer.from(JSON.stringify(data)));
    },
  };
}

export const sanitizeForBlobPath = (str: string) =>
  str
    .replace(/[/ ]/gi, (badChar) => `¤${badChar.codePointAt(0)}`)
    .toLowerCase();
