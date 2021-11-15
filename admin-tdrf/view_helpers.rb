module ViewHelpers
  def sidebar_items
    [
      {
        :title => "Dashboard",
        :href => "/dashborad/index.html",
        :icon => "fa-tachometer",
        :active => true,
      },
      {
        :header => true,
        :title => "DOC",
      },
      {
        :title => "UI Elements",
        :icon => "fa-file-text-o",
        :active => true,
        :sub => [
          {:title => 'Grid', :href => '/ui/grid.html', },
          {:title => 'Block', :href => '/ui/block.html', },
          {:title => 'Typography', :href => '/ui/typography.html', },
          {:title => 'Buttons', :href => '/ui/button.html', },
          {:title => 'Alerts / Wells', :href => '/ui/alerts.html', },
          {:title => 'Block tabs', :href => '/ui/tabs.html', },
        ]
      },
      {
        :title => "Tables",
        :icon => "fa-table",
        :sub => [
          {:title => 'Style', :href => '/table/style.html'},
          {:title => 'DataTables', :href => '/table/datatables.html'},
        ]
      },
      {
        :title => "Event Demo",
        :href => "/demo/index.html",
        :icon => "fa-rocket",
      },
      {
        :header => true,
        :title => "後台選單",
      },
      {
        :title => "客服",
        :icon => "fa-headphones",
        :sub => [
          {:title => '活動列表', :href => '###'},
          {:title => '組織列表', :href => '###'},
          {:title => '訂單列表', :href => '###'},
          {:title => '使用者列表', :href => '###'},
        ]
      },
      {
        :title => "財務",
        :icon => "fa-calculator",
        :sub => [
          {:title => '退款列表', :href => '###'},
          {:title => '撥款列表', :href => '###'},
          {:title => '升級訂單列表', :href => '###'},
        ]
      },
      {
        :title => "版位",
        :icon => "fa-picture-o",
        :sub => [
          {:title => '首頁 Sliders', :href => '###'},
          {:title => '大聲公', :href => '###'},
          {:title => '公告版位', :href => '###'},
          {:title => '首頁活動Tabs', :href => '###'},
          {:title => '首頁活動Panel', :href => '###'},
        ]
      },
      {
        :title => "虛擬商品",
        :icon => "fa-gift",
        :href => '/ui/grid.html',
      },
      {
        :title => "權限管理",
        :icon => "fa-lock",
        :href => '/ui/grid.html',
      },
      {
        :title => "報表",
        :icon => "fa-table",
        :sub => [
          {:title => '超商連線資訊', :href => '#'},
        ]
      },
      {
        :title => "檔案上傳",
        :icon => "fa-upload",
        :href => '###',
      },
      {
        :title => "全域娛樂稅",
        :icon => "fa-usd",
        :href => '###',
      },
      {
        :title => "端點設定",
        :icon => "fa-laptop",
        :sub => [
          {:title => '端點', :href => '###'},
          {:title => '端點售票員', :href => '###'},
        ]
      },
      {
        :header => true,
        :divider => true,
      },
      {
        :title => "我的帳戶",
        :icon => "fa-user",
        :sub => [
          {:title => '設定', :href => '###'},
          {:title => '登出', :href => '###'},
        ]
      },
    ]
  end

  def event_sidebar_items
    [
      {
        :title => "活動公開頁面",
        :href => "/",
        :icon => "fa-globe"
      },
      {
        :title => "綜覽",
        :href => "/demo/overview.html",
        :icon => "fa-tachometer",
        :active => true,
      },
      {
        :title => "開賣檢查表",
        :href => "/demo/checklist.html",
        :icon => "fa-check-square-o"
      },
      {
        :title => "報名人列表",
        :href => "/demo/attendees.html",
        :icon => "fa-users"
      },
      {
        :title => "售票訂單列表",
        :href => "/demo/orders.html",
        :icon => "fa-file-text"
      },
      {
        :title => "取票方式設定",
        :href => "/demo/pickup.html",
        :icon => "fa-print"
      },
      {
        :title => "場館",
        :href => "/demo/arena.html",
        :icon => "fa-university"
      },
      {
        :title => "營運帳單",
        :href => "/demo/operation_orders.html",
        :icon => "fa-calculator"
      },
      {
        :title => "票種",
        :href => "/demo/tickets.html",
        :icon => "fa-ticket"
      },
      {
        :title => "可用資格",
        :href => "/demo/predefined_conditions.html",
        :icon => "fa-users"
      },
      {
        :title => "票種稅務",
        :href => "/demo/tax.html",
        :icon => "fa-money"
      },
      {
        :title => "票樣",
        :href => "/demo/sample.html",
        :icon => "fa-newspaper-o"
      },
      {
        :title => "下載結帳報表",
        :href => "/demo/",
        :icon => "fa-line-chart"
      },
      {
        :title => "下載簽到報表",
        :href => "/demo/",
        :icon => "fa-check-square-o"
      },
      {
        :title => "編輯活動",
        :href => "/demo/edit.html",
        :icon => "fa-cogs"
      },
      {
        :title => "端點設定",
        :href => "/demo/retailers.html",
        :icon => "fa-print"
      },
    ]
  end
end
