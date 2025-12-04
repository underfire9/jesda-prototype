/**
 * Webix Bootstrap Skin
 * 讓 Webix 元件使用 Bootstrap 5 風格
 * @version 1.0.0
 */

(function() {
    'use strict';

    if (typeof webix === 'undefined') {
        console.error('Webix must be loaded before webix-skin-bootstrap.js');
        return;
    }

    console.log('Loading Webix Bootstrap Skin...');

    // 等待 Webix 完全載入
    webix.ready(function() {
        
        // ========================================
        // 定義 Bootstrap Type
        // ========================================
        
        // 檢查元件是否存在
        if (webix.ui.datatable) {
            webix.type(webix.ui.datatable, {
                name: "bootstrap-table",
                css: "webix-bootstrap-table"
            });
            console.log('✓ DataTable bootstrap-table type registered');
        }

        if (webix.ui.list) {
            webix.type(webix.ui.list, {
                name: "bootstrap-list",
                css: "webix-bootstrap-list",
                height: 48
            });
            console.log('✓ List bootstrap-list type registered');
        }

        if (webix.ui.tree) {
            webix.type(webix.ui.tree, {
                name: "bootstrap-tree",
                css: "webix-bootstrap-tree",
                height: 40,
                
                icon: function(obj, common) {
                    if (obj.$count) {
                        if (obj.open) {
                            return "<span class='webix-bootstrap-tree-icon'>▼</span>";
                        } else {
                            return "<span class='webix-bootstrap-tree-icon'>▶</span>";
                        }
                    }
                    return "<span class='webix-bootstrap-tree-icon' style='opacity:0'>▶</span>";
                }
            });
            console.log('✓ Tree bootstrap-tree type registered');
        }

        // ========================================
        // 擴展 webix.ui 來自動套用樣式
        // ========================================
        var originalUI = webix.ui;
        
        webix.ui = function(config) {
            // 檢查並自動加入 Bootstrap class
            if (config) {
                var view = config.view;
                
                // 為 form 元件加入 Bootstrap class
                if (view === 'datepicker' || view === 'daterangepicker') {
                    config.css = (config.css || '') + ' webix-bootstrap-form';
                }
            }
            
            // 呼叫原始 ui
            var result = originalUI.apply(this, arguments);
            
            return result;
        };
        
        // 保留原始屬性
        for (var key in originalUI) {
            if (originalUI.hasOwnProperty(key)) {
                webix.ui[key] = originalUI[key];
            }
        }

        console.log('✓ Webix Bootstrap Skin loaded');
    });

})();