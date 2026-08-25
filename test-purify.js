const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
console.log(DOMPurify.sanitize('<p>text</p>[QUEBRA]<p>text2</p>'));
