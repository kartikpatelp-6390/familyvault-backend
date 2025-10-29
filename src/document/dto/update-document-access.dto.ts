export class UpdateDocumentAccessDto {
  fileName?: string;
  accessType: 'private' | 'shared' | 'public';
  sharedWith?: string[];
  documentType?: string;
}
