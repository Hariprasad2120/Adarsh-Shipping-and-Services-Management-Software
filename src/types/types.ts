/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Appraisal {
  id: string;
  employeeName: string;
  department: string;
  score: number; // 1 to 5
  reviewer: string;
  reviewDate: string;
  highs: string;
  lows: string;
  goals: string;
  status: 'Draft' | 'Under Review' | 'Completed';
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  dateJoined: string;
  workMode: 'Remote' | 'Hybrid' | 'On-site';
  status: 'Active' | 'On Leave' | 'Departed';
  email: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  workMode: 'Remote' | 'Hybrid' | 'On-site';
  status: 'On Time' | 'Late' | 'Absent';
}

export interface CRMLead {
  id: string;
  company: string;
  contactName: string;
  email: string;
  value: number; // in USD
  stage: 'Lead' | 'Contacted' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
  confidence: number; // 0 to 100
  notes: string;
  updatedAt: string;
}
