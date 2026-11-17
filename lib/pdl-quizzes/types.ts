export type Question = { id: string; prompt: string; options: string[] };
export type Quiz = { id: string; title: string; version: number; questions: Question[] };
export type Feedback = { id: string; prompt: string; selected: string; correct: string; explanation: string; isCorrect: boolean };
export type Result = { score: number; passed: boolean; feedback: Feedback[]; reflection: string };
