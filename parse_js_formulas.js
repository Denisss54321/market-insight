// Поиск формул артефактов в коде калькулятора sctools.tech
const fs = require('fs');

// Читаем файл с кодом
const code = fs.readFileSync('КАК_ПОЛУЧИТЬ_ФОРМУЛЫ.md', 'utf8');

// Ищем ключевые паттерны
const patterns = [
    /freshness\s*[=:]\s*[^,;\n]+/gi,
    /quality\s*[=:]\s*[^,;\n]+/gi,
    /charge\s*[=:]\s*[^,;\n]+/gi,
    /artifact.*?bonus.*?[=:].*?[^,;\n]+/gi,
    /modifier.*?[=:].*?[^,;\n]+/gi,
    /multiplier.*?[=:].*?[^,;\n]+/gi
];

console.log("=== ПОИСК ФОРМУЛ В КОДЕ ===\n");

let foundFormulas = [];

patterns.forEach((pattern, index) => {
    const matches = code.match(pattern);
    if (matches) {
        matches.forEach(match => {
            if (match.length < 200) {  // Ограничиваем длину
                foundFormulas.push(match);
            }
        });
    }
});

if (foundFormulas.length > 0) {
    console.log("Найдены потенциальные формулы/переменные:\n");
    foundFormulas.slice(0, 30).forEach((formula, i) => {
        console.log(`${i + 1}. ${formula}`);
    });
} else {
    console.log("Прямых формул не найдено. Код, вероятно, обфусцирован.");
    console.log("\nРекомендации:");
    console.log("1. Используйте браузерные DevTools на сайте sctools.tech/calc");
    console.log("2. Ищите функции расчета в разделе Sources");
    console.log("3. Обратитесь к разработчикам через Discord/Telegram");
}

// Дополнительный поиск - ищем числа рядом с ключевыми словами
console.log("\n=== ПОИСК ЧИСЛОВЫХ КОНСТАНТ ===\n");

const numberPatterns = [
    /freshness.*?(\d+\.?\d*)/gi,
    /quality.*?(\d+\.?\d*)/gi,
    /charge.*?(\d+\.?\d*)/gi,
    /artifact.*?(\d+\.?\d*)/gi
];

numberPatterns.forEach(pattern => {
    const matches = code.match(pattern);
    if (matches && matches.length > 0) {
        console.log("Найдено:");
        matches.slice(0, 5).forEach(m => console.log(`  ${m}`));
    }
});