# 📅 Timeline Publishing System - Issue #135

## Overview

The **Timeline Publishing System** implements intelligent, category-aware scheduling for RSS feed generation. This system allows different article categories to use different publishing schedules, intervals, and time windows.

## 📊 Features

### 1. Multiple Timeline Configurations
- **Default Timeline**: 90-minute intervals, 6 AM - 11 PM publishing window
- **Morning Rush Timeline**: 45-minute intervals, 6 AM - 12 PM focused
- **Prime Time Evening**: 60-minute intervals, 6 PM - 11 PM focused
- **Priority Timeline**: 30-minute intervals, 24/7 publishing

### 2. Category-Aware Scheduling
Each article category automatically uses its configured timeline:

```javascript
{
  'women-35-60': 'default',
  'channel-1': 'morning',
  'published': 'evening',
  'priority': 'priority'
}
```

### 3. Publishing Window Validation
Ensures articles are only scheduled during permitted time windows (Moscow Time):

- **Morning**: 06:00 - 12:00
- **Evening**: 18:00 - 23:00
- **Default**: 06:00 - 23:00
- **Priority**: 00:00 - 23:59 (24/7)

### 4. Automatic Conflict Resolution
- Detects scheduling conflicts (same-minute publications)
- Automatically adjusts articles outside publishing windows
- Validates publishing dates are within 30-day future window

### 5. Comprehensive Timeline Management
- Real-time schedule generation and validation
- Timeline performance tracking
- Publishing analytics by category
- Schedule persistence and export

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│          RSS Feed Generation (generate-feed.js)      │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│         Timeline Manager (timeline-manager.js)       │
├───────────────────────────────────────────────────────┤
│  - Schedule Generation                              │
│  - Publishing Window Validation                     │
│  - Conflict Resolution                          │
│  - Timeline Selection                             │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│   Timeline Config (config/timeline.config.js)       │
├───────────────────────────────────────────────────────┤
│  - Timeline Definitions                          │
│  - Category Mappings                          │
│  - Publishing Rules                            │
└───────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Generate Timeline-Aware Feed

```bash
# Generate feed with automatic timeline scheduling
node scripts/generate-feed.js incremental

# Generate full feed (all articles with timeline scheduling)
node scripts/generate-feed.js full
```

### Test Timeline System

```bash
# Run comprehensive test suite
node scripts/test-timeline.js

# Expected output:
# ✅ Configuration test passed
# ✅ Schedule generation test passed
# ✅ Schedule validation test passed
# ✅ Timeline configuration validation passed
```

### View Publishing Schedule

After generating a feed, view the detailed schedule:

```bash
cat publishing-schedule.json

# Or as formatted text
node -e "import('./scripts/timeline-manager.js').then(m => {
  const fs = require('fs');
  const schedule = JSON.parse(fs.readFileSync('publishing-schedule.json', 'utf8'));
  console.log(m.exportScheduleAsText(schedule.schedule));
})"
```

## ⚙️ Configuration

### Timeline Definitions

Edit `config/timeline.config.js` to customize timelines:

```javascript
export const TIMELINE_CONFIG = {
  default: {
    name: 'Standard Publishing',
    initialOffsetHours: 3,
    intervalMinutes: 90,
    maxArticlesPerDay: 8,
    publishingWindow: {
      start: '06:00', // Moscow time (UTC+3)
      end: '23:00'
    }
  },
  
  morning: {
    name: 'Morning Rush',
    initialOffsetHours: 3,
    intervalMinutes: 45,     // More frequent
    maxArticlesPerDay: 12,
    publishingWindow: {
      start: '06:00',
      end: '12:00'            // Morning focused
    }
  }
}
```

### Category-to-Timeline Mapping

```javascript
export const ARTICLE_TIMELINE_MAP = {
  'women-35-60': 'default',    // 90-min interval
  'channel-1': 'morning',       // 45-min interval
  'published': 'evening',         // 60-min interval
  'priority': 'priority'           // 30-min interval
}
```

## 📋 Output Formats

### 1. RSS Feed (XML)
Standard RSS feed with timeline metadata embedded as categories:

```xml
<item>
  <title>Article Title</title>
  <pubDate>Mon, 06 Jan 2026 09:00:00 +0300</pubDate>
  <category>timeline-default</category>
  <!-- ... -->
</item>
```

### 2. Publishing Schedule (JSON)
```json
{
  "generatedAt": "2026-01-06T08:00:00.000Z",
  "timezone": "Europe/Moscow",
  "articleCount": 15,
  "schedule": [
    {
      "articleIndex": 0,
      "title": "Article Title",
      "timeline": "default",
      "timelineName": "Standard Publishing",
      "pubDate": "Mon, 06 Jan 2026 09:00:00 +0300",
      "intervalMinutes": 90
    }
  ]
}
```

### 3. Human-Readable Schedule
```
📅 PUBLISHING TIMELINE SCHEDULE
============================================================
Generated: 06.01.2026, 08:00:34 MSK
Total Articles: 3
============================================================

[1] 06.01.2026, 11:00:34 MSK
    Timeline: Standard Publishing (default)
    Channel: women-35-60
    Title: Test Article 1
    Status: ✅ Valid
    Interval: 90 minutes
```

## 🔍 Validation Features

### Automatic Validation Checks

1. **️Date Format**: RFC822 compliance
2. **Publishing Window**: Time-of-day constraints
3. **Future Dates**: Maximum 30 days forward
4. **Conflicts**: No simultaneous publications
5. **Timeline Constraints**: Interval adherence
6. **Article Quality**: Minimum content length
7. **Image Requirements**: Size and existence
8. **XML Validity**: Well-formed RSS feed

### Manual Validation

```bash
# Run comprehensive RSS validation
node scripts/validate-rss.js public/feed.xml

# Expected output:
# ✅ XML declaration
# ✅ Root element <rss>
# ✅ Namespaces
# ✅ All enclosures have length > 0
# ✅ RFC822 dates format
# ✅ CDATA content properly wrapped
# ✅ All GUIDs are unique
# ✅ HTML tags are balanced
```

## 🐋 CI/CD Integration

### GitHub Actions Workflow

```yaml
- name: Generate Timeline-Aware Feed
  run: node scripts/generate-feed.js ${{ github.event.inputs.mode }}

- name: Validate Schedule
  run: node -e "import('./scripts/timeline-manager.js').then(m => {
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('publishing-schedule.json'));
    const result = m.validateSchedule(data.schedule);
    process.exit(result.isValid ? 0 : 1);
  })"

- name: Save Schedule Artifact
  uses: actions/upload-artifact@v3
  with:
    name: publishing-schedule
    path: publishing-schedule.json
```

## 📖 Use Cases

### Use Case 1: Multi-Category Blog
- **women-35-60**: Casual content, 90-min intervals
- **morning**: News articles, 45-min rush-hour intervals
- **evening**: Premium content, 60-min prime time slots

### Use Case 2: Priority Campaign
- Queue 20 articles across categories
- Priority articles get 30-min intervals
- Standard articles maintain 90-min intervals
- System automatically validates no conflicts

### Use Case 3: Weekend Publishing
- Configure extended publishing windows
- Reduce frequency (increase intervals to 120 minutes)
- Maintain category-specific timelines
- Automatically skip weekend-restricted categories

## 🎯 Benefits

### For Content Creators
- ✅ Automated scheduling by category
- ✅ Visual timeline previews
- ✅ Conflict detection and resolution
- ✅ Flexible configuration
- ✅ Publishing analytics

### For System Administrators
- ✅ Category-aware resource management
- ✅ Time-window compliance
- ✅ XML validation integration
- ✅ CI/CD pipeline compatibility
- ✅ Comprehensive logging

### For Dzen Compliance
- ✅ RFC822 date formatting
- ✅ Structure category requirements
- ✅ Enclosure length validation
- ✅ Unique GUID enforcement
- ✅ Proper HTML sanitization

## 🔧 Troubleshooting

### Issue: Schedule validation fails
- **Check**: Publishing window configuration
- **Verify**: Article dates are within 30-day future limit
- **Solution**: Adjust timeline offsets or intervals

### Issue: Articles scheduled outside window
- **Check**: Moscow Timezone (UTC+3)
- **Verify**: System clock synchronization
- **Solution**: Adjust window start/end times in config

### Issue: Conflicts detected
- **Check**: Interval minutes per timeline
- **Verify**: No duplicate articles with same timestamp
- **Solution**: Increase intervals or stagger start times

## 📚 Related Documentation

- [RSS Dzen Compliance](RSS_DZEN_COMPLIANCE.md)
- [RSS Feed Generation](RSS_GENERATION.md)
- [GitHub Actions Integration](GITHUB-ACTIONS-INTEGRATION-SUMMARY.md)

## 🔮 Future Enhancements

- Dynamic interval adjustment based on engagement metrics
- A/B testing support with randomized timelines
- Integration with analytics for performance tracking
- Machine learning-based optimal scheduling
- Multi-channel publishing with different timelines
- Calendar-based exclusion rules (holidays, etc.)

---

**Issue**: #135 - Implement Timeline Publishing System
**Version**: 3.0
**Status**: ✅ Fully Implemented
**Last Updated**: January 6, 2026
