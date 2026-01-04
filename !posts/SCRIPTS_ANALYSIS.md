# Dzen Auto-Publisher Scripts Analysis

## Project Overview
This project is an automated publishing system for Yandex Dzen that publishes articles from RSS feeds with full text and images using precise selectors and proper HTML tag handling.

## Main Script
- **zen_auto_publisher.js**: The main script that handles the core functionality of reading articles from `feed.xml`, extracting data, and publishing to Dzen using precise selectors from `dzen-schema.json`.

## Scripts Directory Analysis

### Publisher Scripts
1. **dzen_publisher.js** - Basic publisher with human-like behavior, reads articles from markdown files in `../articles` directory
2. **dzen_publisher_enhanced.js** - Enhanced version with full logging capabilities
3. **dzen_publisher_final.js** - Final version using precise selectors from analysis

### Analysis Scripts
4. **selector_analyzer.js** - Analyzes Dzen page structure and collects all possible selectors
5. **simple_selector_analyzer.js** - Simplified version of selector analyzer
6. **enhanced_dzen_analyzer.js** - Enhanced analyzer for Dzen page structure
7. **dzen_page_analyzer.js** - Analyzes Dzen page structure
8. **dzen_editor_analyzer.js** - Analyzes Dzen editor specifically
9. **dzen_new_article_analyzer.js** - Analyzes new article creation process
10. **dzen_navigation_finder.js** - Finds navigation elements in Dzen

### Utility Scripts
11. **article_finder.js** - Finds articles in the system
12. **check_creation_buttons.js** - Checks creation buttons in the interface

## Script Relationships

### Main Execution Path
```
zen_auto_publisher.js (main) 
├── modules/publication_history.js (history tracking)
└── dzen-schema.json (selectors)
```

### Analysis Tools
```
selector_analyzer.js → dzen-schema.json (generates selectors)
simple_selector_analyzer.js → dzen-schema.json (generates selectors)
enhanced_dzen_analyzer.js → dzen-schema.json (generates selectors)
```

### Alternative Publishers
```
dzen_publisher.js
├── dzen_publisher_enhanced.js (enhanced logging)
└── dzen_publisher_final.js (final implementation)
```

## Usage Patterns

### Currently Active
- `zen_auto_publisher.js` - Main execution script
- `modules/publication_history.js` - Used by main script
- `dzen-schema.json` - Contains selectors for precise element targeting

### Development/Analysis Tools
- Various analyzer scripts for selector discovery and testing
- Different publisher implementations for testing different approaches

### Unused Scripts
- Multiple publisher implementations that may be alternative versions or deprecated
- Analysis scripts that were used during development but not in production

## Dependencies

### External Dependencies
- Playwright (for browser automation)
- Node.js file system operations

### Internal Dependencies
- `./modules/publication_history.js` - For tracking published articles
- `./config/cookies.json` - For authentication
- `./published_articles.txt` - For history tracking
- `./dzen-schema.json` - For precise selectors
- `./public/feed.xml` - For article source

## File Structure
```
!posts/
├── zen_auto_publisher.js (main script)
├── dzen-schema.json (selectors)
├── published_articles.txt (history)
├── config/
│   ├── cookies.json (authentication)
│   └── ...
├── modules/
│   └── publication_history.js (history tracking)
├── public/
│   └── feed.xml (article source)
├── scripts/ (analysis tools)
│   ├── dzen_publisher*.js (alternative implementations)
│   ├── selector_analyzer*.js (analysis tools)
│   └── other analysis scripts
├── documentation files
└── other files
```

## Recommendations

1. **Active Scripts**: Only `zen_auto_publisher.js` appears to be in active use
2. **Analysis Scripts**: The various analyzer scripts were likely used during development
3. **Alternative Publishers**: Multiple publisher implementations suggest iterative development
4. **Documentation**: Several documentation files exist with detailed information