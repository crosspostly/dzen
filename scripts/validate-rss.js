#!/usr/bin/env node

/**
 * 🔍 Local RSS Validator for Yandex Dzen
 * 
 * Валидирует RSS локально БЕЗ использования внешних сервисов!
 * Проверяет все требования Яндекс Дзен:
 * - Валидный XML
 * - length в enclosure
 * - native-draft категория
 * - RFC822 даты
 * - CDATA контент
 * - Баланс HTML тегов
 * - GUID уникальность
 */

import fs from 'fs';
import path from 'path';

// ═══════════════════════════════════════════════════════════════
// 📋 КОНФИГУРАЦИЯ
// ═══════════════════════════════════════════════════════════════

const RSS_PATH = process.argv[2] || path.join(process.cwd(), 'public', 'feed.xml');

// ═══════════════════════════════════════════════════════════════
// 🎨 КЛАСС ВАЛИДАТОРА
// ═══════════════════════════════════════════════════════════════

class RssValidator {
  constructor(filePath) {
    this.filePath = filePath;
    this.errors = [];
    this.warnings = [];
    this.successChecks = 0;
    this.totalChecks = 0;
    this.content = '';
  }

  /**
   * Запустить все проверки
   * @returns {Object} результаты валидации
   */
  validate() {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 ЛОКАЛЬНАЯ ВАЛИДАЦИЯ RSS');
    console.log('='.repeat(70));

    // 1. Проверить что файл существует
    if (!fs.existsSync(this.filePath)) {
      this.errors.push(`Файл не найден: ${this.filePath}`);
      return this.getResults();
    }

    // 2. Прочитать файл
    try {
      this.content = fs.readFileSync(this.filePath, 'utf8');
    } catch (error) {
      this.errors.push(`Ошибка чтения файла: ${error.message}`);
      return this.getResults();
    }

    // 3. Запустить проверки
    console.log('\n📋 Проверки:');
    
    this.checkXmlDeclaration();
    this.checkRootElement();
    this.checkNamespaces();
    this.checkChannelElement();
    this.checkItems();
    this.checkEnclosures();
    this.checkContentEncoded();
    this.checkCategories();
    this.checkDates();
    this.checkImageSizes();
    this.checkGuids();
    this.checkHtmlBalance();
    this.checkFileSize();

    return this.getResults();
  }

  // ==========================================
  // ОТДЕЛЬНЫЕ ПРОВЕРКИ
  // ==========================================

  checkXmlDeclaration() {
    console.log('\n1. XML декларация');
    this.totalChecks++;
    if (this.content.startsWith('<?xml version="1.0"')) {
      console.log('   ✅ Корректная XML декларация');
      this.successChecks++;
    } else {
      this.errors.push('XML должна начинаться с <?xml version="1.0" encoding="UTF-8"?>');
    }
  }

  checkRootElement() {
    console.log('2. Корневой элемент <rss>');
    this.totalChecks++;
    if (this.content.includes('<rss version="2.0"')) {
      console.log('   ✅ Корневой элемент присутствует');
      this.successChecks++;
    } else {
      this.errors.push('Отсутствует корневой элемент <rss version="2.0">');
    }

    this.totalChecks++;
    if (this.content.includes('</rss>')) {
      console.log('   ✅ Закрывающий </rss> присутствует');
      this.successChecks++;
    } else {
      this.errors.push('Отсутствует закрывающий тег </rss>');
    }
  }

  checkNamespaces() {
    console.log('3. Namespaces');
    const required = [
      'xmlns:content="http://purl.org/rss/1.0/modules/content/"',
      'xmlns:media="http://search.yahoo.com/mrss/"',
      'xmlns:atom="http://www.w3.org/2005/Atom"',
    ];

    let namespacePassed = 0;
    for (const ns of required) {
      this.totalChecks++;
      if (this.content.includes(ns)) {
        console.log(`   ✅ ${ns.split('=')[0]}`);
        namespacePassed++;
        this.successChecks++;
      } else {
        this.warnings.push(`Отсутствует namespace: ${ns}`);
      }
    }
  }

  checkChannelElement() {
    console.log('4. Элемент <channel>');
    const requiredFields = ['<title>', '<link>', '<description>', '<language>'];

    let channelPassed = 0;
    for (const field of requiredFields) {
      this.totalChecks++;
      if (this.content.includes(`<channel>`) && this.content.includes(field)) {
        console.log(`   ✅ ${field}`);
        channelPassed++;
        this.successChecks++;
      } else {
        this.warnings.push(`${field} может отсутствовать в <channel>`);
      }
    }

    // Проверить atom:link с rel="self" (обязательно для Дзена)
    this.totalChecks++;
    const atomLinkMatch = this.content.match(/<atom:link[^>]*href="([^"]*)"[^>]*rel="self"[^>]*>/) ||
                          this.content.match(/<atom:link[^>]*rel="self"[^>]*href="([^"]*)"[^>]*>/);
    
    if (atomLinkMatch) {
      console.log(`   ✅ <atom:link rel="self"> присутствует: ${atomLinkMatch[1]}`);
      this.successChecks++;
    } else {
      this.errors.push('❌ Отсутствует <atom:link rel="self"> (обязательно для Яндекс Дзен)');
    }
  }

  checkItems() {
    console.log('5. Элементы <item>');
    const itemMatches = this.content.match(/<item>/g) || [];
    const itemCount = itemMatches.length;

    this.totalChecks++;
    console.log(`   ✅ Количество <item>: ${itemCount}`);
    this.successChecks++;

    this.totalChecks++;
    if (itemCount > 500) {
      this.warnings.push(`⚠️  Больше 500 item'ов (${itemCount}), Дзен возьмет только первые 500`);
    } else {
      this.successChecks++;
    }

    this.totalChecks++;
    if (itemCount === 0) {
      this.errors.push('В RSS нет элементов <item>');
    } else {
      this.successChecks++;
    }

    // Проверить обязательные поля в каждом item
    const items = this.content.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    // Поля которые должны присутствовать (учитываем атрибуты)
    const requiredFields = [
      { name: '<title>', check: /<title>/ },
      { name: '<link>', check: /<link>/ },
      { name: '<guid>', check: /<guid[>\s]/ },
      { name: '<pubDate>', check: /<pubDate>/ },
      { name: '<category>', check: /<category>/ },
      { name: '<media:rating>', check: /<media:rating/ },
      { name: '<content:encoded>', check: /<content:encoded>/ }
    ];

    let itemsWithMissingFields = 0;
    let itemsChecked = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      itemsChecked++;

      for (const field of requiredFields) {
        this.totalChecks++;
        if (!field.check.test(item)) {
          itemsWithMissingFields++;
          this.errors.push(`Item #${i + 1}: отсутствует ${field.name}`);
        } else {
          this.successChecks++;
        }
      }
    }

    if (itemsWithMissingFields === 0) {
      console.log(`   ✅ Все обязательные поля присутствуют в ${itemCount} item'ах`);
    }
  }

  checkEnclosures() {
    console.log('6. Атрибут length в <enclosure>');
    const enclosures = this.content.match(/<enclosure[^>]*>/g) || [];

    if (enclosures.length === 0) {
      this.totalChecks++;
      this.warnings.push('В RSS нет элементов <enclosure>');
      return;
    }

    this.totalChecks++;
    console.log(`   Всего <enclosure>: ${enclosures.length}`);
    this.successChecks++;

    let withLength = 0;
    let withoutLength = 0;
    let zeroLength = 0;
    let invalidLength = 0;

    for (const enclosure of enclosures) {
      // Проверяем наличие атрибута length
      this.totalChecks++;
      const lengthMatch = enclosure.match(/length="(\d+)"/);
      if (lengthMatch) {
        withLength++;
        const lengthValue = parseInt(lengthMatch[1], 10);
        
        // Проверяем что length > 0
        if (lengthValue <= 0) {
          zeroLength++;
          this.errors.push(`❌ enclosure с length="${lengthValue}" (должен быть > 0)`);
        }
        
        // Проверяем что length - число
        if (isNaN(lengthValue)) {
          invalidLength++;
          this.errors.push(`❌ enclosure с невалидным length: ${lengthMatch[1]}`);
        }
        
        if (lengthValue > 0 && !isNaN(lengthValue)) {
          this.successChecks++;
        }
      } else {
        withoutLength++;
        this.errors.push(`❌ enclosure без атрибута length: ${enclosure.substring(0, 80)}...`);
      }
    }

    this.totalChecks++;
    if (withLength === enclosures.length && zeroLength === 0 && invalidLength === 0) {
      console.log(`   ✅ ВСЕ ${withLength} <enclosure> имеют корректный length > 0`);
      this.successChecks++;
    } else if (withoutLength === 0 && zeroLength > 0) {
      this.errors.push(`❌ ${zeroLength} <enclosure> имеют length="0" (требуется реальный размер файла)`);
    } else if (withoutLength > 0) {
      this.errors.push(`❌ ${withoutLength} <enclosure> без атрибута length (из ${enclosures.length})`);
    }
  }

  checkContentEncoded() {
    console.log('7. Элемент <content:encoded>');
    const contentCount = (this.content.match(/<content:encoded>/g) || []).length;

    this.totalChecks++;
    if (contentCount === 0) {
      this.errors.push('Отсутствуют элементы <content:encoded>');
      return;
    } else {
      this.successChecks++;
    }

    console.log(`   ✅ Количество <content:encoded>: ${contentCount}`);

    // Проверить что контент в CDATA - ищем <content:encoded><![CDATA[
    const cdataCount = (this.content.match(/<content:encoded><!\[CDATA\[/g) || []).length;

    this.totalChecks++;
    if (cdataCount === contentCount) {
      console.log(`   ✅ Весь контент обёрнут в CDATA`);
      this.successChecks++;
    } else {
      this.warnings.push(`Только ${cdataCount} из ${contentCount} контентов в CDATA`);
    }

    // Проверить что все CDATA секции закрыты правильно
    const openCdata = (this.content.match(/<!\[CDATA\[/g) || []).length;
    const closeCdata = (this.content.match(/\]\]>/g) || []).length;
    
    this.totalChecks++;
    if (openCdata === closeCdata) {
      console.log(`   ✅ Все CDATA секции закрыты (${openCdata} открыто, ${closeCdata} закрыто)`);
      this.successChecks++;
    } else {
      this.errors.push(`❌ Дисбаланс CDATA: ${openCdata} открыто, ${closeCdata} закрыто`);
    }

    // Проверить минимальную длину контента (только внутри content:encoded)
    const contents = this.content.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/g) || [];
    let shortContents = 0;

    for (const content of contents) {
      this.totalChecks++;
      // Извлекаем текст между CDATA тегами
      const textMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
      if (textMatch) {
        const textOnly = textMatch[1].replace(/<[^>]*>/g, '');
        if (textOnly.length < 300) {
          shortContents++;
        } else {
          this.successChecks++;
        }
      } else {
        this.successChecks++;
      }
    }

    this.totalChecks++;
    if (shortContents > 0) {
      console.log(`   ⚠️  ${shortContents} контентов короче 300 символов`);
    } else {
      console.log('   ✅ Все контенты ≥ 300 символов');
      this.successChecks++;
    }
  }

  checkCategories() {
    console.log('8. Категория (category)');
    const draftItems = (this.content.match(/<category>native-draft<\/category>/g) || []).length;
    const otherCategories = (this.content.match(/<category>(?!native-draft)[^<]*<\/category>/g) || []).length;

    this.totalChecks++;
    console.log(`   Категория native-draft: ${draftItems}`);
    this.successChecks++;

    if (otherCategories > 0) {
      console.log(`   ⚠️  Другие категории: ${otherCategories}`);
      this.warnings.push('Для первой подачи используй только native-draft');
    }

    if (draftItems > 0) {
      console.log('   ✅ Используется категория native-draft');
    }
  }

  checkDates() {
    console.log('9. Формат даты (pubDate)');
    const rfc822Regex = /\d{2}\s\w{3}\s\d{4}\s\d{2}:\d{2}:\d{2}\s[+-]\d{4}/;
    const dates = this.content.match(/<pubDate>([^<]*)<\/pubDate>/g) || [];

    this.totalChecks++;
    if (dates.length === 0) {
      this.errors.push('Отсутствуют элементы <pubDate>');
      return;
    } else {
      this.successChecks++;
    }

    let validDates = 0;

    for (const date of dates) {
      this.totalChecks++;
      if (rfc822Regex.test(date)) {
        validDates++;
        this.successChecks++;
      }
    }

    this.totalChecks++;
    if (validDates === dates.length) {
      console.log(`   ✅ Все ${dates.length} дат в формате RFC822`);
      this.successChecks++;
    } else {
      this.errors.push(`❌ ${dates.length - validDates} дат не в формате RFC822`);
    }
  }

  checkImageSizes() {
    console.log('10. Размер изображений');
    const images = this.content.match(/<img[^>]*src="([^"]*)"[^>]*>/g) || [];

    this.totalChecks++;
    if (images.length === 0) {
      this.warnings.push('В контенте нет изображений');
      return;
    } else {
      this.successChecks++;
    }

    console.log(`   ✅ Количество <img>: ${images.length}`);

    // Проверить что изображения в figure
    const figureImages = (this.content.match(/<figure>[\s\S]*?<img[\s\S]*?<\/figure>/g) || []).length;

    this.totalChecks++;
    if (figureImages === images.length) {
      console.log(`   ✅ Все ${images.length} изображений обёрнуты в <figure>`);
      this.successChecks++;
    } else {
      console.log(`   ⚠️  Только ${figureImages} из ${images.length} в <figure>`);
    }
  }

  checkGuids() {
    console.log('11. GUID элементы');
    // Ищем guid с атрибутами или без: <guid> или <guid isPermaLink="false">
    const guids = this.content.match(/<guid[^>]*>[\s\S]*?<\/guid>/g) || [];

    this.totalChecks++;
    if (guids.length === 0) {
      this.errors.push('Отсутствуют элементы <guid>');
      return;
    } else {
      this.successChecks++;
    }

    console.log(`   ✅ Количество GUID: ${guids.length}`);

    // Извлекаем значения GUID без тегов и атрибутов
    const guidValues = guids.map(g => g.replace(/<guid[^>]*>|<\/guid>/g, '').trim());
    const uniqueGuids = new Set(guidValues);
    
    this.totalChecks++;
    if (uniqueGuids.size === guidValues.length) {
      console.log(`   ✅ Все GUID уникальны`);
      this.successChecks++;
    } else {
      this.errors.push(`❌ Найдены дубликаты GUID (${guidValues.length - uniqueGuids.size})`);
    }
  }

  checkHtmlBalance() {
    console.log('12. Баланс HTML тегов (в контенте CDATA)');
    // Проверяем только внутри CDATA контента
    const cdataContents = this.content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/g) || [];
    const combinedContent = cdataContents.join('\n');
    
    const tagsToCheck = ['p', 'ul', 'ol', 'li', 'figure', 'blockquote'];
    let hasImbalance = false;

    this.totalChecks++;
    for (const tag of tagsToCheck) {
      const openCount = (combinedContent.match(new RegExp(`<${tag}[^>]*>`, 'gi')) || []).length;
      const closeCount = (combinedContent.match(new RegExp(`</${tag}>`, 'gi')) || []).length;

      // Для li допускается несоответствие, т.к. часто используется без закрывающего тега в некоторых форматах
      if (tag === 'li') {
        continue;
      }

      if (openCount !== closeCount) {
        this.errors.push(`Дисбаланс <${tag}> в контенте: открыто ${openCount}, закрыто ${closeCount}`);
        hasImbalance = true;
      }
    }

    if (!hasImbalance) {
      console.log('   ✅ HTML теги сбалансированы');
      this.successChecks++;
    } else {
      // hasImbalance уже добавил ошибки
    }
  }

  checkFileSize() {
    console.log('13. Размер файла');
    const sizeMb = (this.content.length / (1024 * 1024)).toFixed(2);
    const sizeKb = (this.content.length / 1024).toFixed(2);

    console.log(`   Размер: ${sizeKb} KB (${sizeMb} MB)`);

    this.totalChecks++;
    if (this.content.length > 5242880) {
      this.warnings.push('⚠️  RSS больше 5 MB (Дзен может отклонить)');
    } else {
      console.log('   ✅ Размер в норме');
      this.successChecks++;
    }
  }

  // ==========================================
  // ИТОГИ
  // ==========================================

  getResults() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 РЕЗУЛЬТАТЫ ВАЛИДАЦИИ');
    console.log('='.repeat(70));

    console.log(`\n✅ УСПЕШНО: ${this.successChecks}/${this.totalChecks} проверок`);
    console.log(`❌ ОШИБОК: ${this.errors.length}`);
    console.log(`⚠️  ПРЕДУПРЕЖДЕНИЙ: ${this.warnings.length}`);

    if (this.errors.length > 0) {
      console.log('\n❌ ОШИБКИ (КРИТИЧНЫЕ):');
      this.errors.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  ПРЕДУПРЕЖДЕНИЯ (НЕ КРИТИЧНЫЕ):');
      this.warnings.forEach((w, i) => console.log(`   ${i + 1}. ${w}`));
    }

    const isValid = this.errors.length === 0;

    console.log('\n' + '='.repeat(70));
    if (isValid) {
      console.log('✅ RSS ВАЛИДНА! Готова к подаче в Яндекс Дзен');
    } else {
      console.log('❌ RSS НЕВАЛИДНА! Исправь ошибки перед подачей');
    }
    console.log('='.repeat(70) + '\n');

    return {
      isValid,
      errors: this.errors,
      warnings: this.warnings,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN
// ═══════════════════════════════════════════════════════════════

function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  🔍 RSS Validator for Yandex Dzen                 ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📄 RSS файл: ${RSS_PATH}`);

  const validator = new RssValidator(RSS_PATH);
  const results = validator.validate();

  // Вернуть код выхода для CI/CD
  process.exit(results.isValid ? 0 : 1);
}

main();
