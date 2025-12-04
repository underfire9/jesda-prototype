# Webix Bootstrap UI

結合 Webix 功能與 Bootstrap 5 風格的 UI 元件套件

## 特色

- 🎨 **Bootstrap 5 風格** - 完全遵循 Bootstrap 5 設計語言
- 📊 **DataTable** - 強大的資料表格元件
- 📅 **Datepicker** - 美觀的日期選擇器
- 🔍 **搜尋功能** - DataTable 內建即時搜尋
- 📄 **分頁功能** - 支援大量資料分頁顯示
- ✨ **排序功能** - 點擊表頭即可排序
- 📱 **響應式設計** - 支援各種螢幕尺寸
- ⚡ **輕量化** - 純 JavaScript，無需 jQuery

## 安裝

### 1. 引入檔案

在 HTML 中引入必要的檔案：

```html
<!-- Bootstrap 5 CSS -->
<link href="stylesheets/bootstrap.min.css" rel="stylesheet">

<!-- Font Awesome (用於圖示) -->
<link href="stylesheets/vendor/font-awesome/fontawesome.css" rel="stylesheet">
<link href="stylesheets/vendor/font-awesome/fa-solid.css" rel="stylesheet">

<!-- Webix Bootstrap UI CSS -->
<link href="stylesheets/application.css" rel="stylesheet">

<!-- Webix Bootstrap UI JS -->
<script src="javascripts/webix-bootstrap-ui.js"></script>
```

## 使用方式

### DataTable

```javascript
const datatable = WebixBootstrapUI.DataTable({
    container: 'datatable',
    columns: [
        { id: "id", header: "ID", width: 60 },
        { id: "name", header: "姓名", width: 120 },
        { id: "email", header: "Email", width: 200 }
    ],
    data: [
        { id: 1, name: "王小明", email: "wang@example.com" },
        { id: 2, name: "李小華", email: "li@example.com" }
    ],
    sortable: true,        // 啟用排序
    searchable: true,      // 啟用搜尋
    pagination: true,      // 啟用分頁
    pageSize: 10,          // 每頁顯示筆數
    selectable: true,      // 啟用行選擇
    striped: true,         // 條紋樣式
    hover: true,           // Hover 效果
    bordered: false,       // 邊框樣式
    onRowClick: function(rowData, rowIndex) {
        console.log('點擊行:', rowData);
    },
    onRowSelect: function(rowData, selectedIds) {
        console.log('已選擇:', selectedIds);
    }
});

// API 方法
datatable.refresh();              // 重新整理
datatable.updateData(newData);    // 更新資料
datatable.getSelectedRows();      // 取得選擇的行
datatable.clearSelection();       // 清除選擇
```

### Datepicker

```javascript
const datepicker = WebixBootstrapUI.Datepicker({
    container: 'datepicker',
    label: '選擇日期',
    value: new Date(),
    format: 'yyyy-MM-dd',
    placeholder: '請選擇日期',
    minDate: new Date(2020, 0, 1),  // 最小日期
    maxDate: new Date(2030, 11, 31), // 最大日期
    onChange: function(date) {
        console.log('選擇的日期:', date);
    }
});

// API 方法
datepicker.getValue();           // 取得日期
datepicker.setValue(new Date()); // 設定日期
datepicker.clear();              // 清除日期
```

## 配置選項

### DataTable 選項

| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `container` | string | 'datatable' | 容器 ID |
| `columns` | array | [] | 欄位定義 |
| `data` | array | [] | 資料陣列 |
| `sortable` | boolean | true | 啟用排序 |
| `searchable` | boolean | true | 啟用搜尋 |
| `pagination` | boolean | true | 啟用分頁 |
| `pageSize` | number | 10 | 每頁筆數 |
| `selectable` | boolean | true | 可選擇行 |
| `striped` | boolean | true | 條紋樣式 |
| `hover` | boolean | true | Hover 效果 |
| `bordered` | boolean | false | 顯示邊框 |
| `onRowClick` | function | null | 行點擊回調 |
| `onRowSelect` | function | null | 行選擇回調 |

### Datepicker 選項

| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `container` | string | 'datepicker' | 容器 ID |
| `label` | string | '選擇日期' | 標籤文字 |
| `value` | Date | new Date() | 預設日期 |
| `format` | string | 'yyyy-MM-dd' | 日期格式 |
| `placeholder` | string | '請選擇日期' | 佔位文字 |
| `minDate` | Date | null | 最小日期 |
| `maxDate` | Date | null | 最大日期 |
| `onChange` | function | null | 變更回調 |

## 範例

完整範例請參考 `general/webix.html.erb` 檔案。

## 瀏覽器支援

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)

## 授權

MIT License

## 作者

JESDA Prototype Team
