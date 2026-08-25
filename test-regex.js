const batchTemplateIds = ['tpl-1', 'tpl-2'];
const collaboratorsData = [1,2,3,4,5];
const numTerms = batchTemplateIds.length;
const numCollabs = collaboratorsData.length;
let printTitle = `${numTerms} TERMO${numTerms > 1 ? 'S' : ''} - ${numCollabs} COLABORADOR${numCollabs > 1 ? 'ES' : ''}`;
console.log(printTitle);
