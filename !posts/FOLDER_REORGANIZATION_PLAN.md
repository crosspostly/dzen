# Folder Structure Organization Recommendations

## Current Structure Analysis
The current project has a mix of production code, development tools, documentation, and temporary files all in the main directory, making it difficult to distinguish between essential and non-essential components.

## Recommended New Structure

```
dzen-auto-publisher/
├── src/                          # Source code
│   ├── main.js                  # Renamed from zen_auto_publisher.js
│   ├── config/                  # Configuration files
│   │   └── cookies.json         # Authentication cookies
│   └── modules/                 # Reusable modules
│       └── publication_history.js
├── data/                        # Data files
│   ├── feed.xml                 # RSS feed template
│   └── published_articles.txt   # Publication history
├── scripts/                     # Development and analysis scripts
│   ├── publishers/              # Alternative publisher implementations
│   │   ├── dzen_publisher.js
│   │   ├── dzen_publisher_enhanced.js
│   │   └── dzen_publisher_final.js
│   ├── analyzers/               # Analysis tools
│   │   ├── selector_analyzer.js
│   │   ├── simple_selector_analyzer.js
│   │   ├── enhanced_dzen_analyzer.js
│   │   ├── dzen_page_analyzer.js
│   │   ├── dzen_editor_analyzer.js
│   │   ├── dzen_new_article_analyzer.js
│   │   └── dzen_navigation_finder.js
│   └── utilities/               # Utility scripts
│       ├── article_finder.js
│       └── check_creation_buttons.js
├── docs/                        # Documentation
│   ├── README.md                # Main project documentation
│   ├── COMBINED_DOCUMENTATION.md # Comprehensive documentation
│   ├── API_REFERENCE.md         # API documentation
│   └── TROUBLESHOOTING.md       # Troubleshooting guide
├── assets/                      # Asset files
│   └── selectors/               # Selector files
│       └── dzen-schema.json     # Precise selectors
├── tests/                       # Test files (if added later)
├── node_modules/                # Dependencies (gitignored)
├── package.json                 # Project dependencies and scripts
├── package-lock.json            # Dependency lock file
└── .gitignore                   # Git ignore rules
```

## Migration Steps

### 1. Essential Production Files (Keep in main or src/)
- `zen_auto_publisher.js` → `src/main.js` (or keep as is if preferred)
- `modules/publication_history.js` → `src/modules/publication_history.js`
- `dzen-schema.json` → `assets/selectors/dzen-schema.json`
- `config/cookies.json` → `src/config/cookies.json`
- `published_articles.txt` → `data/published_articles.txt`

### 2. Development/Analysis Scripts (Move to scripts/)
- All files in current `scripts/` folder should be organized as shown above
- These are development tools that were used to analyze the Dzen interface

### 3. Documentation (Move to docs/)
- `README.md` → `docs/README.md` (or keep in root if preferred for GitHub)
- Combine all documentation files into `docs/COMBINED_DOCUMENTATION.md`
- Create additional documentation files as needed

### 4. Temporary/Debug Files (Archive or Delete)
- `debug_page_source.html`
- `editor_page_source.html`
- All temporary analysis files like `SCRIPTS_DESCRIPTION.md`, etc.

## Implementation Plan

### Phase 1: Secure Current State
1. Create the new folder structure
2. Copy files to appropriate locations
3. Update import/require paths in JavaScript files to reflect new structure
4. Test that main functionality still works

### Phase 2: Update Configuration
1. Update any hardcoded paths in the code to use relative paths or configuration
2. Update package.json scripts if necessary
3. Ensure all file references work with new structure

### Phase 3: Cleanup
1. Remove old files from root directory after confirming everything works
2. Update .gitignore to exclude temporary files
3. Update documentation to reflect new structure

## Benefits of New Structure

1. **Clear Separation**: Production code is separate from development tools
2. **Maintainability**: Easier to find and update specific components
3. **Scalability**: Structure supports growth of the project
4. **Clarity**: New developers can quickly understand the project organization
5. **Best Practices**: Follows common Node.js project organization patterns

## Special Considerations

1. **Path Updates**: Need to update all file paths in the JavaScript code to reflect new structure
2. **Configuration**: Consider using a configuration file to store file paths instead of hardcoding them
3. **Backward Compatibility**: Ensure the main execution command still works after restructuring
4. **Git Management**: Update .gitignore to properly handle the new structure

## Files to Update After Migration

- Update the main script to reference new paths for:
  - `dzen-schema.json` → `../assets/selectors/dzen-schema.json`
  - `published_articles.txt` → `../data/published_articles.txt`
  - `cookies.json` → `../src/config/cookies.json`
  - Module imports to reflect new locations

This reorganization will make the project much cleaner and easier to maintain while preserving all functionality.