# 🎯 Простой план переорганизации статей

## Что нужно сделать?

**Переместить 11 опубликованных статей из `articles/women-35-60/` в новую папку `articles/published/`**

Это разделит:
- ✅ **Опубликованные статьи** → `articles/published/2025/12/{20,21,22}/`
- ✅ **Черновики и недо-опубликованные** → `articles/women-35-60/`

---

## Какие 11 статей переместить?

### 📅 Дата: 20 декабря (5 статей)
1. `muchitelnyy-styd-20-let-davil-na-menya-i-teper-ya--1766247250373.txt`
2. `ya-30-let-zhila-s-etim-pozorom-poka-ne-ponyala-cht-1766250498770.txt`
3. `ya-derzhala-foto-poka-ono-ne-obnazhilo-pozornuyu-p-1766230733370.txt`
4. `ya-sluchayno-otkryla-korobku-i-styd-za-proshloe-pe-1766240127572.txt`
5. `ya-uznala-pravdu-iz-dnevnika-docheri-i-eto-dalo-na-1766251406206.txt`

### 📅 Дата: 21 декабря (3 статьи)
6. `etot-ideal-mamy-byl-lozhyu-ee-pismo-raskrylo-kto-y-1766318654127.txt`
7. `moya-glavnaya-pravda-v-55-let-pokazala-mne-nastoyas-1766322256813.txt`
8. *(+ еще одна статья если есть)*

### 📅 Дата: 22 декабря (3 статьи)
9. `ves-gorod-zaviduet-moemu-triumfu-no-nikto-ne-vidit-1766411546145.txt`
10. `ya-godami-skryvala-svoy-pozor-no-odin-postupok-raz-1766415745452.txt`
11. `ya-tridtsat-let-zhila-s-chuvstvom-styda-poka-sluch-1766420849922.txt`

---

## Шаг за шагом (как это сделать)

### Шаг 1️⃣ - Создать новую структуру папок
```bash
mkdir -p articles/published/2025/12/20
mkdir -p articles/published/2025/12/21
mkdir -p articles/published/2025/12/22
```

### Шаг 2️⃣ - Переместить файлы текста (20 декабря)
```bash
git mv articles/women-35-60/2025-12-20/muchitelnyy-styd-20-let-davil-na-menya-i-teper-ya--1766247250373.txt articles/published/2025/12/20/
git mv articles/women-35-60/2025-12-20/ya-30-let-zhila-s-etim-pozorom-poka-ne-ponyala-cht-1766250498770.txt articles/published/2025/12/20/
git mv articles/women-35-60/2025-12-20/ya-derzhala-foto-poka-ono-ne-obnazhilo-pozornuyu-p-1766230733370.txt articles/published/2025/12/20/
git mv articles/women-35-60/2025-12-20/ya-sluchayno-otkryla-korobku-i-styd-za-proshloe-pe-1766240127572.txt articles/published/2025/12/20/
git mv articles/women-35-60/2025-12-20/ya-uznala-pravdu-iz-dnevnika-docheri-i-eto-dalo-na-1766251406206.txt articles/published/2025/12/20/
```

### Шаг 3️⃣ - Переместить картинки (20 декабря)
```bash
git mv articles/women-35-60/2025-12-20/muchitelnyy-styd-20-let-davil-na-menya-i-teper-ya--1766247250373.png articles/published/2025/12/20/
git mv articles/women-35-60/2025-12-20/ya-30-let-zhila-s-etim-pozorom-poka-ne-ponyala-cht-1766250498770-cover.jpg articles/published/2025/12/20/
# ... и остальные картинки из этого дня
```

### Шаг 4️⃣ - Сделать то же для 21-го и 22-го
```bash
# 21 декабря - переместить 3 статьи + картинки
git mv articles/women-35-60/2025-12-21/etot-ideal-mamy-byl-lozhyu-ee-pismo-raskrylo-kto-y-1766318654127.txt articles/published/2025/12/21/
# ... и остальные

# 22 декабря - переместить 3 статьи + картинки
git mv articles/women-35-60/2025-12-22/ves-gorod-zaviduet-moemu-triumfu-no-nikto-ne-vidit-1766411546145.txt articles/published/2025/12/22/
# ... и остальные
```

### Шаг 5️⃣ - Закоммитить все
```bash
git commit -m "refactor: move published articles to articles/published/ directory structure"
```

### Шаг 6️⃣ - Проверить результат
```bash
# Должно быть примерно так:
ls -la articles/published/2025/12/20/
ls -la articles/published/2025/12/21/
ls -la articles/published/2025/12/22/

# И в женской папке остаются только черновики:
ls articles/women-35-60/
```

---

## Готово! ✅

После этого:
1. **Push** в GitHub
2. **Создай PR** из твоей ветки в main
3. **Merge** и радуйся организованной структуре!

---

## Если что-то пошло не так 🔄

```bash
# Откатить последний коммит:
git reset --hard HEAD~1

# И начать заново
```
