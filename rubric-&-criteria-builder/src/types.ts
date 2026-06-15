/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ResponseType {
  MULTIPLE_CHOICE = 'multiple_choice',
  SHORT_TEXT = 'short_text',
  LONG_TEXT = 'long_text',
  RATING_SCALE = 'rating_scale',
  YES_NO = 'yes_no',
}

export interface QuestionOption {
  id: string;
  text: string;
  points?: number;
}

export interface Question {
  id: string;
  text: string;
  type: ResponseType;
  options?: QuestionOption[]; // Used when type is MULTIPLE_CHOICE
  maxPoints: number; // Max points assigned to this question
  required: boolean;
}

export interface Criterion {
  id: string;
  title: string;
  description: string;
  code: string; // e.g., "C1"
  weightage: number; // e.g., 25%
  maxPoints: number; // e.g., 10 points
  questions: Question[];
  isExpanded?: boolean;
}

export interface Rubric {
  id: string;
  title: string;
  description: string;
  criteria: Criterion[];
}

export interface EvaluationResponse {
  questionId: string;
  score: number;
  comments?: string;
  selectedOptionId?: string;
  textValue?: string;
}
