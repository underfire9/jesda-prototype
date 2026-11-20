# ntu-gocfs100

這是用 fireworker 建立的原型專案。在 fireworker 的 Watch 分頁點選這個專案，就能在瀏覽器即時預覽。

## 檔案放哪裡

| 想做的事 | 改這裡 |
|---|---|
| 新增或修改頁面 | 根目錄的 `*.html.erb`，例如 `index.html.erb`、`about.html.erb` |
| 共用的頁首、頁尾 | `partials/_header.html.erb`、`partials/_footer.html.erb` |
| 頁面外框（`<html>`、`<head>`） | `layouts/general_layout.html.erb` |
| 樣式 | `sass/application.scss`（沒有使用 CSS 框架） |
| 重複的內容（選單、卡片、表格資料） | `data/*.json`，頁面用 `data.檔名.欄位` 讀取 |
| 圖片 | `images/` 或 `assets/` |

新頁面要套用外框時，建立同名的 `.layout` 檔，內容寫 `layouts/general_layout`（可參考 `index.html.layout`）。

## 常用語法速查

```erb
<%= data.site.siteName %>                        讀取 data/site.json 的欄位
<% data.site.pages.each do |page| %> ... <% end %>  重複產生
<% if page.active %> ... <% else %> ... <% end %>   判斷欄位是否為真
<%= render :partial => "/partials/header" %>     插入共用片段
<%= placeholder_image 800, 400, "主視覺" %>        假圖（不需要網路）
<%= zh_lorem_sentence %>  <%= lorem_words 5 %>  <%= jp_lorem_name %>   中英日文假文
<%= image_tag "logo.png", alt: "Logo" %>          /images/logo.png
<%= link_to "關於我們", "/about.html" %>
```

完整規則與限制見 [AGENTS.md](AGENTS.md)。

## 百歲傳情‧海外同慶 原型頁面

依 Figma「前台內頁設計｜中文版／English」製作，中英各 5 頁（02 單筆檢視是 01 照片牆上的燈箱）：

| 頁面 | 中文 | 英文 |
|---|---|---|
| 首頁（Infinite Canvas） | `/index.html` | `/en/index.html` |
| 01＋02 線上祝福（照片牆、燈箱） | `/blessings/index.html` | `/en/blessings/index.html` |
| 03＋03b 社團發展歷程 | `/history/index.html`（全部社團）、`?club=malaysia` 等 | `/en/history/index.html` |
| 04 投稿表單 | `/submit/index.html` | `/en/submit/index.html` |
| 05 送出成功 | `/submit/success.html` | `/en/submit/success.html` |

- 語系切換：內頁頁首的「中／EN」連到另一語言的同一頁（每頁用 `content_for :alt_url` 指定）。英文頁用 `layouts/general_layout_en` 與 `partials/*_en`。首頁的 EN 按鈕直接把選單切成英文（照片牆不重載），網址同步改成 `/en/index.html`。
- 示意資料：照片牆在 `javascripts/blessings-data.js`，社團歷程在 `javascripts/history-data.js`，每筆都有 `zh`／`en` 兩種文字；頁面依 `<html lang>` 顯示對應語言。照片目前用色塊示意。
- 互動都在 `javascripts/app.js`：手機選單、身分＋洲別＋年份篩選、載入更多（每次 12 筆）、燈箱（左右鍵、手機滑動、網址 `?photo=ID` 可分享）、社團頁籤、區塊類型篩選、黏在上方的年代軸、投稿表單即時驗證與照片預覽。
- 首頁特效檔在 `assets/canvas/`（改作自 Codrops「Infinite Canvas」，MIT 授權，見 `assets/canvas/LICENSE.txt`）。照片清單寫在 `assets/canvas/index.js` 的 JSON 陣列裡。
- logo：頁首 `images/logo-ntu100.svg`（原色）、頁尾 `images/logo-ntu100-reversed.svg`（反白版）。
- 斷點：桌機 ≥1200px、平板 768–1199px、手機 <768px；主選單在 1024px 以下收合成漢堡選單。
