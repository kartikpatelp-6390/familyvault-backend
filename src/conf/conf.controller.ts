import { Controller, Get } from '@nestjs/common';

@Controller('config')
export class ConfController {
  @Get('family-options')
  getFamilyOptions() {
    return {
      genders: ['Male', 'Female', 'Other'],
      relations: [
        'Self',
        'Father',
        'Mother',
        'Son',
        'Daughter',
        'Brother',
        'Sister',
        'Grandfather',
        'Grandmother',
        'Uncle',
        'Aunt',
        'Cousin',
        'Wife',
        'Other'
      ],
      maritalStatuses: ['Single', 'Married', 'Divorced', 'Widowed'],
      educations: [
        'High School',
        'Graduate',
        'Post Graduate',
        'PhD',
        'Other'
      ],
      documentTypes: [
        'Aadhar Card',
        'PAN Card',
        'Driving Licence',
        'Passport',
        'Electricity Bill',
        'Other'
      ]
    };
  }
}
