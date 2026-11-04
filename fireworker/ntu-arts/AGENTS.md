# 給 AI agent 的專案說明

這是 fireworker 原型專案：用安全的 ERB 子集和 SCSS 製作靜態網站原型。這個專案沒有使用 CSS 框架，請直接在 `sass/application.scss` 撰寫樣式，不要自行加入 Bootstrap 等框架，除非使用者要求。專案的使用者是設計師，請用繁體中文溝通，保持檔案結構簡單，讓設計師也能看懂與修改。

## 結構

- `*.html.erb`：頁面。網址 `/about.html` 對應 `about.html.erb`；子資料夾同理。
- `*.html.layout`：同名頁面要套用的 layout 路徑（例如 `layouts/general_layout`）。
- `layouts/*.html.erb`：外框，用 `<%= yield %>` 放入頁面內容。
- `partials/_名稱.html.erb`：片段，用 `<%= render :partial => "/partials/名稱" %>` 引用。
- `data/*.json`：資料。`data/site.json` 的欄位在模板中寫成 `data.site.欄位`。
- `sass/`：第一層、非底線開頭的 `.scss` 會編譯成 `stylesheets/同名.css`。不要直接修改 `stylesheets/` 裡的編譯結果。
- `fireworker.json`：專案識別檔，請勿刪除。

## 支援的 ERB（只有這些）

- 輸出：`<%= 路徑 %>`（如 `data.site.title`、`item.name`、`item[0]`）、字串、數字、`Time.now.year`、`yield`、`yield :名稱`
- 區塊：`if／elsif／else／unless`（條件只能是資料路徑，可加 `!`，不支援 `==`、`>` 等比較）、`陣列.each do |x|`、`陣列.each_with_index do |x, i|`、`(1..6).each do |i|`、`3.times do |i|`、`content_for :名稱 do`、`content_for?(:名稱)`
- 片段：`render :partial => "/partials/x"`、`render partial: "x"`
- helper：`image_tag`、`image`、`link_to`、`mail_to`、`content_tag`、`stylesheet_link_tag`、`javascript_include_tag`、`placeholder_image 寬, 高, "文字"`、`placeholder_image_url 寬, 高`、`lorem_image "300x200"`、`lorem_word(s)`、`lorem_sentence(s)`、`lorem_paragraph(s)`、`lorem_name`、`lorem_email`、`lorem_date "%Y/%m/%d"`、`zh_lorem_*`、`jp_lorem_*`（最後一個字串參數會取代假文，例如 `lorem_words 3, "固定文字"`）

其他 Ruby 都不會執行：不支援的語法會被略過，預覽頁右下角會列出檔案與行號。少了 `<% end %>` 會顯示錯誤頁。

## 驗證

改完後請執行檢查（`fireworker.exe` 是 fireworker 程式本身）：

```sh
fireworker.exe check . --json      # 檢查所有頁面與 SCSS，回傳錯誤與警告
fireworker.exe check . --strict    # 警告也視為失敗
fireworker.exe build . --json      # 輸出靜態網站到 build/、build-2/ ...
```

`ok` 為 `false` 或有 `warnings` 時，依照訊息中的檔案與行號修正。
