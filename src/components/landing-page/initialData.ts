/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Appraisal, Employee, AttendanceRecord, CRMLead } from '../../types/types';

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-101',
    name: 'Sarah Jenkins',
    role: 'Principal Systems Architect',
    department: 'Engineering',
    dateJoined: '2023-03-15',
    workMode: 'Remote',
    status: 'Active',
    email: 'sarah.j@monolith.com',
  },
  {
    id: 'emp-102',
    name: 'Michael Chen',
    role: 'Senior Product Designer',
    department: 'Design',
    dateJoined: '2024-01-10',
    workMode: 'Hybrid',
    status: 'Active',
    email: 'm.chen@monolith.com',
  },
  {
    id: 'emp-103',
    name: 'Amara Okafor',
    role: 'VP of Growth & Enterprise Strategy',
    department: 'Sales',
    dateJoined: '2021-11-01',
    workMode: 'On-site',
    status: 'Active',
    email: 'amara.o@monolith.com',
  },
  {
    id: 'emp-104',
    name: 'David Vane',
    role: 'Lead Devops Engineer',
    department: 'Engineering',
    dateJoined: '2022-08-20',
    workMode: 'Remote',
    status: 'On Leave',
    email: 'd.vane@monolith.com',
  },
  {
    id: 'emp-105',
    name: 'Elena Rostova',
    role: 'Brand Communications Manager',
    department: 'Marketing',
    dateJoined: '2023-09-02',
    workMode: 'Hybrid',
    status: 'Active',
    email: 'e.rostova@monolith.com',
  }
];

export const INITIAL_APPRAISALS: Appraisal[] = [
  {
    id: 'apr-201',
    employeeName: 'Sarah Jenkins',
    department: 'Engineering',
    score: 5,
    reviewer: 'Marcus Sterling',
    reviewDate: '2026-05-12',
    highs: 'Successfully built the serverless state transition system. Showed superb leadership and pure tactical execution without losing speed.',
    lows: 'Could delegate minor code updates more frequently to junior engineers.',
    goals: 'Establish automated continuous validation across all microservice boundaries.',
    status: 'Completed',
  },
  {
    id: 'apr-202',
    employeeName: 'Michael Chen',
    department: 'Design',
    score: 4,
    reviewer: 'Elena Garcia',
    reviewDate: '2026-05-18',
    highs: 'Created a high-fidelity visual system that reduced customer onboarding friction by 40%. Implemented responsive token structure.',
    lows: 'Struggled to provide initial design specs ahead of strict engineering sprints.',
    goals: 'Deliver complete component token standards and pair design frameworks.',
    status: 'Under Review',
  },
  {
    id: 'apr-203',
    employeeName: 'Elena Rostova',
    department: 'Marketing',
    score: 4,
    reviewer: 'Amara Okafor',
    reviewDate: '2026-05-24',
    highs: 'Spearheaded the Monolith structural branding launch. Excellent outreach strategy with zero waste.',
    lows: 'Needs closer alignment with product team timelines.',
    goals: 'Double user trial activation rate within next quarter.',
    status: 'Draft',
  }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-301',
    employeeId: 'emp-101',
    employeeName: 'Sarah Jenkins',
    date: '2026-06-04',
    clockIn: '08:45 AM',
    clockOut: '05:30 PM',
    workMode: 'Remote',
    status: 'On Time',
  },
  {
    id: 'att-302',
    employeeId: 'emp-103',
    employeeName: 'Amara Okafor',
    date: '2026-06-04',
    clockIn: '09:12 AM',
    clockOut: null,
    workMode: 'On-site',
    status: 'Late',
  },
  {
    id: 'att-303',
    employeeId: 'emp-102',
    employeeName: 'Michael Chen',
    date: '2026-06-04',
    clockIn: '08:55 AM',
    clockOut: '05:00 PM',
    workMode: 'Hybrid',
    status: 'On Time',
  }
];

export const INITIAL_CRM_LEADS: CRMLead[] = [
  {
    id: 'cld-401',
    company: 'Apex Logistics Inc.',
    contactName: 'James Caan',
    email: 'j.caan@apex.io',
    value: 85000,
    stage: 'Negotiation',
    confidence: 80,
    notes: 'Requested advanced security rules and hybrid integration support. Contract draft generated.',
    updatedAt: '2026-06-03',
  },
  {
    id: 'cld-402',
    company: 'Quantum Wealth Corp',
    contactName: 'Veronique Dubois',
    email: 'v.dubois@quantumwealth.com',
    value: 120000,
    stage: 'Proposal',
    confidence: 65,
    notes: 'Pitch went exceptionally well. Sent full product architecture tour proposal.',
    updatedAt: '2026-06-02',
  },
  {
    id: 'cld-403',
    company: 'Sovereign Heavy Industries',
    contactName: 'Lars Thorne',
    email: 'l.thorne@sovereign.net',
    value: 230000,
    stage: 'Won',
    confidence: 100,
    notes: 'Annual license agreement signed. Core onboarding scheduled for June 15.',
    updatedAt: '2026-06-04',
  },
  {
    id: 'cld-404',
    company: 'Verdant Ventures LLC',
    contactName: 'Maya Patel',
    email: 'm.patel@verdant.co',
    value: 45000,
    stage: 'Contacted',
    confidence: 30,
    notes: 'Initial introductory discussion complete. Looking to streamline decentralized operational structures.',
    updatedAt: '2026-05-30',
  }
];
