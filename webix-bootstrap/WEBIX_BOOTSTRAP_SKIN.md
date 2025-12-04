# Webix Bootstrap Skin

基於 Webix Skin 機制建立的 Bootstrap 5 風格主題

## 檔案結構

```
javascripts/
  └── webix-skin-bootstrap.js    # Skin 定義和配置
  
stylesheets/
  └── webix-skin-bootstrap.css   # Bootstrap 風格 CSS

general/
  └── webix.html.erb              # 範例頁面
```

## 使用方式

### 1. 引入檔案

在 HTML 中引入（順序很重要）：

```html
<!-- CSS -->
<link rel="stylesheet" href="stylesheets/bootstrap.min.css">
<link rel="stylesheet" href="stylesheets/webix.css">
<link rel="stylesheet" href="stylesheets/webix-skin-bootstrap.css">

<!-- JavaScript -->
<script src="javascripts/webix.min.js"></script>
<script src="javascripts/webix-skin-bootstrap.js"></script>
```

### 2. 使用元件

**不需要額外配置**，Skin 會自動啟用！

```javascript
// DataTable - 使用 bootstrap-table type
webix.ui({
    view: "datatable",
    type: "bootstrap-table",
    columns: [...],
    data: [...]
});

// List - 使用 bootstrap-list type
webix.ui({
    view: "list",
    type: "bootstrap-list",
    data: [...]
});

// Tree - 使用 bootstrap-tree type
webix.ui({
    view: "tree",
    type: "bootstrap-tree",
    data: [...]
});

// Form 元件 - 自動套用 Bootstrap 樣式
webix.ui({
    view: "datepicker",
    label: "選擇日期"
});
```

## 支援的元件

### 資料元件
- ✓ DataTable (`type: "bootstrap-table"`)
- ✓ TreeTable (`type: "bootstrap-table"`)
- ✓ List (`type: "bootstrap-list"`)
- ✓ GroupList (`type: "bootstrap-list"`)
- ✓ Tree (`type: "bootstrap-tree"`)

### 表單元件
- ✓ DatePicker (自動套用)
- ✓ DateRangePicker (自動套用)

## 特色

### 1. 原生整合
- 使用 Webix 官方的 Skin API
- 不需要事後覆蓋樣式
- 完全相容 Webix 的所有功能

### 2. Bootstrap 5 風格
- 顏色：使用 Bootstrap 主色系 (#0d6efd)
- 邊框：#dee2e6
- 圓角：0.375rem (6px)
- 間距：符合 Bootstrap spacing
- 字體：系統預設字體堆疊

### 3. RWD 響應式
- 手機 (<768px)：縮小字體和間距
- 平板 (768-1024px)：中等間距
- 桌面 (>1024px)：標準間距

### 4. 互動效果
- Hover：淺灰背景 (#f8f9fa)
- Selected：淺藍背景 (#e7f1ff) + 藍色文字
- Focus：藍色邊框 + 外陰影

## 自訂配置

在 `webix-skin-bootstrap.js` 中修改 Skin 配置：

```javascript
webix.skin.bootstrap = {
    name: "bootstrap",
    
    $active: {
        primaryColor: "#0d6efd",    // 修改主色
        borderColor: "#dee2e6",      // 修改邊框色
        // ...
    },
    
    datatable: {
        cellHeight: 44,              // 修改儲存格高度
        headerHeight: 44,            // 修改表頭高度
        // ...
    }
};
```

## 動態更新

所有動態操作都會自動保持 Bootstrap 樣式：
- 排序
- 篩選
- 新增/刪除資料
- 展開/收合 Tree 節點
- 切換月份（DatePicker）

## 瀏覽器支援

- Chrome/Edge (最新版)
- Firefox (最新版)
- Safari (最新版)
- 行動版瀏覽器

## 版本

- Webix: 9.x
- Bootstrap: 5.x
- Version: 1.0.0
