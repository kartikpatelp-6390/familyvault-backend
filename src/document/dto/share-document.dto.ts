export class ShareDocumentDto {
  accessType: 'private' | 'shared' | 'public';
  sharedWith?: string[]; // memberIds (only used if type = shared)
}