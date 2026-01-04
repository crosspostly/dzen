# Dzen Auto-Publisher - Combined Documentation

## Table of Contents
1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Usage](#usage)
6. [Publication Algorithm](#publication-algorithm)
7. [Key Selectors](#key-selectors)
8. [Working with feed.xml](#working-with-feedxml)
9. [Errors and Solutions](#errors-and-solutions)
10. [Scripts Analysis](#scripts-analysis)
11. [Security Notes](#security-notes)

## Overview

This is a fully automated publisher that extracts articles from `public/feed.xml`, fills in the title and body with full text, inserts images, and publishes articles to Dzen using precise selectors from `dzen-schema.json`. The system provides:

- 🚀 Automatic publication of articles from RSS feed
- 📸 Automatic image insertion
- 👤 Human-like behavior simulation
- 🍪 Cookie-based authentication
- 🛡️ Bypassing simple automation detection systems
- 📝 Headers and content from RSS feed
- 🧹 Proper HTML tag processing in text
- ⚡ Two-step publication (in editor and modal window)
- 🔄 Published articles tracking system (avoids duplicates)
- 💾 Automatic publication history saving to `published_articles.txt`

## Project Structure

```
!posts/
├── zen_auto_publisher.js          # Main publisher script
├── dzen-schema.json              # Precise selectors for elements
├── published_articles.txt        # Publication history
├── config/
│   ├── cookies.json              # Authentication cookies
│   └── ...
├── modules/
│   └── publication_history.js    # History tracking module
├── public/
│   └── feed.xml                  # RSS feed with articles
├── scripts/                      # Analysis and helper scripts
│   ├── dzen_publisher*.js       # Alternative publisher implementations
│   ├── selector_analyzer*.js    # Selector analysis tools
│   └── other analysis scripts
├── documentation files
└── other files
```

## Installation

1. Ensure you have Node.js installed
2. Install dependencies:

```bash
npm install
```

3. Install Playwright browsers:

```bash
npx playwright install chromium
```

## Configuration

### 1. Cookie Preparation

For the first run, you need to get cookies from Dzen:

1. Log in to Dzen manually
2. Open DevTools (F12)
3. Go to Application tab (or Storage)
4. Find Cookies for domain `.dzen.ru`
5. Save them to `config/cookies.json`

### 2. feed.xml Preparation

Place your RSS feed with articles in `public/feed.xml`. The file should contain:

```xml
<rss version="2.0">
  <channel>
    <title>Your Channel</title>
    <item>
      <title><![CDATA[Article Title]]></title>
      <description><![CDATA[Article Description]]></description>
      <content:encoded><![CDATA[Article Text]]></content:encoded>
      <media:content url="https://image-link.jpg" type="image/jpeg"/>
      <link>https://article-link</link>
      <pubDate>Publication Date</pubDate>
    </item>
  </channel>
</rss>
```

## Usage

### Running the main publisher

```bash
node zen_auto_publisher.js
```

### Running feed analysis

```bash
node scripts/analyze_feed.js
```

### Running other scripts

```bash
node scripts/selector_analyzer.js
node scripts/dzen_publisher.js
```

## Publication Algorithm

### Sequence of Actions

1. **Preparation**
   - Reading publication history from `published_articles.txt`
   - Reading article from `feed.xml`
   - Loading cookies from file `./config/cookies.json`
   - Opening browser with required settings
   - Navigating to page `https://dzen.ru/profile/editor/potemki`

2. **Starting article editor**
   - Clicking "Create publication" button (selector: `[data-testid="add-publication-button"]`)
   - Clicking "Write article" button (text: `"Написать статью"`)
   - Closing help popup window (ESC + JavaScript removal)

3. **Filling article (very important!)**
   - **First, fill the title** in the first available field:
     - Looking for fields with attributes containing "заголов", "title", "введите заголовок"
     - If no specific field found, use the first available field
     - Fill: title from feed.xml

   - **Then, fill the article body** in the second available field:
     - Looking for a field that is not the title field
     - Fill: full article text from feed.xml with HTML tag processing

4. **Press Enter**
   - After inserting article body, **Enter** is pressed

5. **Image insertion**
   - Using precise selector: `button.article-editor-desktop--side-button__sideButton-1z[data-tip="Вставить изображение"]`
   - When found, click the button
   - Insert image URL from feed.xml into the appearing field

6. **Publication**
   - **Step 1**: Clicking first publication button in article editor:
     - Precise selector: `button[data-testid="publish-btn"][type="submit"]`

   - **Step 2**: Clicking second publication button in modal window:
     - Precise selector: `button[data-testid="publish-btn"][type="submit"]` (same)

7. **Saving information**
   - After successful publication, information is saved to `published_articles.txt`

## Key Selectors

### Main Selectors

#### Add publication button
- `[data-testid="add-publication-button"]`

#### "Write article" button
- `text="Написать статью"`

#### Close modal button
- `[data-testid="close-button"]`

### Selectors for finding elements

#### General selectors for input fields
- `input[type="text"]`
- `textarea`
- `div[contenteditable="true"]`
- `div[role="textbox"]`

### Title selectors

#### Main title selectors
- `input[placeholder*="заголов" i]`
- `input[aria-label*="заголов" i]`
- `input[placeholder*="title" i]`
- `input[aria-label*="title" i]`
- `input[placeholder*="Введите заголовок"]`
- `input[aria-label*="Введите заголовок"]`
- `input[type="text"]:first-child`
- `div[contenteditable="true"]:first-child`
- `div[aria-label="Заголовок"] input`
- `div[aria-label="Редактор заголовка"] input`

#### Selectors for finding specific title fields
- `input[placeholder*="введите заголовок"]`
- `input[aria-label*="введите заголовок"]`

### Article body selectors

#### Main article body selectors
- `div[contenteditable="true"]:not([aria-label*="заголов"]):not([aria-label*="title"])`
- `div[contenteditable="true"]:not(:first-child)`
- `div[contenteditable="true"]:nth-child(2)`
- `div[contenteditable="true"]:nth-child(n+2)`
- `textarea[name*="content"]`
- `textarea[name*="text"]`
- `textarea`
- `.ProseMirror`
- `div[role="textbox"]`
- `div[contenteditable="true"]`
- `div.public-DraftEditorPlaceholder-inner`
- `div[aria-label="Текст статьи"]`
- `div[aria-label="Редактор статьи"]`
- `div[aria-label="Текст"]`

### Image selectors

#### Image insertion button
- `button:has-text("Вставить изображение")`
- `button:has-text("Добавить фото")`
- `button:has-text("Изображение")`
- `button:has-text("Фото")`
- `button:has-text("Вставить")`
- `button:has-text("Картинка")`
- `[data-testid*="image"] button`
- `.image-upload button`
- `[data-testid*="upload"] button`
- `button[aria-label*="изображение"]`
- `button[aria-label*="image"]`
- `button[aria-label*="photo"]`
- `button[aria-label*="picture"]`
- `button.article-editor-desktop--side-button__sideButton-1z[data-tip="Вставить изображение"]`

#### Image URL input field
- `input[placeholder*="ссылка"]`
- `input[placeholder*="url"]`
- `input[placeholder*="изображение"]`
- `input[placeholder*="image"]`
- `input[placeholder*="картинка"]`
- `input[type="text"]`
- `input`

### Publication selectors

#### First publication button (in article editor)
- `button[data-testid="publish-btn"][type="submit"]` (PRECISE SELECTOR FROM YOUR MESSAGE)
- `button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"])`
- `[data-testid="article-publish-btn"]:not([disabled]):not([aria-disabled="true"])`
- `button[data-testid*="publish"]:not([disabled]):not([aria-disabled="true"])`
- `button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"]):not([hidden])`

#### Publication confirmation button
- `button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"])`
- `button:has-text("Опубликовать сейчас"):not([disabled]):not([aria-disabled="true"])`
- `button:has-text("Да"):not([disabled]):not([aria-disabled="true"])`
- `button:has-text("Подтвердить"):not([disabled]):not([aria-disabled="true"])`

### Popup window selectors

#### Popup windows and modal elements
- `.ReactModal__Overlay`
- `.ReactModalPortal`
- `.article-editor-desktop--help-popup__overlay-3q`
- `.ReactModal__Overlay--after-open`
- `.article-editor-desktop--help-popup__overlay-3q`
- `.article-editor-desktop--help-popup__closeButton-2Z`
- `button[aria-label="Закрыть"]`
- `.ReactModal__Close`
- `[data-testid="close-button"]`
- `button:has-text("×")`
- `button:has-text("Закрыть")`
- `button:has-text("Close")`

#### Selectors for closing popup windows
- `button:has-text("Закрыть")`
- `button[aria-label="Закрыть"]`
- `button:has-text("×")`
- `[data-testid="close-button"]`

### Publication settings selectors

#### Who can comment
- `button:has-text("Подписчики")`
- `button:has-text("Все пользователи")`
- `div:has-text("Кто может комментировать")`
- `[data-testid*="comment"] button`

#### Publish later
- `button:has-text("Опубликовать позже")`
- `input[placeholder*="время"]`
- `input[placeholder*="час"]`
- `input[placeholder*="минут"]`

### Selectors from dzen-schema.json

#### Publication type selection modal window
- `html._theme_white.Theme_color_light > body.page.desktop > div.ReactModalPortal:nth-of-type(4) > div.ReactModal__Overlay.ReactModal__Overlay--after-open`

#### Image URL input field
- `div > div.article-editor-desktop--modal__modal-1l.article-editor-desktop--modal__withVerticalAlign-1Y > div.article-editor-desktop--modal__scrollbarFix-1o > div.article-editor-desktop--modal__content-1R.article-editor-desktop--image-popup__imagePopup-2b > div.article-editor-desktop--image-popup__urlInput-25:nth-of-type(2) > input`

#### Title field
- `html._theme_white.Theme_color_light > body.page.desktop > div.content:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__boundary-2W:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__content-3p > div:nth-of-type(2) > div.article-editor-desktop--editor__editor-36:nth-of-type(2) > div.article-editor-desktop--editor__center-2w:nth-of-type(2) > div.article-editor-desktop--editor__content-c8 > div.article-editor-desktop--editable-input__editableInput-oN.article-editor-desktop--editor__titleInput-2D > div.DraftEditor-root > div.DraftEditor-editorContainer:nth-of-type(2) > div.notranslate.public-DraftEditor-content > div > h1 > div.public-DraftStyleDefault-block.public-DraftStyleDefault-ltr`

#### Article body field
- `html._theme_white.Theme_color_light > body.page.desktop > div.content:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__boundary-2W:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__content-3p > div:nth-of-type(2) > div.article-editor-desktop--editor__editor-36:nth-of-type(2) > div.article-editor-desktop--editor__center-2w:nth-of-type(2) > div.article-editor-desktop--editor__content-c8 > div.article-editor-desktop--zen-draft-editor__zenEditor-13.article-editor-desktop--editor__zenDraftEditor-3x:nth-of-type(2) > div.article-editor-desktop--zen-draft-editor__placeholder-3z.article-editor-desktop--zen-draft-editor__hidden-29 > div.DraftEditor-root > div.DraftEditor-editorContainer > div.notranslate.public-DraftEditor-content > div`

#### Publication button
- `html._theme_white.Theme_color_light > body.page.desktop > div.content:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__boundary-2W:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__content-3p > div:nth-of-type(2) > div.article-editor-desktop--editor-header__editorHeader-2q.article-editor-desktop--editor-header__hasWideScroll-1S > div.article-editor-desktop--editor-header__container-3n > div.article-editor-desktop--editor-header__colRight-3Z:nth-of-type(3) > div.article-editor-desktop--editor-header__publishButton-gc > div.article-editor-desktop--editor-header__publishBtnContainer-3D > button.article-editor-desktop--editor-header__editBtn-44.article-editor-desktop--base-button__rootElement-75`

#### Publication confirmation modal window
- `html._theme_white.Theme_color_light > body.page.desktop > div:nth-of-type(5) > div.article-editor-desktop--modal__modal-1l.article-editor-desktop--modal__withFixedHeight-1r > div.article-editor-desktop--modal__scrollbarFix-1o > div.article-editor-desktop--modal__content-1R.article-editor-desktop--publication-modal__publicationModal-3P > div.article-editor-desktop--publication-settings__form-3p > div.article-editor-desktop--scrollable-content__scrollableContent-1i:nth-of-type(2) > div > div.article-editor-desktop--tab-content__tabContent-3D.article-editor-desktop--tab-content__active-in > div.article-editor-desktop--modal-content__modalContent-2B.article-editor-desktop--publication-settings__content-ya > div.article-editor-desktop--publication-settings__additional__publicationSettingsAdditional-2P:nth-of-type(2) > div.article-editor-desktop--publication-settings__additional__whoCanCommentSelect-2Y > div.article-editor-desktop--select-editor__wrapperWithTitle-KK > span.Select2.article-editor-desktop--select-editor__select-2q > button.article-editor-desktop--select-editor__trigger-2X > span.article-editor-desktop--select-editor__selectContent-2F`

#### "Publish" button in modal window
- `button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"])`
- `button:has-text("Опубликовать сейчас"):not([disabled]):not([aria-disabled="true"])`
- `button:has-text("Да"):not([disabled]):not([aria-disabled="true"])`
- `button:has-text("Подтвердить"):not([disabled]):not([aria-disabled="true"])`

#### "Publish later" button
- `html._theme_white.Theme_color_light > body.page.desktop > div:nth-of-type(5) > div.article-editor-desktop--modal__modal-1l.article-editor-desktop--modal__withFixedHeight-1r > div.article-editor-desktop--modal__scrollbarFix-1o > div.article-editor-desktop--modal__content-1R.article-editor-desktop--publication-modal__publicationModal-3P > div.article-editor-desktop--publication-settings__form-3p > div.article-editor-desktop--scrollable-content__scrollableContent-1i:nth-of-type(2) > div > div.article-editor-desktop--tab-content__tabContent-3D.article-editor-desktop--tab-content__active-in > div.article-editor-desktop--modal-content__modalContent-2B.article-editor-desktop--publication-settings__content-ya > div.article-editor-desktop--publication-settings__additional__publicationSettingsAdditional-2P:nth-of-type(2) > div.article-editor-desktop--publication-setting__delayed-publish__delayedPublishForm-33:nth-of-type(3) > div.article-editor-desktop--publication-setting__delayed-publish__checkbox-1q > label.article-editor-desktop--checkbox-input__rootElement-2A > div.article-editor-desktop--checkbox-v2__rootElement-2Z > input.article-editor-desktop--checkbox-v2__input-1y`

#### Publication time input field
- `input[placeholder*="час"]`
- `input[placeholder*="минут"]`
- `input[type="text"]`
- `input`

### Additional selectors

#### Selectors for finding buttons
- `button`
- `button[type="submit"]`
- `button[disabled]`
- `button[aria-disabled="true"]`
- `button[hidden]`

#### Selectors for visibility checking
- `[data-testid*="loading"]`
- `[data-testid*="overlay"]`
- `[data-testid*="spinner"]`

#### Navigation selectors
- `a[href*="/profile/"]`
- `a[href*="/editor/"]`
- `nav a`
- `[data-testid*="nav"]`

## Critical Points

### Critical moments
1. **Filling order**: Title → Article body (not vice versa!)
2. **Field verification**: Ensure title and body fields are different
3. **Closing popups**: Always close modal windows before filling fields
4. **Waiting for load**: Wait for editor to fully load
5. **Using precise selectors**: `[data-testid="publish-btn"][type="submit"]` for publication
6. **Pressing Enter**: After inserting article body, press Enter
7. **Image insertion**: Use precise selector for image insertion button
8. **Two-step publication**:
   - First button in article editor
   - Second button in confirmation modal

### Filling order
1. First, fill the title
2. Then, fill the article body
3. Press Enter after inserting article body
4. Insert image
5. Click publication button
6. Confirm publication (if required)

## Working with feed.xml

### Article structure in feed.xml

```xml
<rss version="2.0">
  <channel>
    <title>Your Channel</title>
    <item>
      <title><![CDATA[Article Title]]></title>
      <description><![CDATA[Article Description]]></description>
      <content:encoded><![CDATA[Article Text]]></content:encoded>
      <media:content url="https://image-link.jpg" type="image/jpeg"/>
      <link>https://article-link</link>
      <pubDate>Publication Date</pubDate>
    </item>
  </channel>
</rss>
```

### Data extraction
- Title: `<title>` (extracted from CDATA or regular tag)
- Description: `<description>` (extracted from CDATA or regular tag)
- Link: `<link>`
- Publication date: `<pubDate>`
- Image: `<media:content url="...">`
- Content: `<content:encoded>` (extracted from CDATA or regular tag)

### HTML tag processing
- Paragraphs `<p>` → double line breaks `\n\n`
- Headers `<h1>-<h6>` → line breaks `\n\n`
- Divs `<div>` → line breaks `\n`
- BR tags `<br>` → line breaks `\n`
- LI tags `<li>` → line breaks with indentation `\n• `
- All other tags are removed, text is preserved
- HTML entities are replaced with corresponding characters

## Errors and Solutions

### Common errors
1. **"Found 0 input fields"**
   - Cause: Page hasn't fully loaded yet
   - Solution: Add editor loading wait

2. **Field filling order**
   - Cause: Incorrect title and body filling order
   - Solution: First title, then article body

3. **Popup windows**
   - Cause: Modal windows intercept clicks
   - Solution: Close popups before filling fields

4. **Incorrect selectors**
   - Cause: Using outdated selectors
   - Solution: Use precise selectors from DOM

5. **Publication button not found**
   - Cause: Need to click 2 buttons - in editor and modal window
   - Solution: Use precise selectors for both buttons

### Solutions

1. **Closing popup windows**:
   ```javascript
   await page.evaluate(() => {
     const overlays = document.querySelectorAll('.ReactModal__Overlay, .ReactModalPortal, .article-editor-desktop--help-popup__overlay-3q');
     overlays.forEach(overlay => {
       overlay.style.display = 'none';
       overlay.style.visibility = 'hidden';
       overlay.style.pointerEvents = 'none';
       overlay.remove();
     });
   });
   await page.keyboard.press('Escape');
   ```

2. **HTML tag processing**:
   - Paragraphs `<p>` → double line breaks `\n\n`
   - Headers `<h1>-<h6>` → line breaks `\n\n`
   - Divs `<div>` → line breaks `\n`
   - BR tags `<br>` → line breaks `\n`
   - LI tags `<li>` → line breaks with indentation `\n• `
   - All other tags are removed, text is preserved
   - HTML entities are replaced with corresponding characters

### Publication Tracking System

To prevent republishing articles, a tracking system is used:

- File `published_articles.txt` contains publication history
- Each record contains date and article title
- Before publication, script checks if article was already published
- Only new articles from feed are published
- After successful publication, information is added to history file

Format of records in published_articles.txt:
```
2026-01-03 12:27:03 - Article Title
```

## Scripts Analysis

### Main Script
- **zen_auto_publisher.js**: The main script that handles the core functionality of reading articles from `feed.xml`, extracting data, and publishing to Dzen using precise selectors from `dzen-schema.json`.

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

### Script Relationships

#### Main Execution Path
```
zen_auto_publisher.js (main) 
├── modules/publication_history.js (history tracking)
└── dzen-schema.json (selectors)
```

#### Analysis Tools
```
selector_analyzer.js → dzen-schema.json (generates selectors)
simple_selector_analyzer.js → dzen-schema.json (generates selectors)
enhanced_dzen_analyzer.js → dzen-schema.json (generates selectors)
```

#### Alternative Publishers
```
dzen_publisher.js
├── dzen_publisher_enhanced.js (enhanced logging)
└── dzen_publisher_final.js (final implementation)
```

### Currently Active Components
- `zen_auto_publisher.js` - Main execution script
- `modules/publication_history.js` - Used by main script
- `dzen-schema.json` - Contains selectors for precise element targeting

## Security Notes

- Cookies are stored locally and not transmitted to servers
- Script runs locally on your computer
- Recommended to use a separate account for automation
- Use wisely to avoid account blocks
- Check selector relevance with interface updates
- Follow Dzen updates
- Note the two-step publication: in editor and modal window