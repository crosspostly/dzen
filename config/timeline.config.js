/**
 * 📅 Timeline Publishing Configuration
 * 
 * This file defines publishing schedules for different article categories
 * Each timeline can have different intervals, offsets, and publishing windows
 */

export const TIMELINE_CONFIG = {
  // Default timeline for women-35-60 category
  default: {
    name: 'Standard Publishing',
    description: 'Default 90-minute interval timeline',
    initialOffsetHours: 3,
    intervalMinutes: 90,
    maxArticlesPerDay: 8,
    publishingWindow: {
      start: '06:00', // Moscow time
      end: '23:00'
    },
    active: true
  },

  // Morning rush timeline (more frequent publishing)
  morning: {
    name: 'Morning Rush',
    description: 'Faster publishing during morning hours',
    initialOffsetHours: 3,
    intervalMinutes: 45,
    maxArticlesPerDay: 12,
    publishingWindow: {
      start: '06:00',
      end: '12:00'
    },
    active: false
  },

  // Evening timeline (prime time publishing)
  evening: {
    name: 'Prime Time Evening',
    description: 'Optimal publishing during evening hours',
    initialOffsetHours: 3,
    intervalMinutes: 60,
    maxArticlesPerDay: 10,
    publishingWindow: {
      start: '18:00',
      end: '23:00'
    },
    active: false
  },

  // Special timeline for high-priority content
  priority: {
    name: 'Priority Publishing',
    description: 'Immediate publishing with 30-minute intervals',
    initialOffsetHours: 1,
    intervalMinutes: 30,
    maxArticlesPerDay: 15,
    publishingWindow: {
      start: '00:00',
      end: '23:59'
    },
    active: false
  }
};

// Article category to timeline mapping
export const ARTICLE_TIMELINE_MAP = {
  'women-35-60': 'default',
  'channel-1': 'morning',
  'published': 'evening',
  'priority': 'priority'
};

// Special publishing rules
export const PUBLISHING_RULES = {
  // Skip articles older than this many days
  maxArticleAgeDays: 7,
  
  // Minimum content length in characters
  minContentLength: 300,
  
  // Require images
  requireImages: true,
  
  // Auto-publish if meets criteria
  autoPublish: true,
  
  // Respect Dzen requirements
  dzenRequirements: {
    maxItems: 500,
    requireNativeDraft: true,
    requireLength: true,
    requireMediaRating: true
  }
};

export default {
  TIMELINE_CONFIG,
  ARTICLE_TIMELINE_MAP,
  PUBLISHING_RULES
};