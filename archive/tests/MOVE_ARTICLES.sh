#!/bin/bash

# Script to move published articles from articles/women-35-60/YYYY-MM-DD/
# to articles/published/YYYY/MM/DD/ structure

echo "🚀 Moving published articles..."

# Create published directory structure
mkdir -p articles/published/2025/12

# Move 2025-12-21 "ideal_mamy" article
mkdir -p articles/published/2025/12/21
git mv articles/women-35-60/2025-12-21/etot-ideal-mamy-byl-lozhyu-ee-pismo-raskrylo-kto-y-1766318654127.txt articles/published/2025/12/21/ 2>/dev/null || cp articles/women-35-60/2025-12-21/etot-ideal-mamy-byl-lozhyu-ee-pismo-raskrylo-kto-y-1766318654127.txt articles/published/2025/12/21/
git mv articles/women-35-60/2025-12-21/etot-ideal-mamy-byl-lozhyu-ee-pismo-raskrylo-kto-y-1766318654127-cover.jpg articles/published/2025/12/21/ 2>/dev/null || cp articles/women-35-60/2025-12-21/etot-ideal-mamy-byl-lozhyu-ee-pismo-raskrylo-kto-y-1766318654127-cover.jpg articles/published/2025/12/21/

# Move 2025-12-21 "pravda_v_55" article
git mv articles/women-35-60/2025-12-21/moya-glavnaya-pravda-v-55-muzh-byl-chuzhim-i-ya-vp-1766307662275.txt articles/published/2025/12/21/ 2>/dev/null || cp articles/women-35-60/2025-12-21/moya-glavnaya-pravda-v-55-muzh-byl-chuzhim-i-ya-vp-1766307662275.txt articles/published/2025/12/21/
git mv articles/women-35-60/2025-12-21/moya-glavnaya-pravda-v-55-muzh-byl-chuzhim-i-ya-vp-1766307662275-cover.jpg articles/published/2025/12/21/ 2>/dev/null || cp articles/women-35-60/2025-12-21/moya-glavnaya-pravda-v-55-muzh-byl-chuzhim-i-ya-vp-1766307662275-cover.jpg articles/published/2025/12/21/

# Move 2025-12-20 articles
mkdir -p articles/published/2025/12/20

# ya-uznala-pravdu
git mv articles/women-35-60/2025-12-20/ya-uznala-pravdu-iz-dnevnika-docheri-i-eto-dalo-na-1766251406206.txt articles/published/2025/12/20/ 2>/dev/null || cp articles/women-35-60/2025-12-20/ya-uznala-pravdu-iz-dnevnika-docheri-i-eto-dalo-na-1766251406206.txt articles/published/2025/12/20/
git mv articles/women-35-60/2025-12-20/ya-uznala-pravdu-iz-dnevnika-docheri-i-eto-dalo-na-1766251406206-cover.jpg articles/published/2025/12/20/ 2>/dev/null || cp articles/women-35-60/2025-12-20/ya-uznala-pravdu-iz-dnevnika-docheri-i-eto-dalo-na-1766251406206-cover.jpg articles/published/2025/12/20/

# muchitelnyy-styd
git mv articles/women-35-60/2025-12-20/muchitelnyy-styd-20-let-davil-na-menya-i-teper-ya--1766247250373.txt articles/published/2025/12/20/ 2>/dev/null || cp articles/women-35-60/2025-12-20/muchitelnyy-styd-20-let-davil-na-menya-i-teper-ya--1766247250373.txt articles/published/2025/12/20/
git mv articles/women-35-60/2025-12-20/muchitelnyy-styd-20-let-davil-na-menya-i-teper-ya--1766247250373.png articles/published/2025/12/20/ 2>/dev/null || cp articles/women-35-60/2025-12-20/muchitelnyy-styd-20-let-davil-na-menya-i-teper-ya--1766247250373.png articles/published/2025/12/20/

# ya-derzhala-foto
git mv articles/women-35-60/2025-12-20/ya-derzhala-foto-poka-ono-ne-obnazhilo-pozornuyu-p-1766230733370.txt articles/published/2025/12/20/ 2>/dev/null || cp articles/women-35-60/2025-12-20/ya-derzhala-foto-poka-ono-ne-obnazhilo-pozornuyu-p-1766230733370.txt articles/published/2025/12/20/
git mv articles/women-35-60/2025-12-20/ya-derzhala-foto-poka-ono-ne-obnazhilo-pozornuyu-p-1766230733370.png articles/published/2025/12/20/ 2>/dev/null || cp articles/women-35-60/2025-12-20/ya-derzhala-foto-poka-ono-ne-obnazhilo-pozornuyu-p-1766230733370.png articles/published/2025/12/20/

# ya-30-let-zhila
git mv articles/women-35-60/2025-12-20/ya-30-let-zhila-s-etim-pozorom-poka-ne-ponyala-cht-1766250498770.txt articles/published/2025/12/20/ 2>/dev/null || cp articles/women-35-60/2025-12-20/ya-30-let-zhila-s-etim-pozorom-poka-ne-ponyala-cht-1766250498770.txt articles/published/2025/12/20/
git mv articles/women-35-60/2025-12-20/ya-30-let-zhila-s-etim-pozorom-poka-ne-ponyala-cht-1766250498770-cover.jpg articles/published/2025/12/20/ 2>/dev/null || cp articles/women-35-60/2025-12-20/ya-30-let-zhila-s-etim-pozorom-poka-ne-ponyala-cht-1766250498770-cover.jpg articles/published/2025/12/20/

# ya-sluchayno-otkryla
git mv articles/women-35-60/2025-12-20/ya-sluchayno-otkryla-korobku-i-styd-za-proshloe-pe-1766240127572.txt articles/published/2025/12/20/ 2>/dev/null || cp articles/women-35-60/2025-12-20/ya-sluchayno-otkryla-korobku-i-styd-za-proshloe-pe-1766240127572.txt articles/published/2025/12/20/
git mv articles/women-35-60/2025-12-20/ya-sluchayno-otkryla-korobku-i-styd-za-proshloe-pe-1766240127572.png articles/published/2025/12/20/ 2>/dev/null || cp articles/women-35-60/2025-12-20/ya-sluchayno-otkryla-korobku-i-styd-za-proshloe-pe-1766240127572.png articles/published/2025/12/20/

# Move 2025-12-22 articles
mkdir -p articles/published/2025/12/22
git mv articles/women-35-60/2025-12-22/ves-gorod-zaviduet-moemu-triumfu-no-nikto-ne-vidit-1766411546145.txt articles/published/2025/12/22/ 2>/dev/null || cp articles/women-35-60/2025-12-22/ves-gorod-zaviduet-moemu-triumfu-no-nikto-ne-vidit-1766411546145.txt articles/published/2025/12/22/
git mv articles/women-35-60/2025-12-22/ves-gorod-zaviduet-moemu-triumfu-no-nikto-ne-vidit-1766411546145-cover.jpg articles/published/2025/12/22/ 2>/dev/null || cp articles/women-35-60/2025-12-22/ves-gorod-zaviduet-moemu-triumfu-no-nikto-ne-vidit-1766411546145-cover.jpg articles/published/2025/12/22/

git mv articles/women-35-60/2025-12-22/ya-godami-skryvala-svoy-pozor-no-odin-postupok-raz-1766415745452.txt articles/published/2025/12/22/ 2>/dev/null || cp articles/women-35-60/2025-12-22/ya-godami-skryvala-svoy-pozor-no-odin-postupok-raz-1766415745452.txt articles/published/2025/12/22/
git mv articles/women-35-60/2025-12-22/ya-godami-skryvala-svoy-pozor-no-odin-postupok-raz-1766415745452-cover.jpg articles/published/2025/12/22/ 2>/dev/null || cp articles/women-35-60/2025-12-22/ya-godami-skryvala-svoy-pozor-no-odin-postupok-raz-1766415745452-cover.jpg articles/published/2025/12/22/

git mv articles/women-35-60/2025-12-22/ya-tridtsat-let-zhila-s-chuvstvom-styda-poka-sluch-1766420849922.txt articles/published/2025/12/22/ 2>/dev/null || cp articles/women-35-60/2025-12-22/ya-tridtsat-let-zhila-s-chuvstvom-styda-poka-sluch-1766420849922.txt articles/published/2025/12/22/

# Stage files and commit
git add articles/published/
git commit -m "refactor: move published articles to articles/published/ directory structure

Organize published articles by date in structure:
- articles/published/2025/12/21/ (Dec 21)
- articles/published/2025/12/20/ (Dec 20)  
- articles/published/2025/12/22/ (Dec 22)

This separates published content from draft/work-in-progress articles"

echo "✅ Migration complete!"
echo "📁 Structure created:"
echo "   articles/published/2025/12/20/"
echo "   articles/published/2025/12/21/"
echo "   articles/published/2025/12/22/"
