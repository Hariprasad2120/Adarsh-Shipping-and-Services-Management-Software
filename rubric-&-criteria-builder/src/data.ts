/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Rubric, ResponseType } from './types';

export const PRESET_RUBRICS: Rubric[] = [
  {
    id: 'tech-code-review',
    title: 'Software Development Code Review Rubric',
    description: 'Rubric for assessing candidate repository submissions or engineering team pull requests based on industry-standard clean code principles, performance, and robustness.',
    criteria: [
      {
        id: 'c1-clean-code',
        title: 'Clean Code, Readability & Architecture',
        description: 'Evaluates the syntactic cleanliness, logical structure of modules, comments density, separation of concerns, and alignment with the language-specific style guides.',
        code: 'C1',
        weightage: 30,
        maxPoints: 10,
        isExpanded: true,
        questions: [
          {
            id: 'q1-1',
            text: 'Is the logic modular and properly decomposed to avoid monolithic methods?',
            type: ResponseType.RATING_SCALE,
            maxPoints: 5,
            required: true
          },
          {
            id: 'q1-2',
            text: 'Are names (variables, methods, classes) meaningful, descriptive, and cohesive?',
            type: ResponseType.YES_NO,
            maxPoints: 2,
            required: true
          },
          {
            id: 'q1-3',
            text: 'What major architecture or code smell, if any, is present?',
            type: ResponseType.MULTIPLE_CHOICE,
            options: [
              { id: 'opt1', text: 'No significant smells - Exceptional design', points: 3 },
              { id: 'opt2', text: 'Minor duplicate blocks or loose couplings', points: 2 },
              { id: 'opt3', text: 'God object classes or rigid dependency structures', points: 0 }
            ],
            maxPoints: 3,
            required: false
          }
        ]
      },
      {
        id: 'c2-robustness',
        title: 'Robustness & Error Resilience',
        description: 'Assesses exception handling, input validations, boundary assertions, fallback pathways, and quality of unit tests.',
        code: 'C2',
        weightage: 25,
        maxPoints: 10,
        isExpanded: false,
        questions: [
          {
            id: 'q2-1',
            text: 'How thoroughly are typical API errors and edge-cases caught and mitigated?',
            type: ResponseType.RATING_SCALE,
            maxPoints: 5,
            required: true
          },
          {
            id: 'q2-2',
            text: 'Are asynchronous promises properly guarded with try-catch blocks or native handlers?',
            type: ResponseType.YES_NO,
            maxPoints: 5,
            required: true
          }
        ]
      },
      {
        id: 'c3-performance',
        title: 'Performance Optimization & Efficiency',
        description: 'Evaluates processor overhead, memory footprint, complexity of key algorithms (O(n)), database query patterns, and resource management.',
        code: 'C3',
        weightage: 25,
        maxPoints: 10,
        isExpanded: false,
        questions: [
          {
            id: 'q3-1',
            text: 'Does the application execute rendering/calculations without blocking the UI thread?',
            type: ResponseType.YES_NO,
            maxPoints: 5,
            required: true
          },
          {
            id: 'q3-2',
            text: 'Efficiency rating of algorithms (minimizing iterations, caching, proper database queries):',
            type: ResponseType.RATING_SCALE,
            maxPoints: 5,
            required: true
          }
        ]
      },
      {
        id: 'c4-security',
        title: 'Security Compliance',
        description: 'Scrutinizes vulnerability risks, sanitization of parameters, handling of secrets, and token transport measures.',
        code: 'C4',
        weightage: 20,
        maxPoints: 10,
        isExpanded: false,
        questions: [
          {
            id: 'q4-1',
            text: 'Are environment configurations, API tokens, and secret identifiers guarded off-repository?',
            type: ResponseType.YES_NO,
            maxPoints: 5,
            required: true
          },
          {
            id: 'q4-2',
            text: 'Rate the input sanitization to block Injection vectors (XSS, SQLi, CSRF):',
            type: ResponseType.RATING_SCALE,
            maxPoints: 5,
            required: true
          }
        ]
      }
    ]
  },
  {
    id: 'ux-ui-critique',
    title: 'UI/UX Design Evaluation Rubric',
    description: 'A rubric for reviewing frontend visual compositions, user journeys, typography hierarchies, and layout ergonomics.',
    criteria: [
      {
        id: 'crit-u1',
        title: 'Visual Quality & Hierarchy',
        description: 'Inspects general aesthetic choices, font pairing, size contrast, margins rhythm, and use of primary brand colors.',
        code: 'U1',
        weightage: 40,
        maxPoints: 10,
        isExpanded: true,
        questions: [
          {
            id: 'qu1-1',
            text: 'Is typography scaled and weighted appropriately to guide user focus?',
            type: ResponseType.RATING_SCALE,
            maxPoints: 5,
            required: true
          },
          {
            id: 'qu1-2',
            text: 'Evaluate layout density status:',
            type: ResponseType.MULTIPLE_CHOICE,
            options: [
              { id: 'uopt1', text: 'Perfect balance of breathing space & density', points: 5 },
              { id: 'uopt2', text: 'Slightly cramped or excessive empty gaps', points: 3 },
              { id: 'uopt3', text: 'Disorganized grid, overlapping blocks', points: 1 }
            ],
            maxPoints: 5,
            required: true
          }
        ]
      },
      {
        id: 'crit-u2',
        title: 'Interaction Ergonomics',
        description: 'Assesses target sizes, loading feedback, transition smoothness, dynamic state prompts, and responsive adaptations.',
        code: 'U2',
        weightage: 40,
        maxPoints: 10,
        isExpanded: false,
        questions: [
          {
            id: 'qu2-1',
            text: 'Are touch targets/buttons easily clickable across all visual screens (>44px)?',
            type: ResponseType.YES_NO,
            maxPoints: 5,
            required: true
          },
          {
            id: 'qu2-2',
            text: 'Rate the fluid response of micro-animations and transition cues:',
            type: ResponseType.RATING_SCALE,
            maxPoints: 5,
            required: false
          }
        ]
      },
      {
        id: 'crit-u3',
        title: 'Accessibility Metrics (A11y)',
        description: 'Assesses screen reader compatibility, keyboard focus traps, styling of focus states, and minimum contrast checks.',
        code: 'U3',
        weightage: 20,
        maxPoints: 10,
        isExpanded: false,
        questions: [
          {
            id: 'qu3-1',
            text: 'Does all text clear the minimum contrast threshold (4.5:1 ratio)?',
            type: ResponseType.YES_NO,
            maxPoints: 5,
            required: true
          },
          {
            id: 'qu3-2',
            text: 'How operable is the form navigation strictly via the TAB key?',
            type: ResponseType.RATING_SCALE,
            maxPoints: 5,
            required: true
          }
        ]
      }
    ]
  },
  {
    id: 'academic-thesis',
    title: 'Research Thesis Defense grading rubric',
    description: 'Rubric used by university faculties to evaluate masters theses, including structure of arguments, literature citation, and experimental rigor.',
    criteria: [
      {
        id: 'crit-t1',
        title: 'Problem Definition & Literature Review',
        description: 'Assesses clarity of hypotheses, description of system context, and exhaustive citation of prior foundational work.',
        code: 'T1',
        weightage: 30,
        maxPoints: 10,
        isExpanded: true,
        questions: [
          {
            id: 'qt1-1',
            text: 'Is the core research gap concisely identified in the introduction?',
            type: ResponseType.YES_NO,
            maxPoints: 5,
            required: true
          },
          {
            id: 'qt1-2',
            text: 'Quality and recency of literature analysis:',
            type: ResponseType.RATING_SCALE,
            maxPoints: 5,
            required: true
          }
        ]
      },
      {
        id: 'crit-t2',
        title: 'Methodology & Analytical Rigor',
        description: 'Assesses reproducibility of test suites, integrity of variable controls, and alignment of proof to conclusions.',
        code: 'T2',
        weightage: 40,
        maxPoints: 10,
        isExpanded: true,
        questions: [
          {
            id: 'qt2-1',
            text: 'Are mathematical arguments or algorithmic formulas mathematically correct?',
            type: ResponseType.YES_NO,
            maxPoints: 5,
            required: true
          },
          {
            id: 'qt2-2',
            text: 'Rate the validity and description of the empirical control benchmarks:',
            type: ResponseType.RATING_SCALE,
            maxPoints: 5,
            required: true
          }
        ]
      },
      {
        id: 'crit-t3',
        title: 'Presentation & Defense Delivery',
        description: 'Assesses voice quality, pacing, clarity of slide deck visuals, response agility during Q&A panel, and defense conviction.',
        code: 'T3',
        weightage: 30,
        maxPoints: 10,
        isExpanded: false,
        questions: [
          {
            id: 'qt3-1',
            text: 'How clearly and directly did the candidate address opposing thesis views?',
            type: ResponseType.RATING_SCALE,
            maxPoints: 5,
            required: true
          },
          {
            id: 'qt3-2',
            text: 'Did the presentation adhere strictly to the 20-minute ceiling?',
            type: ResponseType.YES_NO,
            maxPoints: 5,
            required: true
          }
        ]
      }
    ]
  }
];
