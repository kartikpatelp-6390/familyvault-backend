export class CreateFamilyMemberDto {
  name: string;
  gender?: string;
  dateOfBirth?: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  relation?: string;
  occupation?: string;
  education?: string;
  maritalStatus?: string;
  income?: number;
  metadata?: Record<string, any>;
  password?: string;
}