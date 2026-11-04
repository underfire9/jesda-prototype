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
