import assert from 'node:assert/strict';
// @ts-expect-error Node executes this test directly with TypeScript stripping.
import { quizCatalog, gradeQuiz, publicQuiz } from '../lib/pdl-quizzes/catalog.ts';
for(const quiz of quizCatalog){
 assert.equal(quiz.questions.length,10);
 assert.equal(new Set(quiz.questions.map(q=>q.id)).size,10);
 const answers=Object.fromEntries(quiz.questions.map(q=>[q.id,q.answer]));
 assert.equal(gradeQuiz(quiz.id,answers).score,100);
 const eight={...answers,q1:(answers.q1+1)%4,q2:(answers.q2+1)%4};
 assert.equal(gradeQuiz(quiz.id,eight).score,80);assert.equal(gradeQuiz(quiz.id,eight).passed,true);
 assert.equal(gradeQuiz(quiz.id,{...eight,q3:(answers.q3+1)%4}).passed,false);
 assert.equal(gradeQuiz(quiz.id,Object.fromEntries(quiz.questions.map(q=>[q.id,(q.answer+1)%4]))).score,0);
 assert.throws(()=>gradeQuiz(quiz.id,{...answers,q1:'1'}));
 assert.throws(()=>gradeQuiz(quiz.id,{...answers,q1:9}));
 assert.throws(()=>gradeQuiz(quiz.id,{}));
 assert.throws(()=>gradeQuiz(quiz.id,{...answers,injected:0}));
 assert.throws(()=>gradeQuiz(quiz.id,answers,'x'.repeat(2001)));
 assert.equal(gradeQuiz(quiz.id,answers,'  Mi compromiso  ').reflection,'Mi compromiso');
 for(const q of publicQuiz(quiz.id)!.questions){assert.equal('answer' in q,false);assert.equal('explanation' in q,false);}
}
assert.equal(publicQuiz('unknown'),null);
assert.throws(()=>gradeQuiz('unknown',{}));
console.log('PDL: four quizzes, grading boundaries, malformed answers and public payload checks passed.');
