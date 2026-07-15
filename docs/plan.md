# 「籤到」規劃書 — 現代線上求籤服務

> 2026-07-15 · 目標：極為流暢且令人驚艷的線上求籤體驗，具台灣廟宇求籤過程的巧思，
> 內容為 128 首寫給台灣現代上班族的籤詩。最終掛載 mashbean.net。

## 1. 產品定位

**籤到**（諧音「簽到」）——上班前，先籤到。
把台灣廟宇求籤的完整儀式感搬進手機：不是「按鈕→隨機結果」的抽籤機，
而是保留「稟告 → 請籤 → 搖筒 → 擲筊確認（可能被退籤）→ 展籤 → 解籤」的敘事弧。
籤詩內容全新創作：七言四句古典詩 ＋ 現代職場卦頭故事 ＋ 六項解曰，充滿智慧與幽默。

## 2. 內容系統（128 籤）

- 結構：籤序／籤等／籤題（現代卦頭）／七言四句／卦頭故事／聖意／解曰六項
  （事業・功名・財運・感情・健康・出行）／籤尾語／開運小物
- 籤等分布仿傳統稀有度：大吉 8・上吉 20・中吉 36・中平 36・小凶 20・下下 8
- 八大主題群 × 16：會議溝通／職涯流動／專案死線／錢財考績／人際感情／身心生活／時代焦慮／時運轉機
- 各主題群配專屬詩文意象調色盤（朝暮天光、舟渡江海、兵陣棋局、倉廩市集、花月鵲橋、山林泉石、星河燈燭、節氣物候），確保 128 首不重複
- 籤王 1 支（機率 1/512 的彩蛋）
- 詳見 `apps/qiandao/data/style-guide.md` 與 `docs/qiandao/research.md`

## 3. 視覺設計

- **世界觀「深夜的廟」**：下班後的城市裡，一盞還亮著的廟燈。刻意單一深色世界，
  籤詩紙是畫面中唯一的亮部（米黃紙上墨字＋朱印），對比即層次
- 色彩 token：玄墨 `#1a1512`、朱紅 `#c43a20`、舊金 `#c9a227`、籤紙 `#f5edda`、紙墨 `#2b2118`
- 字體：霞鶩文楷 TC（籤詩、籤題——楷書手感）＋ Noto Serif TC（解籤內文）＋系統黑體（UI）
- 籤詩直排（`writing-mode: vertical-rl`），紙紋以 CSS/SVG noise 製作，朱印蓋章動畫
- 封面／分享卡：Canvas 產生器——每籤一張直式籤卡（籤等色帶＋詩文直排＋印章），
  供 Web Share / 下載

## 4. 互動流程（mobile-first）

| 幕 | 儀式 | 互動 | 回饋 |
|---|---|---|---|
| 0 入殿 | 進廟 | landing，燈籠微光 | 「今日宜求籤」 |
| 1 稟告 | 上香默禱 | 選問事類別＋可選默念輸入（僅存本機） | 香點燃、呼吸引導 |
| 2 請籤 | 擲筊請示 | 點擊/甩動擲筊 | 筊杯 3D 翻轉、落地脆響（WebAudio 合成）、震動 |
| 3 抽籤 | 搖籤筒 | 手機搖晃（DeviceMotion）或長按蓄力 | 籤支碰撞聲漸強、一支躍出 |
| 4 確認 | 三聖筊確認 | 連擲三次 | 每次揭曉的懸念；陰筊＝退籤重抽（最多一次） |
| 5 展籤 | 取籤詩 | 籤紙滑出、逐句顯詩、蓋朱印 | 籤等揭曉 |
| 6 解籤 | 解籤人 | 卦頭故事→聖意→解曰（所問類別置頂放大）→籤尾語→開運小物 | 分享籤卡、收藏、連續籤到天數 |

原則：全程單手可完成；每一步都可能「被神明打回」的張力是體驗核心；
`prefers-reduced-motion` 全支援；無後端、無追蹤，默念內容只存 localStorage。

## 5. 技術

- 純靜態：`index.html + css + js + data/qian.json`，零 build step、零依賴框架
- 隨機：`crypto.getRandomValues`；音效：WebAudio 合成（零音檔資產）
- 觸覺：`navigator.vibrate`；搖晃：`devicemotion`（iOS 需權限請求，備長按方案）
- 分享：Canvas 繪籤卡 → Web Share API / 下載 PNG
- PWA lite：manifest + theme-color（可加裝到主畫面）

## 6. 部署到 mashbean.net

現況推斷：`pro.mashbean.net` 由 `mashbean/blog-pro`（GitHub Pages + Actions）供應；
主站 mashbean.net 推測為 `mashbean/blog`。本 session 的 GitHub 權限僅及 developer-meta，
且 proxy 擋外站，無法直接驗證。方案（擇一，需使用者確認）：

- **A（建議）子網域**：新 repo `mashbean/qiandao`（或直接用本目錄內容），GitHub Pages
  custom domain `qian.mashbean.net`，DNS 加一筆 CNAME。乾淨、不動主站。
- **B 子路徑**：把 `apps/qiandao/` 內容放進主站 repo 的 `static/qiandao/`（Hugo）→
  mashbean.net/qiandao/。site 已設計為相對路徑，可直接搬。
- **C 先行預覽**：developer-meta 分支上先 review，之後再搬。

下一步需要：使用者確認方案並（若 A/B）把目標 repo 加進 session（add_repo）。

## 7. Repo 位置說明

依 AGENTS.md 規則 4，正式家應是 `repos/qiandao` 獨立 repo；本次依指定分支先開發於
developer-meta `apps/qiandao/`（已加入 .gitignore 白名單），部署方案確定後即可整目錄搬出。
