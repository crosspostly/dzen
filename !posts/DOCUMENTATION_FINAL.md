# Документация по автоматическому публишеру Дзен

## Содержание
1. [Общая информация](#общая-информация)
2. [Структура проекта](#структура-проекта)
3. [Алгоритм публикации](#алгоритм-публикации)
4. [Важные селекторы](#важные-селекторы)
5. [Последовательность действий](#последовательность-действий)
6. [Работа с feed.xml](#работа-с-feedxml)
7. [Ошибки и решения](#ошибки-и-решения)
8. [Полезные команды](#полезные-команды)

## Общая информация

Автоматический публишер для Яндекс Дзен, который публикует статьи из RSS-файда с полным текстом и изображениями, используя точные селекторы из dzen-schema.json.

## Структура проекта

```
!a_posts/
├── config/
│   ├── cookies.json          # Файл с куки для авторизации
│   └── config.json           # Конфигурационный файл
├── public/
│   └── feed.xml              # RSS-фид с статьями
├── final_exact_publisher_updated.js  # Финальный рабочий скрипт публикации
├── DOCUMENTATION.md          # Этот файл
└── README.md                 # Краткое руководство
```

## Алгоритм публикации

### Последовательность действий

1. **Подготовка**
   - Загрузка куки из файла `./config/cookies.json`
   - Открытие браузера с нужными настройками
   - Переход на страницу `https://dzen.ru/profile/editor/potemki`

2. **Запуск редактора статьи**
   - Нажатие кнопки "Создать публикацию" (селектор: `[data-testid="add-publication-button"]`)
   - Нажатие кнопки "Написать статью" (текст: `"Написать статью"`)
   - Закрытие всплывающего окна помощи (ESC + JavaScript удаление)

3. **Заполнение статьи (очень важно!)**
   - **Сначала заполняем заголовок** в первое доступное поле:
     - Ищем поля с атрибутами, содержащими "заголов", "title", "введите заголовок"
     - Если специфичное поле не найдено, используем первое доступное поле
     - Заполняем: заголовок из feed.xml

   - **Затем заполняем тело статьи** во второе доступное поле:
     - Ищем поле, которое не является полем заголовка
     - Заполняем: полный текст статьи из feed.xml с обработкой HTML-тегов

4. **Нажатие Enter**
   - После вставки тела статьи обязательно нажимается **Enter**

5. **Вставка изображения**
   - Ищем кнопку вставки изображения по точному селектору:
     - `button.article-editor-desktop--side-button__sideButton-1z[data-tip="Вставить изображение"]`
   - При нахождении нажимаем кнопку
   - Вставляем URL изображения из feed.xml в появившееся поле

6. **Публикация (2 шага!)**
   - **Шаг 1**: Нажатие первой кнопки публикации в редакторе статьи:
     - Точный селектор: `html._theme_white.Theme_color_light > body.page.desktop > div.content:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__boundary-2W:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__content-3p > div:nth-of-type(2) > div.article-editor-desktop--editor-header__editorHeader-2q.article-editor-desktop--editor-header__hasWideScroll-1S > div.article-editor-desktop--editor-header__container-3n > div.article-editor-desktop--editor-header__colRight-3Z:nth-of-type(3) > div.article-editor-desktop--editor-header__publishButton-gc > div.article-editor-desktop--editor-header__publishBtnContainer-3D > button.article-editor-desktop--editor-header__editBtn-44.article-editor-desktop--base-button__rootElement-75`
   
   - **Шаг 2**: Нажатие второй кнопки публикации в модальном окне:
     - Точный селектор: `button[data-testid="publish-btn"][type="submit"]`
     - Альтернативный селектор: `button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"])`

## Важные селекторы

### Основные селекторы

#### Кнопка добавления публикации
- `[data-testid="add-publication-button"]`

#### Кнопка "Написать статью"
- `text="Написать статью"`

#### Кнопка закрытия модального окна
- `[data-testid="close-button"]`

### Селекторы для поиска элементов

#### Общие селекторы для полей ввода
- `input[type="text"]`
- `textarea`
- `div[contenteditable="true"]`
- `div[role="textbox"]`

### Селекторы для заголовка

#### Основные селекторы заголовка
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

#### Селекторы для поиска специфичных полей заголовка
- `input[placeholder*="введите заголовок"]`
- `input[aria-label*="введите заголовок"]`

### Селекторы для тела статьи

#### Основные селекторы тела статьи
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

### Селекторы для изображений

#### Кнопка вставки изображения
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

#### Поле ввода URL изображения
- `input[placeholder*="ссылка"]`
- `input[placeholder*="url"]`
- `input[placeholder*="изображение"]`
- `input[placeholder*="image"]`
- `input[placeholder*="картинка"]`
- `input[type="text"]`
- `input`

### Селекторы для публикации

#### Первая кнопка публикации (в редакторе статьи)
- `html._theme_white.Theme_color_light > body.page.desktop > div.content:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__boundary-2W:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__content-3p > div:nth-of-type(2) > div.article-editor-desktop--editor-header__editorHeader-2q.article-editor-desktop--editor-header__hasWideScroll-1S > div.article-editor-desktop--editor-header__container-3n > div.article-editor-desktop--editor-header__colRight-3Z:nth-of-type(3) > div.article-editor-desktop--editor-header__publishButton-gc > div.article-editor-desktop--editor-header__publishBtnContainer-3D > button.article-editor-desktop--editor-header__editBtn-44.article-editor-desktop--base-button__rootElement-75` (основной селектор из dzen-schema.json)

#### Альтернативные селекторы для первой кнопки публикации
- `[data-testid="publish-btn"]`
- `button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"])`
- `[data-testid="article-publish-btn"]:not([disabled]):not([aria-disabled="true"])`
- `button[data-testid*="publish"]:not([disabled]):not([aria-disabled="true"])`
- `button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"]):not([hidden])`

#### Вторая кнопка публикации (в модальном окне)
- `button[data-testid="publish-btn"][type="submit"]` (основной селектор из вашего сообщения)
- `button:has-text("Опубликовать"):not([disabled]):not([aria-disabled="true"])`
- `button:has-text("Опубликовать сейчас"):not([disabled]):not([aria-disabled="true"])`
- `button:has-text("Да"):not([disabled]):not([aria-disabled="true"])`
- `button:has-text("Подтвердить"):not([disabled]):not([aria-disabled="true"])`

### Селекторы для всплывающих окон

#### Всплывающие окна и модальные элементы
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

#### Селекторы для закрытия всплывающих окон
- `button:has-text("Закрыть")`
- `button[aria-label="Закрыть"]`
- `button:has-text("×")`
- `[data-testid="close-button"]`

### Селекторы для настроек публикации

#### Кто может комментировать
- `button:has-text("Подписчики")`
- `button:has-text("Все пользователи")`
- `div:has-text("Кто может комментировать")`
- `[data-testid*="comment"] button`

#### Публикация позже
- `button:has-text("Опубликовать позже")`
- `input[placeholder*="время"]`
- `input[placeholder*="час"]`
- `input[placeholder*="минут"]`

### Селекторы из dzen-schema.json

#### Модальное окно выбора типа публикации
- `html._theme_white.Theme_color_light > body.page.desktop > div.ReactModalPortal:nth-of-type(4) > div.ReactModal__Overlay.ReactModal__Overlay--after-open`

#### Поле ввода URL изображения
- `div > div.article-editor-desktop--modal__modal-1l.article-editor-desktop--modal__withVerticalAlign-1Y > div.article-editor-desktop--modal__scrollbarFix-1o > div.article-editor-desktop--modal__content-1R.article-editor-desktop--image-popup__imagePopup-2b > div.article-editor-desktop--image-popup__urlInput-25:nth-of-type(2) > input`

#### Поле заголовка
- `html._theme_white.Theme_color_light > body.page.desktop > div.content:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__boundary-2W:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__content-3p > div:nth-of-type(2) > div.article-editor-desktop--editor__editor-36:nth-of-type(2) > div.article-editor-desktop--editor__center-2w:nth-of-type(2) > div.article-editor-desktop--editor__content-c8 > div.article-editor-desktop--editable-input__editableInput-oN.article-editor-desktop--editor__titleInput-2D > div.DraftEditor-root > div.DraftEditor-editorContainer:nth-of-type(2) > div.notranslate.public-DraftEditor-content > div > h1 > div.public-DraftStyleDefault-block.public-DraftStyleDefault-ltr`

#### Поле тела статьи
- `html._theme_white.Theme_color_light > body.page.desktop > div.content:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__boundary-2W:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__content-3p > div:nth-of-type(2) > div.article-editor-desktop--editor__editor-36:nth-of-type(2) > div.article-editor-desktop--editor__center-2w:nth-of-type(2) > div.article-editor-desktop--editor__content-c8 > div.article-editor-desktop--zen-draft-editor__zenEditor-13.article-editor-desktop--editor__zenDraftEditor-3x:nth-of-type(2) > div.article-editor-desktop--zen-draft-editor__placeholder-3z.article-editor-desktop--zen-draft-editor__hidden-29 > div.DraftEditor-root > div.DraftEditor-editorContainer > div.notranslate.public-DraftEditor-content > div`

#### Кнопка публикации (первая)
- `html._theme_white.Theme_color_light > body.page.desktop > div.content:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__boundary-2W:nth-of-type(2) > div.article-editor-desktop--loading-boundary-stacked-layout__content-3p > div:nth-of-type(2) > div.article-editor-desktop--editor-header__editorHeader-2q.article-editor-desktop--editor-header__hasWideScroll-1S > div.article-editor-desktop--editor-header__container-3n > div.article-editor-desktop--editor-header__colRight-3Z:nth-of-type(3) > div.article-editor-desktop--editor-header__publishButton-gc > div.article-editor-desktop--editor-header__publishBtnContainer-3D > button.article-editor-desktop--editor-header__editBtn-44.article-editor-desktop--base-button__rootElement-75`

#### Модальное окно подтверждения публикации
- `html._theme_white.Theme_color_light > body.page.desktop > div:nth-of-type(5) > div.article-editor-desktop--modal__modal-1l.article-editor-desktop--modal__withFixedHeight-1r > div.article-editor-desktop--modal__scrollbarFix-1o > div.article-editor-desktop--modal__content-1R.article-editor-desktop--publication-modal__publicationModal-3P > div.article-editor-desktop--publication-settings__form-3p > div.article-editor-desktop--scrollable-content__scrollableContent-1i:nth-of-type(2) > div > div.article-editor-desktop--tab-content__tabContent-3D.article-editor-desktop--tab-content__active-in > div.article-editor-desktop--modal-content__modalContent-2B.article-editor-desktop--publication-settings__content-ya > div.article-editor-desktop--publication-settings__additional__publicationSettingsAdditional-2P:nth-of-type(2) > div.article-editor-desktop--publication-settings__additional__whoCanCommentSelect-2Y > div.article-editor-desktop--select-editor__wrapperWithTitle-KK > span.Select2.article-editor-desktop--select-editor__select-2q > button.article-editor-desktop--select-editor__trigger-2X > span.article-editor-desktop--select-editor__selectContent-2F`

#### Кнопка "Опубликовать" в модальном окне (вторая)
- `button[data-testid="publish-btn"][type="submit"]`
- `html._theme_white.Theme_color_light > body.page.desktop > div:nth-of-type(5) > div.article-editor-desktop--modal__modal-1l.article-editor-desktop--modal__withFixedHeight-1r > div.article-editor-desktop--modal__scrollbarFix-1o > div.article-editor-desktop--modal__content-1R.article-editor-desktop--publication-modal__publicationModal-3P > div.article-editor-desktop--publication-settings__form-3p > div.article-editor-desktop--modal-actions__modalActions-1M:nth-of-type(4) > div.article-editor-desktop--publication-settings__actions__action-xt > button.article-editor-desktop--base-button__rootElement-75.article-editor-desktop--base-button__l-3Z`

### Дополнительные селекторы

#### Селекторы для поиска кнопок
- `button`
- `button[type="submit"]`
- `button[disabled]`
- `button[aria-disabled="true"]`
- `button[hidden]`

#### Селекторы для проверки видимости
- `[data-testid*="loading"]`
- `[data-testid*="overlay"]`
- `[data-testid*="spinner"]`

#### Селекторы для навигации
- `a[href*="/profile/"]`
- `a[href*="/editor/"]`
- `nav a`
- `[data-testid*="nav"]`

## Последовательность действий

### Критически важные моменты

1. **Порядок заполнения**: Заголовок → Тело статьи (не наоборот!)
2. **Проверка полей**: Убедиться, что поля заголовка и тела разные
3. **Закрытие всплывающих окон**: Обязательно закрывать модальные окна до заполнения полей
4. **Ожидание загрузки**: Дожидаться полной загрузки редактора
5. **Использование точных селекторов**: `[data-testid="publish-btn"]` для публикации
6. **Нажатие Enter**: После вставки тела статьи нужно нажать Enter
7. **Вставка изображения**: Использовать точный селектор кнопки вставки изображения
8. **Два шага публикации**: 
   - Первая кнопка в редакторе статьи
   - Вторая кнопка в модальном окне подтверждения

### Порядок заполнения

1. Сначала заполняем заголовок
2. Затем заполняем тело статьи
3. Нажимаем Enter после вставки тела статьи
4. Находим и нажимаем кнопку вставки изображения
5. Вставляем URL изображения
6. Нажимаем первую кнопку публикации (в редакторе)
7. Нажимаем вторую кнопку публикации (в модальном окне)

## Работа с feed.xml

### Структура статьи в feed.xml

```xml
<rss version="2.0">
  <channel>
    <title>Ваш канал</title>
    <item>
      <title><![CDATA[Заголовок статьи]]></title>
      <description><![CDATA[Описание статьи]]></description>
      <content:encoded><![CDATA[Текст статьи]]></content:encoded>
      <media:content url="https://ссылка-на-изображение.jpg" type="image/jpeg"/>
      <link>https://ссылка-на-статью</link>
      <pubDate>Дата публикации</pubDate>
    </item>
  </channel>
</rss>
```

### Извлечение данных

- Заголовок: `<title>` (извлекается из CDATA или обычного тега)
- Описание: `<description>` (извлекается из CDATA или обычного тега)
- Ссылка: `<link>`
- Дата публикации: `<pubDate>`
- Изображение: `<media:content url="...">`
- Контент: `<content:encoded>` (извлекается из CDATA или обычного тега)

### Обработка HTML-тегов

- Параграфы `<p>` → двойные переносы строк `\n\n`
- Заголовки `<h1>-<h6>` → переносы строк `\n\n`
- Div-ы `<div>` → переносы строк `\n`
- BR-теги `<br>` → переносы строк `\n`
- LI-теги `<li>` → переносы строк с отступом `\n• `
- Все остальные теги удаляются, текст сохраняется
- HTML сущности заменяются на соответствующие символы

## Ошибки и решения

### Распространенные ошибки

1. **"Найдено 0 полей ввода"**
   - Причина: Страница еще не полностью загрузилась
   - Решение: Добавить ожидание загрузки редактора

2. **Порядок заполнения полей**
   - Причина: Неправильный порядок заполнения заголовка и тела
   - Решение: Сначала заголовок, затем тело статьи

3. **Всплывающие окна**
   - Причина: Модальные окна перехватывают клики
   - Решение: Закрывать всплывающие окна до заполнения полей

4. **Неправильные селекторы**
   - Причина: Использование устаревших селекторов
   - Решение: Использовать точные селекторы из dzen-schema.json

5. **Кнопка публикации не найдена**
   - Причина: Нужно нажать 2 кнопки - в редакторе и в модальном окне
   - Решение: Использовать точные селекторы для обеих кнопок

6. **Повторная публикация статей**
   - Причина: Скрипт пытается опубликовать уже опубликованные статьи
   - Решение: Использовать систему отслеживания публикаций в файле published_articles.txt

### Система отслеживания публикаций

Для предотвращения повторной публикации статей используется система отслеживания:

- Файл `published_articles.txt` содержит историю опубликованных статей
- Каждая запись содержит дату и заголовок статьи
- Перед публикацией скрипт проверяет, была ли статья уже опубликована
- Публикуются только новые статьи из фида
- После успешной публикации информация добавляется в файл истории

Формат записи в published_articles.txt:
```
2026-01-03 12:27:03 - Название статьи
```

### Решения проблем

1. **Закрытие всплывающих окон**:
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

### Решения проблем

1. **Закрытие всплывающих окон**:
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

2. **Поиск точных селекторов**:
   - Использовать точные селекторы из DOM
   - Проверять видимость элементов перед взаимодействием
   - Использовать JavaScript для кликов, чтобы обойти перехват событий

3. **Два шага публикации**:
   - Сначала нажать кнопку в редакторе статьи
   - Затем нажать кнопку в модальном окне подтверждения

## Полезные команды

### Запуск публикации из фида
```bash
cd !a_posts
node final_exact_publisher_updated.js
```

### Анализ фида
```bash
cd !a_posts
node analyze_feed.js
```

### Запуск других скриптов
```bash
cd !a_posts
node publish_from_feed_simple.js
node action_recorder_with_json.js
```

### Проверка файлов куки
```bash
cat config/cookies.json
```

## Требования к файлам

### cookies.json
Файл должен содержать куки для авторизации в Дзен:
```json
[
  {
    "name": "Session_id",
    "value": "ваш_session_id_здесь",
    "domain": ".dzen.ru",
    "path": "/",
    "expires": -1,
    "httpOnly": true,
    "secure": true,
    "sameSite": "Lax"
  },
  {
    "name": "yandexuid",
    "value": "ваш_yandexuid_здесь",
    "domain": ".dzen.ru",
    "path": "/",
    "expires": -1,
    "httpOnly": false,
    "secure": true,
    "sameSite": "Lax"
  }
]
```

### feed.xml
Файл должен содержать RSS-ленту со статьями в формате, описанном выше.

## Зависимости

- Playwright для автоматизации браузера
- Node.js v14+
- npm для управления зависимостями

## Безопасность

- Куки хранятся локально и не передаются на серверы
- Скрипт работает локально на вашем компьютере
- Рекомендуется использовать отдельный аккаунт для автоматизации

## Примечания

- Используйте с умом, чтобы избежать блокировок аккаунта
- Проверяйте актуальность селекторов при обновлениях интерфейса
- Следите за обновлениями Дзен
- Обратите внимание на два шага публикации: в редакторе и в модальном окне