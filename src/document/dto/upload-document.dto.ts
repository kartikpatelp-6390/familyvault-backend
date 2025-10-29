export class UploadDocumentDto {
  fileName?: string;
  memberId?: string; // optional
  accessType?: 'private' | 'shared' | 'public';
  sharedWith?: string[];
  documentType?: string;
}
