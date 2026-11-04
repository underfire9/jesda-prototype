# ntu-arts

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

## 臺大藝文中心原型頁面

- `index.html` 是所有原型頁面的清單；正式首頁在 `home.html`。
- 頁面資料夾：`programs/`（節目）、`venues/`（場地）、`calls/`（合作與徵件）、`news/`（消息）、`about/`（關於）。
- 列表頁的內容來自 `data/programs.json`、`data/news.json`、`data/calls.json`；月曆的活動日期在 `javascripts/calendar-data.js`。
- 目前所在的主選單項目由頁面的 `content_for :section`（programs／venues／calls／news／about）決定。
- 互動（手機選單、輪播、消息分頁、月曆、節目篩選）都在 `javascripts/app.js`。
- 斷點：桌機 ≥1200px、平板 768–1199px、手機 <768px；主選單在 1024px 以下收合。

## 英文版與無障礙（網站無障礙規範 2.0 AA）

- 英文版在 `en/`，與中文頁一一對應；每頁頁首的「EN／中文」連到對應語言的同一頁（`content_for :alt_url`）。英文頁使用 `layouts/general_layout_en` 與 `partials/*_en`。
- 改樣式或加頁面時請維持以下規則，否則會被無障礙檢測工具判定不通過：
  - 字級一律用 `em`（檢測碼 CS2040401／CS2040402），不要用 `px`。放在 `.prose` 這類有自訂字級的父層裡時，要用父層字級換算（見 `application.scss` 最後的「em 字級的父層換算」）。
  - 表單控制元件要放在 `<fieldset>` 裡，並有 `<legend>`（XH1030102），每個欄位都要有 `<label>`。
  - 兩個以上相鄰的連結要放在 `<ul>`／`<ol>` 清單裡（XH1080102）。
  - 句子裡的連結要加 `title`（XH1080401）；另開新視窗的連結要在 title 與文字中告知。
  - 下載檔案只提供開放格式（ODT、PDF），不提供 DOCX（ME1100200）。
  - 文字對比至少 4.5:1；表單框線至少 3:1；深色底的焦點框用金色。
- 頁尾的 `images/badge-aa.svg` 是示意標章，通過檢測後請換成數位發展部核發的正式標章圖檔。
