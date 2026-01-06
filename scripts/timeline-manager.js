/**
 * 📅 Timeline Manager for Scheduled Publishing
 * 
 * Provides timeline-aware pubDate generation, publishing window validation,
 * and timeline selection based on article categories and publishing rules.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TIMELINE_CONFIG, ARTICLE_TIMELINE_MAP, PUBLISHING_RULES } from '../config/timeline.config.js';

// RFC822 date formatter (self-contained to avoid circular imports)
function toRFC822(date) {
  try {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[date.getDay()];
    const dayNum = String(date.getDate()).padStart(2, '0');
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${dayName}, ${dayNum} ${monthName} ${year} ${hours}:${minutes}:${seconds} +0300`;
  } catch (e) {
    console.error(`⚠️  WARNING: toRFC822 error: ${e.message}`);
    const now = new Date();
    return now.toUTCString();
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAX_PUBDATE_DAYS_FORWARD = 30; // Maximum days to schedule into the future

/**
 * Get timeline configuration for an article based on its category
 * @param {string} articlePath - Path to article file
 * @returns {Object} Timeline configuration object
 */
export function getTimelineForArticle(articlePath) {
  const articleCategory = getArticleCategory(articlePath);
  const timelineKey = ARTICLE_TIMELINE_MAP[articleCategory] || 'default';
  
  return {
    ...TIMELINE_CONFIG[timelineKey],
    key: timelineKey,
    category: articleCategory
  };
}

/**
 * Determine article category from file path
 * @param {string} articlePath - Path to article file
 * @returns {string} Category name
 */
function getArticleCategory(articlePath) {
  const articlesDir = path.join(process.cwd(), 'articles');
  const relativePath = path.relative(articlesDir, articlePath);
  const parts = relativePath.split(path.sep);
  
  // Check if in women-35-60, channel-1, or published directories
  if (parts.includes('women-35-60')) return 'women-35-60';
  if (parts.includes('channel-1')) return 'channel-1';
  if (parts.includes('published')) return 'published';
  
  return 'default';
}

/**
 * Check if a publishing date falls within the allowed publishing window
 * @param {Date} date - Date to check
 * @param {Object} timeline - Timeline configuration
 * @returns {Object} { isValid: boolean, reason: string }
 */
export function isWithinPublishingWindow(date, timeline) {
  if (!timeline.publishingWindow) {
    return { isValid: true, reason: 'No publishing window defined' };
  }
  
  const hour = date.getHours();
  const minute = date.getMinutes();
  const currentTime = hour * 60 + minute;
  
  const [startHour, startMin] = timeline.publishingWindow.start.split(':').map(Number);
  const [endHour, endMin] = timeline.publishingWindow.end.split(':').map(Number);
  
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;
  
  const isValid = currentTime >= startTime && currentTime <= endTime;
  
  return {
    isValid,
    reason: isValid 
      ? 'Within publishing window' 
      : `Outside window (${timeline.publishingWindow.start} - ${timeline.publishingWindow.end} MSK)`
  };
}

/**
 * Get the next available publishing slot for a timeline
 * @param {Array} scheduledArticles - Currently scheduled articles with their pubDates
 * @param {Object} timeline - Timeline configuration
 * @returns {Date} Next available publishing datetime
 */
export function getNextPublishingSlot(scheduledArticles, timeline, baseDate = null) {
  const now = baseDate || new Date();
  
  // Start from initial offset
  let candidateDate = new Date(now);
  candidateDate.setHours(candidateDate.getHours() + timeline.initialOffsetHours);
  
  // If no articles scheduled, return the initial offset
  if (!scheduledArticles || scheduledArticles.length === 0) {
    return candidateDate;
  }
  
  // Find the last scheduled article's pubDate
  const lastArticle = scheduledArticles[scheduledArticles.length - 1];
  const lastPubDate = new Date(lastArticle.pubDate);
  
  // Add interval to last pubDate
  candidateDate = new Date(lastPubDate);
  candidateDate.setMinutes(candidateDate.getMinutes() + timeline.intervalMinutes);
  
  return candidateDate;
}

/**
 * Validate that a scheduled date is not too far in the future
 * @param {Date} date - Date to validate
 * @returns {boolean} true if date is within allowed range
 */
export function isValidFutureDate(date) {
  const now = new Date();
  const maxFutureDate = new Date(now);
  maxFutureDate.setDate(maxFutureDate.getDate() + MAX_PUBDATE_DAYS_FORWARD);
  
  return date <= maxFutureDate;
}

/**
 * Generate publishing schedule preview
 * @param {Array} articles - Articles to be published
 * @param {string} mode - 'incremental' or 'full'
 * @returns {Array} Schedule with timeline information
 */
export function generatePublishingSchedule(articles, mode = 'incremental') {
  const schedule = [];
  const currentTime = new Date();
  
  console.log(`\n\ud83d\udcc5 Generating publishing schedule for ${articles.length} articles...`);
  console.log(`\u23f0 Current time: ${currentTime.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} MSK`);
  console.log(`\ud83d\udd04 Mode: ${mode}`);
  
  // Group articles by timeline
  const articlesByTimeline = {};
  articles.forEach((article, index) => {
    const timeline = getTimelineForArticle(article.filePath);
    const timelineKey = timeline.key;
    
    if (!articlesByTimeline[timelineKey]) {
      articlesByTimeline[timelineKey] = [];
    }
    
    articlesByTimeline[timelineKey].push({
      ...article,
      originalIndex: index,
      timeline
    });
  });
  
  // Process each timeline separately
  for (const [timelineKey, timelineArticles] of Object.entries(articlesByTimeline)) {
    const timelineConfig = TIMELINE_CONFIG[timelineKey];
    
    console.log(`\n\ud83d\udcca Timeline "${timelineConfig.name}": ${timelineArticles.length} articles`);
    console.log(`   Interval: ${timelineConfig.intervalMinutes} minutes`);
    console.log(`   Window: ${timelineConfig.publishingWindow.start} - ${timelineConfig.publishingWindow.end} MSK`);
    
    let lastPubDate = null;
    
    timelineArticles.forEach((article, index) => {
      // Generate pubDate for this article
      const pubDate = getNextPublishingSlot(
        index > 0 ? timelineArticles.slice(0, index) : [],
        timelineConfig,
        currentTime
      );
      
      // Check if pubDate falls within publishing window
      const windowCheck = isWithinPublishingWindow(pubDate, timelineConfig);
      
      // Adjust if outside window (move to next day's window start)
      if (!windowCheck.isValid) {
        console.log(`   ⚠️ Article "${article.title.substring(0, 50)}..." scheduled outside window`);
        
        const [startHour, startMin] = timelineConfig.publishingWindow.start.split(':').map(Number);
        pubDate.setHours(startHour, startMin, 0, 0);
        pubDate.setDate(pubDate.getDate() + 1);
        
        windowCheck.isValid = true;
        windowCheck.reason = 'Moved to next day window start';
      }
      
      // Validate future date
      const isValidDate = isValidFutureDate(pubDate);
      
      const scheduleItem = {
        articleIndex: article.originalIndex,
        title: article.title,
        timeline: timelineKey,
        timelineName: timelineConfig.name,
        pubDate: pubDate,
        pubDateRfc822: toRFC822(pubDate),
        publishingWindow: windowCheck,
        isValidFutureDate: isValidDate,
        intervalMinutes: timelineConfig.intervalMinutes,
        channel: article.channel
      };
      
      schedule.push(scheduleItem);
      
      // Display preview
      const timeStr = pubDate.toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      console.log(`   ⏰ [${index + 1}] ${timeStr} - ${article.title.substring(0, 60)}...`);
      
      lastPubDate = pubDate;
    });
  }
  
  // Sort by pubDate
  schedule.sort((a, b) => new Date(a.pubDate) - new Date(b.pubDate));
  
  console.log(`\n✅ Schedule generated successfully! ${schedule.length} articles scheduled.`);
  
  return schedule;
}

/**
 * Check timeline violations
 * @param {Array} schedule - Generated publishing schedule
 * @returns {Object} Validation results
 */
export function validateSchedule(schedule) {
  const violations = [];
  const warnings = [];
  
  // Check for pubDate conflicts (same minute)
  const pubDateMap = new Map();
  
  schedule.forEach((item, index) => {
    const pubDateKey = new Date(item.pubDate).toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    
    if (pubDateMap.has(pubDateKey)) {
      violations.push({
        type: 'CONFLICT',
        message: `Publishing conflict: Article ${pubDateMap.get(pubDateKey)} and Article ${index} both scheduled for ${item.pubDateRfc822}`,
        articles: [pubDateMap.get(pubDateKey), index]
      });
    } else {
      pubDateMap.set(pubDateKey, index);
    }
    
    // Check if article is scheduled in the past
    if (new Date(item.pubDate) < new Date()) {
      warnings.push({
        type: 'PAST_DATE',
        message: `Article "${item.title}" is scheduled in the past`,
        articleIndex: index
      });
    }
    
    // Check if outside publishing window
    if (!item.publishingWindow.isValid) {
      warnings.push({
        type: 'WINDOW_VIOLATION',
        message: `Article "${item.title}" scheduled outside publishing window`,
        articleIndex: index,
        reason: item.publishingWindow.reason
      });
    }
  });
  
  const isValid = violations.length === 0;
  
  if (isValid) {
    console.log('\n\u2705 Schedule validation passed!');
  } else {
    console.log(`\n\u274c Schedule validation failed: ${violations.length} violations`);
    violations.forEach(v => console.log(`   - ${v.message}`));
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️ Warnings: ${warnings.length}`);
    warnings.forEach(w => console.log(`   - ${w.message}`));
  }
  
  return {
    isValid,
    violations,
    warnings,
    violationCount: violations.length,
    warningCount: warnings.length
  };
}

/**
 * Save schedule to file for persistence and debugging
 * @param {Array} schedule - Publishing schedule
 * @param {string} outputPath - Path to save schedule
 */
export function saveScheduleToFile(schedule, outputPath = null) {
  const scheduleFile = outputPath || path.join(process.cwd(), 'publishing-schedule.json');
  
  const scheduleData = {
    generatedAt: new Date().toISOString(),
    timezone: 'Europe/Moscow',
    articleCount: schedule.length,
    schedule: schedule.map(item => ({
      ...item,
      pubDate: item.pubDate.toISOString(),
      articleFile: item.filePath || 'N/A'
    }))
  };
  
  fs.writeFileSync(scheduleFile, JSON.stringify(scheduleData, null, 2), 'utf8');
  console.log(`\ud83d\udcc4 Schedule saved to: ${scheduleFile}`);
  
  return scheduleFile;
}

/**
 * Export schedule as human-readable text
 * @param {Array} schedule - Publishing schedule
 * @returns {string} Formatted schedule text
 */
export function exportScheduleAsText(schedule) {
  let output = '\ud83d\udcc5 PUBLISHING TIMELINE SCHEDULE\n';
  output += '=' .repeat(60) + '\n';
  output += `Generated: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} MSK\n`;
  output += `Total Articles: ${schedule.length}\n`;
  output += '=' .repeat(60) + '\n\n';
  
  schedule.forEach((item, index) => {
    const timeStr = new Date(item.pubDate).toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    output += `[${index + 1}] ${timeStr} MSK\n`;
    output += `    Timeline: ${item.timelineName} (${item.timeline})\n`;
    output += `    Channel: ${item.channel}\n`;
    output += `    Title: ${item.title}\n`;
    output += `    Status: ${item.publishingWindow.isValid ? '\u2705 Valid' : '\u274c Invalid'}\n`;
    output += `    Interval: ${item.intervalMinutes} minutes\n\n`;
  });
  
  return output;
}

// Re-export timeline configuration for convenience
export { TIMELINE_CONFIG, ARTICLE_TIMELINE_MAP, PUBLISHING_RULES } from '../config/timeline.config.js';