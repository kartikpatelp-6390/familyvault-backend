export class CreateBankAccountDto {
  memberId: string;
  accountHolderName: string;
  bankName: string;
  branchName?: string;
  ifsc?: string;
  accountNumber: string;
  accountType?: string;
  currency?: string;
  isPrimary?: boolean;
  verified?: boolean;
  status?: string;

  nominees?: {
    name: string;
    relation: string;
    dateOfBirth?: string;
    contactNumber?: string;
    sharePercentage?: number;
  }[];
}
