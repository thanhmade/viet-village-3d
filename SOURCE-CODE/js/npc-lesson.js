(function(global){
 'use strict';
 function valid(l){return !!l&&typeof l.id==='string'&&['title','knowledge','question','explanation'].every(k=>typeof l[k]==='string'&&l[k].length>0)&&Array.isArray(l.answers)&&l.answers.length>=2&&l.answers.every(a=>typeof a==='string'&&a.length>0)&&Number.isInteger(l.correctIndex)&&l.correctIndex>=0&&l.correctIndex<l.answers.length;}
 global.resolveVillageLesson=function(definition,banks={}){
  const row=banks[definition.bank]?.[definition.index];
  const existing=Array.isArray(row)?{id:definition.bank+':'+definition.index,title:row[0],knowledge:[row[5],row[6]].join(' '),question:row[2],answers:row[3],correctIndex:row[4],explanation:row[6],source:'existing-bank'}:null;
  const lesson=valid(existing)?existing:definition.fallback;
  if(!valid(lesson))throw new Error('Bài học thiếu câu hỏi hoặc đáp án hợp lệ.');
  return Object.freeze({...lesson,answers:Object.freeze([...lesson.answers])});
 };
 // Practice within one conversation, with no grades, rewards or database writes.
 global.createVillageLessonSession=function(lesson){
  if(!valid(lesson))throw new Error('Bài học không hợp lệ.');
  let read=false,correct=false,completed=false,feedback='';
  function complete(events){if(read&&correct&&!completed){completed=true;events.push('clap');}return events;}
  return Object.freeze({lesson,
   study(){read=true;return complete([]);},
   answer(index){
    if(correct||!Number.isInteger(index)||index<0||index>=lesson.answers.length)return [];
    if(index!==lesson.correctIndex){feedback='Chưa đúng. '+lesson.explanation+' Con thử lại nhé.';return [];}
    correct=true;feedback='Chính xác! '+lesson.explanation;return complete(['agree']);
   },
   get state(){return Object.freeze({read,correct,completed,feedback});}
  });
 };
})(window);
