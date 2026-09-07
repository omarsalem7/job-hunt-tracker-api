import { Injectable } from '@nestjs/common';

@Injectable()
export class ApplicationsService {
  getList() {
    return [
      {
        id: 1,
        company: 'Application 1',
        role: 'Frontend Developer',
        stage: 'Interview',
        appliedDate: '2023-06-01',
      },
    ];
  }
}
