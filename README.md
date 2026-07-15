# 籤到 — 上班前，先打卡籤到。

現代上班族的線上求籤所。128 首全新創作的籤詩（七言四句＋現代職場卦頭故事＋解曰六項），
完整保留台灣廟宇求籤儀式：稟告 → 擲筊請籤 → 搖籤筒 → 三聖筊確認（可能被退籤）→ 展籤 → 解籤。

## 特色

- **儀式忠實**：考據自六十甲子籤結構與真實求籤 SOP（見 `docs/research.md`）；
  笑筊、陰筊、退籤重抽都會發生——「神明可以說不」是體驗核心
- **零依賴**：純靜態 HTML/CSS/JS，無框架、無 build step、無後端、無追蹤；
  音效以 WebAudio 即時合成（筊杯脆響、籤筒沙沙、磬聲），零音檔資產
- **mobile-first**：搖晃手機搖籤筒（DeviceMotion）、觸覺回饋、長按蓄力備援、
  `prefers-reduced-motion` 全支援
- **分享**：Canvas 產生直式籤卡 PNG（Web Share API / 下載）
- **彩蛋**：籤王 1/512；每日「宜／忌」；連續籤到天數（localStorage）

## 開發

```bash
python3 -m http.server 8642   # 開 http://localhost:8642
```

資料層：`data/qian.json`（128 籤，由 `data/batches/batch*.json` 合併）。
v2 內容體系：七大意象（花木／本草／鳥獸／山川／時事／東史／西史，歷史籤題恰 7 字），
每籤含七言四句、卦頭故事、聖意、解曰六項、**解曰四句（籤面直排）**、**勸世語**、
籤尾語、開運小物；卦象與五行由 id 推導（六十四卦 × 陰陽）。
內容規則見 `data/style-guide.md`；改動後跑 `python3 data/validate.py --all` 驗證
（七言字數、欄位長度、籤等分布 大吉8/上吉20/中吉36/中平36/小凶20/下下8、標題唯一性）。

SEO/AEO：改完 `qian.json` 後跑 `python3 tools/build_pages.py` 重新產出
`q/1..128.html`（每籤靜態頁）、`all.html`（籤庫＋FAQ）、`sitemap.xml`；
部署網域改變時調整該檔 `BASE_URL` 與 `robots.txt`、`index.html` canonical 後重跑。

## 部署

整個資料夾即為 site root，任何靜態主機皆可。字體走 CDN（Google Fonts + jsdelivr 的
LXGW WenKai TC），離線時 fallback 到系統字體。部署到 mashbean.net 的方案見
`docs/plan.md` 第 6 節；正式站 https://check.mashbean.net。

## 部署（GitHub Pages + check.mashbean.net）

1. Settings → Pages → Source 選 **Deploy from a branch**，Branch 選 `main` / `/ (root)`
2. DNS 加一筆：`check`（CNAME）→ `mashbean.github.io`
3. 根目錄 `CNAME` 檔已含 `check.mashbean.net`，Pages 會自動綁定；憑證簽好後勾 **Enforce HTTPS**
4. 換網域時：改 `tools/build_pages.py` 的 `BASE_URL`、`robots.txt`、`index.html` canonical，重跑 `python3 tools/build_pages.py`
