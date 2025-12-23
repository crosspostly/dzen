const fs = require('fs');
const path = require('path');

const articlesDir = './articles';
const womenDir = './articles/women-35-60';

// Рекурсивно ищет все .txt файлы
function findTxtFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findTxtFiles(filePath, fileList);
    } else if (file.endsWith('.txt')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Генерирует описание через Gemini API
async function generateDescription(content) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ GEMINI_API_KEY не установлен, используем fallback...');
    // Fallback: первые 150 символов
    return content.substring(0, 150).replace(/\n/g, ' ').replace(/"/g, '\\'') + '...';
  }
  
  try {
    // Берёшь первые 500 символов для контекста
    const context = content.substring(0, 500);
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Ты пишешь интригующие описания для Яндекс.Дзена. 
СТАТЬЯ:
${context}

Напиши интригующее описание в стиле Дзена (150-200 символов). Начни с глагола или вопроса. БЕЗ кавычек!
Пример: "Раскрыть секреты, которые хранит каждый успешный человек"
ТОЛЬКО ОПИСАНИЕ, БЕЗ ДОП ТЕКСТА!`
          }]
        }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const description = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!description) {
      throw new Error('No description in response');
    }
    
    return description.replace(/"/g, '\\'');
  } catch (err) {
    console.warn(`⚠️ Ошибка Gemini: ${err.message}, используем fallback...`);
    return content.substring(0, 150).replace(/\n/g, ' ').replace(/"/g, '\\'') + '...';
  }
}

// Очищает имя файла от timestamp
function cleanFileName(fileName) {
  // Удаляет последний timestamp (обычно в конце: --1766247250373)
  return fileName.replace(/--\d+$/, '');
}

// Основная логика конвертации
async function convertTxtToMd() {
  const txtFiles = findTxtFiles(womenDir);
  
  if (txtFiles.length === 0) {
    console.log('❌ Не найдено .txt файлов для конвертации');
    return;
  }
  
  console.log(`📂 Найдено ${txtFiles.length} .txt файлов\n`);
  
  for (const txtPath of txtFiles) {
    try {
      console.log(`📄 Обработка: ${path.relative('.', txtPath)}`);
      
      // Читаешь текстовый файл
      const content = fs.readFileSync(txtPath, 'utf-8').trim();
      const lines = content.split('\n');
      
      // Первая строка = title
      const title = lines[0].trim();
      
      // Остальное = body
      const body = lines.slice(1).join('\n').trim();
      
      // Имя файла (без расширения и timestamp)
      const fileName = path.parse(txtPath).name;
      const cleanName = cleanFileName(fileName);
      
      // Получаешь дату из пути файла (articles/women-35-60/2025-12-20/...)
      const pathParts = txtPath.split(path.sep);
      const dateDir = pathParts.find(p => /\d{4}-\d{2}-\d{2}/.test(p)); // 2025-12-20
      
      if (!dateDir) {
        console.error(`❌ Не удалось определить дату для ${txtPath}`);
        continue;
      }
      
      const [year, month, day] = dateDir.split('-');
      const date = `${year}-${month}-${day}`;
      
      // Найди соответствующее изображение
      const dirPath = path.dirname(txtPath);
      const dirFiles = fs.readdirSync(dirPath);
      const imageFile = dirFiles.find(f => 
        f.startsWith(fileName) && 
        (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg'))
      );
      const imageName = imageFile ? cleanFileName(path.parse(imageFile).name) + path.parse(imageFile).ext : `${cleanName}.jpg`;
      
      // ГЕНЕРИРУЕШЬ ОПИСАНИЕ через Gemini
      console.log('  ⏳ Генерируем описание...');
      const description = await generateDescription(body);
      console.log(`  ✅ Описание: "${description.substring(0, 50)}..."`);
      
      // Создаёшь front-matter
      const frontMatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${date}
description: "${description}"
image: "${imageName}"
category: "news"
---

`;
      
      // Новый .md контент
      const mdContent = frontMatter + body;
      
      // Создаёшь папку для нового файла (articles/2025/12/20/)
      const newDir = path.join('./articles', year, month, day);
      if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
        console.log(`  📁 Создана папка: ${newDir}`);
      }
      
      // Путь для нового файла
      const mdPath = path.join(newDir, `${cleanName}.md`);
      
      // Пишешь .md файл
      fs.writeFileSync(mdPath, mdContent, 'utf-8');
      console.log(`  ✅ Создан: ${path.relative('.', mdPath)}`);
      
      // Переместить изображение если оно есть
      if (imageFile) {
        const oldImagePath = path.join(dirPath, imageFile);
        const newImagePath = path.join(newDir, imageName);
        fs.copyFileSync(oldImagePath, newImagePath);
        console.log(`  🖼️ Скопировано: ${path.relative('.', newImagePath)}`);
      }
      
    } catch (err) {
      console.error(`❌ Ошибка при обработке ${txtPath}:`, err.message);
    }
  }
  
  console.log(`\n✅ Конвертация завершена!`);
  console.log(`📊 Обработано файлов: ${txtFiles.length}`);
}

// Запуск
convertTxtToMd().catch(console.error);
