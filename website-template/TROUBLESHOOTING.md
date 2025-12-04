# Webix Bootstrap UI - 故障排除指南

## 檔案檢查清單

請確認以下檔案已正確建立：

- ✅ `javascripts/webix-bootstrap-ui.js` - 主要 JavaScript 檔案
- ✅ `stylesheets/webix-bootstrap-ui.css` - 樣式檔案
- ✅ `sass/widgets/_webix-bootstrap-ui.scss` - SCSS 原始檔
- ✅ `general/webix.html.erb` - 範例頁面

## 問題排查步驟

### 1. 測試獨立 HTML 頁面

首先測試 `test-simple.html`，在瀏覽器中打開：
```
d:\Github\jesda-prototype\website-template\test-simple.html
```

這個檔案可以直接在瀏覽器中打開，不需要伺服器。

### 2. 檢查瀏覽器控制台

按 F12 打開開發者工具，檢查：

**Console 標籤頁應該看到：**
- "Script loaded"
- "WebixBootstrapUI: object"
- "Datepicker OK"
- "DataTable OK"

**如果看到錯誤：**
- 404 錯誤：檔案路徑不正確
- Undefined 錯誤：JavaScript 沒有正確載入
- 其他錯誤：請記下完整錯誤訊息

### 3. 檢查 ERB 範本

如果要在 ERB 範本中使用（如 `general/webix.html.erb`），需要：

1. **確認 CSS 已引入** - 在 `partials/_head.html.erb` 中應該有：
```erb
<link rel="stylesheet" href="../stylesheets/webix-bootstrap-ui.css">
```

2. **確認 JavaScript 路徑正確** - 在頁面底部應該有：
```erb
<script src="../javascripts/webix-bootstrap-ui.js"></script>
```

3. **檢查 Font Awesome** - DataTable 和 Datepicker 需要 Font Awesome 圖示：
```erb
<link rel="stylesheet" href="../stylesheets/vendor/font-awesome/fontawesome.css">
<link rel="stylesheet" href="../stylesheets/vendor/font-awesome/fa-solid.css">
```

### 4. 如果使用 Fire.app

如果您的專案使用 Fire.app 來編譯 SCSS：

1. 打開 Fire.app
2. 將專案資料夾加入到 Fire.app
3. 確認 `sass/widgets/_webix-bootstrap-ui.scss` 已編譯到 `stylesheets/application.css`
4. 或直接使用已建立的 `stylesheets/webix-bootstrap-ui.css`

### 5. 常見問題

#### 問題：頁面空白，沒有顯示任何內容
**解決方法：**
- 檢查瀏覽器控制台是否有 JavaScript 錯誤
- 確認 `WebixBootstrapUI` 物件已正確載入
- 確認容器 div 的 ID 正確（`datepicker` 和 `datatable`）

#### 問題：樣式不正確
**解決方法：**
- 確認 `webix-bootstrap-ui.css` 已載入
- 確認 Bootstrap 5 CSS 已載入
- 檢查瀏覽器開發者工具的 Network 標籤，確認 CSS 檔案狀態為 200

#### 問題：圖示不顯示
**解決方法：**
- 確認 Font Awesome CSS 已載入
- 檢查 `fa-solid.css` 和 `fontawesome.css` 的路徑
- 或者修改 JavaScript，移除圖示相關的代碼

#### 問題：ERB 範本中不工作
**解決方法：**
- 檢查 `general_layout.html.erb` 中是否有 `<%= yield :js %>`
- 確認 JavaScript 使用相對路徑 `../javascripts/`
- 確認頁面在正確的 layout 中渲染

### 6. 手動測試代碼

在瀏覽器控制台中執行以下代碼測試：

```javascript
// 測試 1: 檢查物件是否載入
console.log(typeof WebixBootstrapUI);
// 應該顯示: "object"

// 測試 2: 檢查方法是否存在
console.log(typeof WebixBootstrapUI.DataTable);
// 應該顯示: "function"

// 測試 3: 檢查容器是否存在
console.log(document.getElementById('datepicker'));
console.log(document.getElementById('datatable'));
// 應該顯示對應的 DOM 元素，不是 null
```

### 7. 最小可運行範例

如果以上都不行，使用這個最小範例：

```html
<!DOCTYPE html>
<html>
<head>
    <link href="stylesheets/bootstrap.min.css" rel="stylesheet">
    <link href="stylesheets/webix-bootstrap-ui.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-5">
        <div id="datatable"></div>
    </div>
    <script src="javascripts/webix-bootstrap-ui.js"></script>
    <script>
        WebixBootstrapUI.DataTable({
            container: 'datatable',
            columns: [{id:'id',header:'ID'},{id:'name',header:'名稱'}],
            data: [{id:1,name:'測試'}]
        });
    </script>
</body>
</html>
```

## 需要幫助？

如果問題仍然存在，請提供：
1. 瀏覽器控制台的完整錯誤訊息
2. Network 標籤中顯示的檔案載入狀態
3. 您使用的瀏覽器版本
4. 是否使用本地伺服器或直接打開 HTML 檔案
