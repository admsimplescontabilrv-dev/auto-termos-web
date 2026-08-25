const str = "<p>texto 1</p><div>[QUEBRA]</div><p>texto 2</p>";
const cleaned = str.replace(/<[^>]+>\s*\[QUEBRA\]\s*<\/[^>]+>/gi, '[QUEBRA]');
console.log(cleaned);
