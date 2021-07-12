/* Table initialisation */
$(document).ready(function() {
    // 依據 table th 之 data-sortable 產出判斷哪些欄位可 sort 的指定值
    // 並依據 table 中 th 的列表生成顯示欄位選單內容 columnOptions ，預設使 checkbox 和 actions 的項目不出現在選單中
    var sortSetting = [];
    var columnOptions = "";
    $(".datatable thead th").each(function(i){
        // 產出 sort 設定值
        if ($(this).data("sortable")==false||$(this).data("sortable")=="false") {
            sortSetting[i] = { "bSortable": false };
        }
        else {
            sortSetting[i] = null;
        }
        
        // 顯示欄位選單內容
        if ($(this).data("type")!="checkbox" && $(this).data("type")!="actions") {
            columnOptions += '<li>';
        }
        else {
            columnOptions += '<li class="hide">';
        }
        columnOptions += '<label><input type="checkbox" data-type="'+ $(this).data("type") +'" checked="checked" />'+ $(this).html() +'</label></li>';
    });

    // 擴充 datatables 的功能，在完全沒有選取任何項目時移除 alert
    $.fn.dataTableExt.oApi.checkIfNoSelected = function (oSettings) {
        if (this.$('tr', {"filter": "applied"}).find('input[type=checkbox]:checked').length==0) {
            $(".t-alert").html("");
        }
    };

    // 擴充 datatables 的功能，決定 alert 區塊的顯示內容 
    $.fn.dataTableExt.oApi.displaySelectedAlert = function(oSettings, selectType) {
        var countSelected = this.$('tr', {"filter": "applied"}).find('input[type=checkbox]:checked').length;
        var totalLength = this.$('tr', {"filter": "applied"}).length;
        if (countSelected < totalLength) {
            $(".t-alert").html('<div class="alert alert-info"><span class="selected-status">已選取目前列表的 '+ countSelected +' 筆資料。</span></div>');
            if (selectType == "current") {
                $(".alert-info").append('<a href="#" id="select-all-list" class="btn btn-default">選取目前列表的全部 '+ totalLength +' 筆資料</a>');
            }
        }
        else {
            $(".t-alert").html('<div class="alert alert-info"><span class="selected-status">已選取目前列表全部 '+ countSelected +' 筆資料。</span></div>');
        }
    };

    // 使用 dataTables & 設定
    var oTable = $('.datatable').dataTable( {
        "sDom": "<'t-header clearfix'<'t-actions btn-toolbar'><'t-controls'<'t-filters'><'t-search'f><'t-data-filters-btn'>><'t-data-filters'>r><'t-alert'><'datatable-wrapper't><'t-footer clearfix'<'t-footer-info'<'t-length'l><'t-info'i>><'t-pages'p><'form-actions t-export'>>",
        "sPaginationType": "bootstrap",
        "oLanguage": {
            "sLengthMenu": "_MENU_ records per page"
        },
        "fnDrawCallback": function( oSettings ) {
            // 依據頁面中的選項是否已全選來決定全選的 checkbox 狀態
            var currentPageAllSelected = $("tbody input[type=checkbox]:checked").length == $("tbody input[type=checkbox]").length;
            $("#select-all").prop("checked", currentPageAllSelected);
            // 換頁時即移除選取全部資料的按鈕
            $("#select-all-list").remove();
            // 更新 alert 和頁面 checkbox 的狀態
            this.displaySelectedAlert();
            this.checkIfNoSelected();
        },
        "aoColumns": sortSetting
    } );

    // 加入功能列 & 繳費顯示切換
    $(".t-actions").prepend('<div class="btn-group"><a href="#" class="btn btn-primary">群組寄信</a><a href="#" class="btn btn-primary">群組簡訊</a></div>');

    // 插入先前生成的顯示欄位選單內容 columnOptions
    $(".t-filters").prepend('<div class="btn-group check-list"><a href="#" class="btn btn-default dropdown-toggle" data-toggle="dropdown">顯示欄位 <span class="caret"></span></a><ul class="dropdown-menu" role="menu">'+columnOptions+'</ul></div>');

    // 插入篩選內容的選單：
    $(".t-data-filters-btn").append('<a href="#" class="btn btn-default">篩選 <span class="caret"></span></a>');

    $(".t-data-filters").append('<h4>繳費及退款狀態</h4><div class="controls"><label><input type="checkbox" />已付款</label><label><input type="checkbox" />待繳費</label><label><input type="checkbox" />已取消</label><label><input type="checkbox" />已完成退款</label><label><input type="checkbox" />未申請退款</label></div><h4>票種</h4><div class="controls"><ul class="tickets"><li><label><input type="checkbox" />免費票</label></li><li><label><input type="checkbox" />VIP 企業贊助票</label></li><li><label><input type="checkbox" />超級無敵長的選項超級無敵長的選項超級無敵長的選項</label></li></ul></div><h4>標籤</h4><div class="controls"><label><input type="checkbox" />有錢的肥羊</label><label><input type="checkbox" />奧客</label><label><input type="checkbox" />不能得罪</label></div><div class="actions"><a href="#" class="btn btn-minor apply">套用</a><a href="#" class="btn btn-link clear">清空</a></div>'); 

    // 讓下拉選單內容不要按了就關
    $(".payment-filter .dropdown-menu label").on("click", function(e){
        e.stopPropagation();
    });

    // 插入輸出按鈕
    $(".t-export").html('匯出訂單資料：<div class="btn-group"><a href="#" class="btn btn-default">Excel</a><a href="#" class="btn btn-default">CSV</a></div>');

    // 切換選單內容時同步切換表單欄位之顯示
    $(document).on("change", ".check-list label input[type='checkbox']", function(e){
        function fnShowHide( iCol ) {
            var bVis = oTable.fnSettings().aoColumns[iCol].bVisible;
            oTable.fnSetColumnVis( iCol, bVis ? false : true );
        }
        fnShowHide($(e.currentTarget).closest("li").index());
    });

    // 全部/已付款/待繳費的顯示切換
    /*$.fn.dataTableExt.afnFiltering.push(
        function( oSettings, aData, iDataIndex ) {
            var filterType = $(".btn-group.payment-filter").find(".btn.active").data("type");
            var rowType = $(oSettings.aoData[iDataIndex].nTr).data("status");
            switch (filterType) {
                case "all":
                    return true;
                    break;
                case "paid":
                    if (rowType == "paid") {
                        return true;
                    }
                    break;
                case "unpaid":
                    if (rowType == "unpaid") {
                        return true;
                    }
                    break;
                default: 
                    return false;
            }
            return false;
        }
    );
    $(document).on("click", ".btn-group.payment-filter .btn", function(e){
        e.preventDefault();
        $(".btn-group.payment-filter .btn").removeClass("active");
        $(e.currentTarget).addClass("active");
        oTable.fnDraw();
    });*/

    // 勾選「全選」 checkbox 後的處理
    $("body").on("change", "#select-all", function(){
        var isChecked = $(this).prop("checked");
        // 勾選時才可能出現「選擇目前列表全部 x 筆資料」的按鈕
        $('tbody input[type=checkbox]').prop("checked", isChecked);
        if (isChecked) {
            oTable.displaySelectedAlert("current");
        }
        else {
            oTable.displaySelectedAlert();
        }
        oTable.checkIfNoSelected();
    });

    // 頁面上的 checkbox 全部被選取時「全選」checkbox 也會成為勾選狀態
    $("body").on("change", "tbody input[type=checkbox]", function(){
        var currentPageAllSelected = $("tbody input[type=checkbox]:checked").length == oTable.fnSettings()._iDisplayLength;
        $("#select-all").prop("checked", currentPageAllSelected);
        oTable.displaySelectedAlert();
        oTable.checkIfNoSelected();
    });

    // 選取全部資料
    $("body").on("click", "#select-all-list", function(e){
        e.preventDefault();
        oTable.$('tr', {"filter": "applied"}).find('input[type=checkbox]').prop('checked', true);
        oTable.displaySelectedAlert();
    });

    // 欲取得目前列表中所有已勾選的項目，需用類似：
    // oTable.$('tr', {"filter": "applied"}).find('input[type=checkbox]:checked')
    // 的方法才能取到已經 filter 的正確結果
});
