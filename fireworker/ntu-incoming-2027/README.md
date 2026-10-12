# NTU OIA 來校訪問研究生申請系統：前端切版交接

這份文件交給在 VS Code 接手切版的 Claude。這次要做的是學生端（前台）的所有頁面，中文版和英文版都要做，而且語系切換必須實際能用。

> **開發環境**：專案使用 fireapp。本文件不指定框架、建置工具或檔案結構。開始前請先讀 fireapp 專案本身，路由、樣板、CSS 組織方式和現有的 i18n 機制都沿用專案慣例。本文件只定義「要長什麼樣」和「要怎麼運作」。

---

## 0. 交接包內容

| 檔案 | 用途 |
|---|---|
| `README.md` | 本文件，包含規格、頁面清單和驗收條件 |
| `tokens.css` | 色彩（含深色模式）、字級、間距和圓角的 CSS 變數，直接對應 Figma Variables |
| `i18n/en.json`、`i18n/zh-Hant.json` | 申請表以外所有頁面的 UI 字串，兩份檔案的 key 完全一致（共 376 個），扁平 key，例如 `login.title` |
| `i18n/application-form.pairs.json` | 申請表（步驟 1）的中英對照，共 107 組，從原型抽出。key 請依專案慣例自行命名 |
| `reference/application-form.src.html` | 申請表的可互動原型原始碼：完整的表單邏輯、驗證、國家／學校／學院／系所連動、語系切換示範 |
| `reference/application-form.built.html` | 同上，已內嵌 logo，可直接用瀏覽器開啟 |
| `assets/oia-mark.svg` | 國際事務處鐘形標誌，只用在 footer 浮水印 |

**缺少的素材：NTU 校徽。** 交接環境無法從 Figma 下載檔案，請在 VS Code 用 Figma MCP 匯出：
`download_assets(fileKey="gnjvacogfilExHJyMSzb2B", nodeId="99:2451", defaultFormat="svg")`，存成 `ntu-seal.svg`。

---

## 1. 設計來源

- **Figma**：https://www.figma.com/design/gnjvacogfilExHJyMSzb2B/
  - 頁面「Frontend Application System」(0:1)：所有頁面設計，依流程分成 01–11 個 Section。
  - 頁面「Foundations」(4:2)：元件、Variables 和 Text Styles。
- **Axure 規劃**：https://2fhpi1.axshare.com/（功能和流程以這份為準，欄位文案以 Figma 為準）。
- 切每一頁時，用 Figma MCP 的 `get_design_context` 和 `get_screenshot` 讀取下方表格列出的 node id。Figma 輸出的程式碼只當參考，要改寫成 fireapp 的寫法。

### 現有設計稿範圍（重要）

| 範圍 | 桌機 EN | 手機 EN | 桌機 中文 |
|---|---|---|---|
| 申請表（步驟 1） | ✓ | ✓ | ✓ |
| 步驟 2–5 | ✓ | ✓ | — |
| 帳號、聲明書、申請紀錄、送出後的頁面 | ✓ | — | — |

設計稿上沒有的版本，依以下原則切：

- **中文版**：版面和英文版相同，文字從 `zh-Hant.json` 取，字型和行高依第 4 節調整。
- **手機版**：依第 7 節的 RWD 規則，參考已有的步驟 1–5 手機稿來推導。

---

## 2. 全域規則（使用者已確認，不可更動）

1. 支援 RWD 與中英雙語，以英文為主：預設語系是英文，設計以英文排版為基準。
2. 內文 16px（1rem）。輸入框、下拉選單、按鈕的高度都是 48px。
3. 桌機設計畫布寬 1920，內容區寬 1280（左右各 320）。
4. **畫面上任何地方都不顯示申請編號**，因為後台沒有這個功能。
5. **申請類別由承辦人在後台勾選**，前台只能唯讀顯示（灰階）。
6. **磚紅 `--brick #8B362C` 只能用在品牌元素**（logo、avatar），**不可出現在表單內**。
   - 表單的 focus、選取狀態、主要按鈕和步驟指示一律用 `--act #1F5A73`。
   - 錯誤狀態一律用 `--danger #C0261B`。
7. Footer 維持精簡，只放地址、電話、傳真、Email 和版權。不放座標、隱私權政策或無障礙連結。
8. 非頁面類的文件不在切版範圍內：Email 範本、註冊手續單、離校手續單範本、證書版型。
9. Header 的頭像縮寫（例如 "AW"）先放靜態文字，實作時再處理產生邏輯。

---

## 3. Design tokens

直接引用 `tokens.css`，或轉成 fireapp 慣用的格式（SCSS、CSS-in-JS 等）。顏色請用變數名稱，不要寫死色碼。

| 用途 | 變數 | Light | Dark |
|---|---|---|---|
| 頁面底色 | `--paper` | #F6F5F3 | #131110 |
| 卡片 | `--surface` | #FFFFFF | #1B1918 |
| 主文字 | `--ink` | #1F1C1A | #EDE8E3 |
| 次要文字 | `--muted` | #6C6560 | #A79F98 |
| 最淡文字 | `--faint` | #958D87 | #7F7771 |
| 線條 | `--line`、`--line-strong` | #E3DFDB、#CBC5BF | — |
| 表單主色 | `--act`、`--act-hover`、`--act-soft`、`--act-line` | #1F5A73、#174759、#EAF2F5、#B8D3DE | 見檔案 |
| 錯誤 | `--danger`、`--danger-soft` | #C0261B、#FDEEEC | 見檔案 |
| 成功／警示 | `--ok`、`--warn` | #2F6B4F、#9A5B12 | 見檔案 |
| 品牌 | `--brick` | #8B362C | #E08D7E |
| Footer | `--foot-bg`、`--foot-ink`、`--foot-muted`、`--foot-line`、`--foot-mark` | #1D1A19 等 | 見檔案 |

**字型**（Google Fonts）：Newsreader、IBM Plex Sans、IBM Plex Mono、Noto Sans TC、Noto Serif TC。

| Figma style | 字型 | 字級／行高 | 備註 |
|---|---|---|---|
| EN/Display 48 | Newsreader Medium | 48/56 | 字距 -0.6px |
| EN/Section 28 | Newsreader Medium | 28/34 | 卡片標題 |
| EN/Body 16 | IBM Plex Sans 400 | 16/26 | |
| EN/Label 16 | IBM Plex Sans 500 | 16/24 | |
| EN/Hint 14 | IBM Plex Sans 400 | 14/21 | |
| EN/Eyebrow 13 | IBM Plex Sans 600 | 13/16 | 全大寫，字距 1.8px |
| EN/Button 16 | IBM Plex Sans 500 | 16/20 | |
| ZH/Display 48 | Noto Serif TC Medium | 48/60 | |
| ZH/Section 28 | Noto Serif TC Medium | 28/38 | 字距 0.5px |
| ZH/Body 16 | Noto Sans TC 400 | 16/28 | 字距 0.3px |
| ZH/Label 16 | Noto Sans TC 500 | 16/26 | |
| ZH/Hint 14 | Noto Sans TC 400 | 14/22 | |

圓角：輸入框 6、卡片 10、膠囊 999。間距刻度：4／8／12／16／20／24／32／48。深色模式跟隨 `prefers-color-scheme`，也可用 `html[data-theme]` 強制指定。

---

## 4. 語系切換規格（必須能實際運作）

不指定實作方式；如果 fireapp 已經有 i18n 機制，就把 `i18n/*.json` 匯入既有機制。以下是**行為規格**。

### 4.1 語系代碼與預設值
- 語系代碼：`en` 和 `zh-Hant`。
- 預設語系是 `en`。
- 決定語系的優先順序：
  1. 網址參數 `?lang=`
  2. 使用者上次的選擇（持久保存，例如 cookie 或 localStorage；如果後端要依語系寄信，就同步存到後端）
  3. `en`
- **不要**依瀏覽器語言自動切換，系統以英文為主。

### 4.2 切換時要同時更新的項目
1. `<html lang>` 改成 `en` 或 `zh-Hant`。這個屬性會驅動 `tokens.css` 的中文字型和行高。
2. 所有靜態文字、`placeholder`、`aria-label`、`title`、`alt`，以及 `<title>`（頁面標題的格式是「{頁名} · {系統名}」）。
3. 動態文字，包括驗證訊息、Toast、計數、日期、天數和狀態膠囊。
4. 下拉選單的選項，包括國家、學院／系所、出生年月日、住宿房型（參考原型裡的 `COUNTRIES`、`COLLEGES`）。切換時**已選的值必須保留**，只換顯示文字。
5. 後台可編輯的內容區塊（見 4.5）。

### 4.3 切換行為
- **表單內容**：切換語系**不可清空使用者已填的內容**，也不可重設捲動位置。
  - 最好不重新載入頁面。
  - 如果 fireapp 必須整頁重載，切換前先自動儲存草稿，重載後還原。
- **Header 切換鈕**：
  - 桌機版是「EN｜中文」的膠囊式分段按鈕，用 `aria-pressed` 標示目前語系。
  - 手機版只顯示「另一個語言」的按鈕（目前是英文就只顯示「中文」）。
- **登入前的頁面**（帳號相關頁）同樣要能切換。

### 4.4 字串規則
- 字串帶有變數時用 `{name}` 佔位，例如 `common.days`：英文 `"{n} days"`、中文 `"共 {n} 天"`。
- 中英文詞序不同，所以**不要把字串拆開來拼接**，一律用整句帶佔位符。
- 英文版用半形括號，中文版用全形標點。
- 遇到「Taiwan Experience Education Program (TEEP)」這類長名稱時，把 `Program` 和 `(TEEP)` 之間的空白改成 NBSP，避免換行後括號單獨落在下一行。原型的付款摘要裡已示範。
- **日期**：表格和系統時間一律用 `YYYY-MM-DD`，兩種語系相同。正文裡的日期用 `Intl.DateTimeFormat` 依語系格式化，英文例如 `17 Apr 1998`，中文例如 `1998 年 4 月 17 日`。
- **金額**：`NT$ 5,000` 兩種語系相同。
- 使用者輸入的資料（姓名、地址、檔名）和後端回傳的資料**不翻譯**。

### 4.5 後台可編輯的內容（雙語由後端提供）
以下內容由 OIA 在後台維護，前端只留顯示位置。資料結構預期為 `{ en, zhHant }`；當前語系沒有內容時，改顯示英文。

- 聲明書內文（`declaration`）
- 各頁的「Note from OIA」區塊：入學資訊、離校手續單，以及申請表的原校說明區
- Portal 左側選單的文字（Axure 註明「選單需要開放前端文字編輯」）。i18n 檔裡的值是預設值。
- 申請類別名稱、上傳文件的項目和說明、費用項目

### 4.6 驗收方式
- 每一頁都切換一次語系，確認畫面上沒有殘留另一個語言的文字（使用者資料除外）。
- 在申請表填一半時切換語系，已填的值、下拉選項和錯誤訊息都要正確保留並換成對應語言。
- 兩份 i18n 檔的 key 必須完全一致。建議寫一個檢查，缺 key 時在開發模式下警告。

---

## 5. 共用版型

| 版型 | 用在哪些頁面 | 結構（桌機 1920） |
|---|---|---|
| **A. Auth** | 01 帳號、02 聲明書 | Header（無使用者選單）→ 置中卡片 560 寬（padding 44/48/48/48，圓角 12，欄位間距 24）→ Footer。聲明書的卡片較寬，請看 67:1641 |
| **B. Process** | 04–08 申請步驟 | Header → Masthead（eyebrow 計畫名稱、H1、狀態膠囊與上次儲存時間、5 步驟條）→ Body：左側「On this page」索引 260 寬（sticky）＋ 間距 64 ＋ 右側表單欄 956 寬 → 底部 Action bar（左邊是儲存狀態，右邊是 Back、Save、Save & Next，捲動時固定在底部）→ Footer |
| **C. Portal** | 03 申請紀錄（無左選單）、09–11 送出後的頁面 | Header → Masthead（eyebrow、H1、說明）→ Body：左側 Portal nav 260 寬 ＋ 間距 64 ＋ Main 956 寬 → Footer |

**Header**（元件 13:791；變體為 Desktop／Mobile × EN／ZH）
- 尺寸：高 80，左右 padding 320。
- 左側 Brand：
  - NTU 校徽 48×48。
  - Wordmark 分兩行。上行是 eyebrow「OFFICE OF INTERNATIONAL AFFAIRS／國際事務處」，13px，大寫，字距加寬。下行是系統名稱，襯線字 20px：英文 "NTU Incoming Visiting Research Student Online Application System"，中文「國立臺灣大學 來校訪問研究生申請系統」。
- 右側：語系切換鈕，以及使用者選單。使用者選單包含 avatar、「Hi, {name}」和 Email，下拉選項有 My applications、Change password、Log out。
- 手機版：
  - 系統名稱縮成英文 14/18（自然換成 3 行），中文 15/21，並固定在「國立臺灣大學」後面換行（`header.systemMobileZhBreak`）。
  - 切換鈕只顯示另一個語言。
- 捲動時 header 固定在頂部，背景半透明並加模糊效果（參考原型的 `.site-head`）。

**Footer**（元件 13:900）
- 底色用 `--foot-bg`，padding 72/320/36，右側有 OIA 標誌浮水印。
- 上方分三欄（每欄 384，欄間距 64）：
  - 校徽 60 ＋ wordmark
  - 地址
  - Tel／Fax／Email。兩支電話分兩行顯示。
- 下方一行版權。
- **英文版只顯示英文地址，中文版只顯示中文地址。**字串在 `footer.*`。

**Portal nav**（元件 Portal Nav Item 60:1271，狀態 Default／Active。Active 時左側有 3px 的 `--act` 色條）
- 每一頁的選單項目和順序都相同：
  - ← My applications
  - 〔Application〕Review application、Supplement required、Visa documents
  - 〔Pre-arrival〕Admission information、Registration documents、Download documents
  - 〔Enrollment & departure〕Enrollment certificate、Departure form、Research certificate
- 選單下方：「Application status」卡（狀態膠囊＋說明），以及「Need help?」。
- **顯示條件**（來自 Axure）：
  - 「Supplement required」只有在申請狀態是「需補件」時才可點，其他時候隱藏或停用。設計稿畫的是永遠列出，以後端狀態控制。
  - 「Visa documents」要在審查結果為「通過」後才開放。
  - 其他項目依申請階段開放。

---

## 6. 頁面清單

Node id 都在 Figma 頁面 0:1 上；i18n 前綴對應 `en.json` 的 key 前綴。

| # | 頁面 | Figma（桌機 EN） | 手機 | 版型 | i18n 前綴 | 互動與狀態重點 |
|---|---|---|---|---|---|---|
| 01 | Log in | 64:1263 | 依規則推導 | A | `login.*` | Email、密碼、驗證碼（圖片＋換一張）、忘記密碼連結、建立帳號連結 |
| 01 | Create account | 64:1356 | 推導 | A | `register.*` | 只填 Email＋驗證碼 → 寄送驗證信 → 進入 Check your email |
| 01 | Check your email | 64:1439 | 推導 | A | `checkEmail.*` | 顯示寄送的 Email；重新寄送要有冷卻時間（建議 60 秒） |
| 01 | Set password | 64:1506 | 推導 | A | `setPassword.*`、`password.*` | 從信中連結進入（連結可能過期）。四條密碼規則逐條即時打勾 |
| 01 | Forgot password | 64:1598 | 推導 | A | `forgot.*` | 送出後也進入 Check your email |
| 01 | Change password | 67:1542 | 推導 | A | `changePassword.*`、`password.*` | 登入後才能進入 |
| 02 | Declaration of consent | 67:1641 | 推導 | A | `declaration.*` | 只在第一次登入時出現。內文由後台提供。沒勾同意時「Agree and continue」是 disabled |
| 03 | Application record | 67:1719 | 推導 | C（無左選單） | `record.*` | 開放申請的 banner；兩個表格（目前的申請、申請通過紀錄）。只有未送出的申請可以刪除。手機版表格改成卡片 |
| 04 | Application form | 13:901 | 16:393 | B | `application-form.pairs.json` | **完整邏輯請看 reference 原型**。中文稿 19:188；「Home University 找不到學校」狀態稿 16:349 |
| 05 | Entry permit information | 32:655 | 36:1187 | B | `entry.*`、`familyDialog.*` | 只有中國大陸籍申請人才有這一步，其他人在步驟條上顯示 Not required 並跳過。家屬用表格加對話框（33:1159）新增或編輯。聲明三選一，選第 2 或第 3 項才出現說明欄 |
| 06 | Upload documents | 32:947 | 36:1497 | B | `upload.*` | 4 個項目依序是大頭照（JPG）、研究計畫書（選填，提供範本）、成績單、護照。項目由後台設定。上傳完成即儲存；支援拖放 |
| 07 | Payment | 32:1239 | 36:1748 | B | `payment.*` | 摘要為 label／value 列，費用為表格，付款方式二選一（信用卡、銀行轉帳）。實際付款頁不在範圍內 |
| 08 | Preview & submit | 32:1530 | 36:1928 | B | `preview.*`、`summary.*` | 各區塊有 Edit 可跳回該步驟；勾選確認後才能送出 |
| 09 | Review application | 68:1721 | 推導 | C | `review.*`、`summary.*` | 唯讀，摘要元件與 08 共用 |
| 09 | Supplement required | 68:1963 | 推導 | C | `supplement.*` | 只列出狀態為「需補件」的文件，顯示 OIA 的說明，可重新上傳 |
| 09 | Visa documents | 68:2101 | 推導 | C | `visa.*` | 下載清單。「入臺證」只有中國大陸籍申請人會看到，OIA 上傳後才出現下載鈕 |
| 10 | Admission information | 69:1921 | 推導 | C | `admission.*` | 學號在 OIA 寄出註冊通知後才顯示。宿舍資訊、費用表、是否報到（只能送出一次，送出後顯示「You already submitted…」） |
| 10 | Registration documents | 69:2105 | 推導 | C | `regDocs.*` | 4 個項目，有進度計數；可以先 Save，也可以確認送出 |
| 10 | Download documents | 69:2273 | 推導 | C | `download.*` | 下載列 |
| 11 | Enrollment certificate | 69:2386 | 推導 | C | `enrollCert.*` | 下載列 |
| 11 | Departure form | 69:2498 | 推導 | C | `departure.*` | 下載範本 → 上傳簽章版 → 送出 |
| 11 | Research certificate | 69:2623 | 推導 | C | `researchCert.*` | 離校手續核准後才能使用；列印時在新分頁開啟 A4 版面 |

Figma 上的示範資料（姓名、日期、檔名）只是版面用的假資料，**不要寫死**。這些資料中有部分日期前後不一致（例如上傳日期寫成 2026），以後端資料為準。

---

## 7. RWD

斷點沿用原型：

| 斷點 | 變化 |
|---|---|
| ≤ 960px | 左側欄（On this page 或 Portal nav）收起 |
| ≤ 640px | 改成手機版排版，左右 padding 16 |

其他細節：

- **On this page 索引**：手機版隱藏，或改成頁首的下拉選單。
- **Portal nav**：≤ 960px 改成頁首的「目前頁面 ▾」下拉選單（或抽屜），選單項目和顯示條件不變。
- **步驟條**：手機版只顯示目前是第幾步加步驟名稱，並附一條進度列。請參考 16:393 等手機稿。
- **Action bar**：手機版固定在畫面底部，按鈕撐滿寬度。
- **表格**：申請紀錄、家屬、費用表在 ≤ 640px 時改成堆疊卡片，或 label／value 列。
- **欄位排列**：雙欄欄位在 ≤ 640px 時改成單欄。觸控目標至少 44px，輸入框維持 48px 高。

---

## 8. 元件對照（Figma Foundations 4:2）

| Figma 元件 | 用途 | 狀態 |
|---|---|---|
| Button 6:8 | 主要、次要、文字按鈕 | Type 變體；hover／disabled |
| Text Field 6:30 | 輸入框＋label＋hint＋必填星號（星號用 `--act` 色）＋「Optional」標籤 | Default／Focus（`--act` 2px 外框＋柔光）／Error（`--danger`）／Disabled |
| Select 6:37 | Kind=Select／Search／Disabled | Search 是可輸入搜尋的 combobox（原型裡有） |
| Radio 6:44、Checkbox 13:712 | | 選中時用 `--act` |
| Step 6:66 | 步驟條 | Current／Done／Upcoming |
| Section Nav Item 6:78 | On this page 的項目 | 有狀態點 |
| Portal Nav Item 60:1271 | Portal 左選單 | Default／Active |
| Site Header 13:791、Site Footer 13:900 | 見第 5 節 | |
| Logo / NTU Seal 99:2451 | 校徽 | |

其他需要自己做的共用元件：

- 狀態膠囊（chip）：ok、warn、act、err、muted 五種色調。
- 上傳列：檔案類型標籤、檔名與大小時間、Remove／Replace、拖放區。
- 下載列。
- 摘要列：label／value。
- Banner：成功、警示、錯誤。
- 「Note from OIA」內容區塊。
- 對話框：開啟時把 focus 鎖在框內，按 Esc 可關閉。

---

## 9. 無障礙

- 每頁只有一個 `<h1>`。
- 每個表單欄位都要有對應的 `<label>`。錯誤訊息用 `aria-describedby` 連到欄位，送出失敗時把焦點移到錯誤摘要。
- 語系切換鈕使用 `role="group"` 和 `aria-pressed`。
- 步驟條使用 `<ol>`，目前步驟加上 `aria-current="step"`。
- 色彩對比已按 AA 規範設計，切版時不要再把文字顏色調淡。
- 支援 `prefers-reduced-motion`。

---

## 10. 待確認事項（請在切版時標註，不要自行決定）

1. **聯絡信箱不一致**：Footer 是 `intstudent@ntu.edu.tw`（使用者最新提供），各頁「Need help?」寫的是 `intadmission@ntu.edu.tw`（Axure 舊資料）。建議做成同一個設定值，再由 OIA 確認要用哪一個。
2. **除申請表外，`zh-Hant.json` 的中文都是暫擬的翻譯**，還沒經過 OIA 審稿，正式名稱（例如「入臺證」、「學生住宿服務組」）待確認。
3. **Axure 中有三頁只有圖片、無法讀取**：註冊手續單、離校手續單範本、中英文規格說明。其中「中英文規格說明」可能包含雙語規則，請向 OIA 索取。
4. **後台資料的雙語結構**：申請類別、文件項目、費用、選單文字等，需要跟後端確認欄位名稱。
5. **帳號頁的驗證碼**：用圖片驗證碼或其他方案，依後端決定。
