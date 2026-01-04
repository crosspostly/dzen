# Селекторы для автоматического публишера Дзен

## Основные селекторы

### Кнопка добавления публикации
- `[data-testid="add-publication-button"]`

### Кнопка "Написать статью"
- `text="Написать статью"`

### Кнопка закрытия модального окна
- `[data-testid="close-button"]`

## Селекторы для поиска элементов

### Общие селекторы для полей ввода
- `input[type="text"]`
- `textarea`
- `div[contenteditable="true"]`
- `div[role="textbox"]`

## Селекторы для заголовка

### Основные селекторы заголовка
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

### Селекторы для поиска специфичных полей заголовка
- `input[placeholder*="введите заголовок"]`
- `input[aria-label*="введите заголовок"]`

## Селекторы для тела статьи

### Основные селекторы тела статьи
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

## Селекторы для изображений

### Кнопка вставки изображения
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

### Поле ввода URL изображения
- `input[placeholder*="ссылка"]`
- `input[placeholder*="url"]`
- `input[placeholder*="изображение"]`
- `input[placeholder*="image"]`
- `input[placeholder*="картинка"]`
- `input[type="text"]`
- `input`

## Селекторы для публикации

### Первая кнопка публикации (в редакторе статьи)
- `html._theme_white.Theme_color_light > body.page.desktop > div.content:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__boundary-2W:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__content-3p > div:nth-of-type(2) > div.article-editor-desktop--editor-header__editorHeader-2q.article-editor-desktop--editor-header__hasWideScroll-1S > div.article-editor-desktop--editor-header__container-3n > div.article-editor-desktop--editor-header__colRight-3Z:nth-of-type(3) > div.article-editor-desktop--editor-header__publishButton-gc > div.article-editor-desktop--editor-header__publishBtnContainer-3D > button.article-editor-desktop--editor-header__editBtn-44.article-editor-desktop--base-button__rootElement-75` (основной селектор из dzen-schema.json)

### Альтернативные селекторы для первой кнопки публикации
- `[data-testid="publish-btn"]`
- `button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"])`
- `[data-testid="article-publish-btn"]:not([disabled]):not([aria-disabled="true"])`
- `button[data-testid*="publish"]:not([disabled]):not([aria-disabled="true"])`
- `button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"]):not([hidden])`

### Вторая кнопка публикации (в модальном окне)
- `button[data-testid="publish-btn"][type="submit"]` (основной селектор из вашего сообщения)
- `button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"])`
- `button:has-text("Опубликовать сейчас"):not([disabled]):not([aria-disabled="true"])`
- `button:has-text("Да"):not([disabled]):not([aria-disabled="true"])`
- `button:has-text("Подтвердить"):not([disabled]):not([aria-disabled="true"])`

## Селекторы для всплывающих окон

### Всплывающие окна и модальные элементы
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

### Селекторы для закрытия всплывающих окон
- `button:has-text("Закрыть")`
- `button[aria-label="Закрыть"]`
- `button:has-text("×")`
- `[data-testid="close-button"]`

## Селекторы для настроек публикации

### Кто может комментировать
- `button:has-text("Подписчики")`
- `button:has-text("Все пользователи")`
- `div:has-text("Кто может комментировать")`
- `[data-testid*="comment"] button`

### Публикация позже
- `button:has-text("Опубликовать позже")`
- `input[placeholder*="время"]`
- `input[placeholder*="час"]`
- `input[placeholder*="минут"]`

## Селекторы из dzen-schema.json

### Модальное окно выбора типа публикации
- `html._theme_white.Theme_color_light > body.page.desktop > div.ReactModalPortal:nth-of-type(4) > div.ReactModal__Overlay.ReactModal__Overlay--after-open`

### Поле ввода URL изображения
- `div > div.article-editor-desktop--modal__modal-1l.article-editor-desktop--modal__withVerticalAlign-1Y > div.article-editor-desktop--modal__scrollbarFix-1o > div.article-editor-desktop--modal__content-1R.article-editor-desktop--image-popup__imagePopup-2b > div.article-editor-desktop--image-popup__urlInput-25:nth-of-type(2) > input`

### Поле заголовка
- `html._theme_white.Theme_color_light > body.page.desktop > div.content:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__boundary-2W:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__content-3p > div:nth-of-type(2) > div.article-editor-desktop--editor__editor-36:nth-of-type(2) > div.article-editor-desktop--editor__center-2w:nth-of-type(2) > div.article-editor-desktop--editor__content-c8 > div.article-editor-desktop--editable-input__editableInput-oN.article-editor-desktop--editor__titleInput-2D > div.DraftEditor-root > div.DraftEditor-editorContainer:nth-of-type(2) > div.notranslate.public-DraftEditor-content > div > h1 > div.public-DraftStyleDefault-block.public-DraftStyleDefault-ltr`

### Поле тела статьи
- `html._theme_white.Theme_color_light > body.page.desktop > div.content:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__boundary-2W:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__content-3p > div:nth-of-type(2) > div.article-editor-desktop--editor__editor-36:nth-of-type(2) > div.article-editor-desktop--editor__center-2w:nth-of-type(2) > div.article-editor-desktop--editor__content-c8 > div.article-editor-desktop--zen-draft-editor__zenEditor-13.article-editor-desktop--editor__zenDraftEditor-3x:nth-of-type(2) > div.article-editor-desktop--zen-draft-editor__placeholder-3z.article-editor-desktop--zen-draft-editor__hidden-29 > div.DraftEditor-root > div.DraftEditor-editorContainer > div.notranslate.public-DraftEditor-content > div`

### Первая кнопка публикации (в редакторе статьи)
- `html._theme_white.Theme_color_light > body.page.desktop > div.content:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__boundary-2W:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__content-3p > div:nth-of-type(2) > div.article-editor-desktop--editor-header__editorHeader-2q.article-editor-desktop--editor-header__hasWideScroll-1S > div.article-editor-desktop--editor-header__container-3n > div.article-editor-desktop--editor-header__colRight-3Z:nth-of-type(3) > div.article-editor-desktop--editor-header__publishButton-gc > div.article-editor-desktop--editor-header__publishBtnContainer-3D > button.article-editor-desktop--editor-header__editBtn-44.article-editor-desktop--base-button__rootElement-75`

### Модальное окно подтверждения публикации
- `html._theme_white.Theme_color_light > body.page.desktop > div:nth-of-type(5) > div.article-editor-desktop--modal__modal-1l.article-editor-desktop--modal__withFixedHeight-1r > div.article-editor-desktop--modal__scrollbarFix-1o > div.article-editor-desktop--modal__content-1R.article-editor-desktop--publication-modal__publicationModal-3P > div.article-editor-desktop--publication-settings__form-3p > div.article-editor-desktop--scrollable-content__scrollableContent-1i:nth-of-type(2) > div > div.article-editor-desktop--tab-content__tabContent-3D.article-editor-desktop--tab-content__active-in > div.article-editor-desktop--modal-content__modalContent-2B.article-editor-desktop--publication-settings__content-ya > div.article-editor-desktop--publication-settings__additional__publicationSettingsAdditional-2P:nth-of-type(2) > div.article-editor-desktop--publication-settings__additional__whoCanCommentSelect-2Y > div.article-editor-desktop--select-editor__wrapperWithTitle-KK > span.Select2.article-editor-desktop--select-editor__select-2q > button.article-editor-desktop--select-editor__trigger-2X > span.article-editor-desktop--select-editor__selectContent-2F`

### Кнопка "Опубликовать" в модальном окне
- `button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"])`
- `button:has-text("Опубликовать сейчас"):not([disabled]):not([aria-disabled="true"])`
- `button:has-text("Да"):not([disabled]):not([aria-disabled="true"])`
- `button:has-text("Подтвердить"):not([disabled]):not([aria-disabled="true"])`

### Кнопка "Опубликовать позже"
- `html._theme_white.Theme_color_light > body.page.desktop > div:nth-of-type(5) > div.article-editor-desktop--modal__modal-1l.article-editor-desktop--modal__withFixedHeight-1r > div.article-editor-desktop--modal__scrollbarFix-1o > div.article-editor-desktop--modal__content-1R.article-editor-desktop--publication-modal__publicationModal-3P > div.article-editor-desktop--publication-settings__form-3p > div.article-editor-desktop--scrollable-content__scrollableContent-1i:nth-of-type(2) > div > div.article-editor-desktop--tab-content__tabContent-3D.article-editor-desktop--tab-content__active-in > div.article-editor-desktop--modal-content__modalContent-2B.article-editor-desktop--publication-settings__content-ya > div.article-editor-desktop--publication-settings__additional__publicationSettingsAdditional-2P:nth-of-type(2) > div.article-editor-desktop--publication-setting__delayed-publish__delayedPublishForm-33:nth-of-type(3) > div.article-editor-desktop--publication-setting__delayed-publish__checkbox-1q > label.article-editor-desktop--checkbox-input__rootElement-2A > div.article-editor-desktop--checkbox-v2__rootElement-2Z > input.article-editor-desktop--checkbox-v2__input-1y`

### Поле ввода времени публикации
- `input[placeholder*="час"]`
- `input[placeholder*="минут"]`
- `input[type="text"]`
- `input`

## Дополнительные селекторы

### Селекторы для поиска кнопок
- `button`
- `button[type="submit"]`
- `button[disabled]`
- `button[aria-disabled="true"]`
- `button[hidden]`

### Селекторы для проверки видимости
- `[data-testid*="loading"]`
- `[data-testid*="overlay"]`
- `[data-testid*="spinner"]`

### Селекторы для навигации
- `a[href*="/profile/"]`
- `a[href*="/editor/"]`
- `nav a`
- `[data-testid*="nav"]`