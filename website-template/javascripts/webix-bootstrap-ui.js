/**
 * Webix Bootstrap UI - 結合 Webix 功能與 Bootstrap 5 風格的元件套件
 * @version 1.0.0
 */

(function(window) {
    'use strict';

    const WebixBootstrapUI = {
        /**
         * 初始化 Bootstrap 風格的 DataTable
         * @param {Object} options - 配置選項
         */
        DataTable: function(options) {
            const config = {
                container: options.container || 'datatable',
                columns: options.columns || [],
                data: options.data || [],
                sortable: options.sortable !== false,
                searchable: options.searchable !== false,
                pagination: options.pagination !== false,
                pageSize: options.pageSize || 10,
                selectable: options.selectable !== false,
                striped: options.striped !== false,
                hover: options.hover !== false,
                bordered: options.bordered !== false,
                responsive: options.responsive !== false,
                onRowClick: options.onRowClick || null,
                onRowSelect: options.onRowSelect || null
            };

            let currentPage = 1;
            let sortColumn = null;
            let sortDirection = 'asc';
            let searchTerm = '';
            let filteredData = [...config.data];
            let selectedRows = new Set();

            const container = document.getElementById(config.container);
            if (!container) {
                console.error(`Container #${config.container} not found`);
                return;
            }

            // 檢測裝置類型
            let isMobile = window.innerWidth < 768;
            
            // 建立表格 HTML 結構
            const tableWrapper = document.createElement('div');
            tableWrapper.className = 'webix-bootstrap-datatable';
            
            let html = '<div class="card shadow-sm">';
            
            // 搜尋列
            if (config.searchable) {
                html += `
                    <div class="card-header bg-white border-bottom">
                        <div class="row align-items-center g-2">
                            <div class="col-md-6 col-12">
                                <h5 class="mb-md-0 mb-2">資料表格</h5>
                            </div>
                            <div class="col-md-6 col-12">
                                <div class="input-group">
                                    <span class="input-group-text bg-white">
                                        <i class="fa fa-search"></i>
                                    </span>
                                    <input type="text" class="form-control search-input" placeholder="搜尋...">
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            html += '<div class="card-body p-0">';
            
            // 桌面版：表格模式
            html += '<div class="table-responsive d-none d-md-block desktop-view">';
            
            let tableClasses = ['table', 'mb-0'];
            if (config.striped) tableClasses.push('table-striped');
            if (config.hover) tableClasses.push('table-hover');
            if (config.bordered) tableClasses.push('table-bordered');
            
            html += `<table class="${tableClasses.join(' ')} datatable-table">`;
            html += '<thead class="table-light"><tr>';
            
            // 表頭
            config.columns.forEach(col => {
                const sortIcon = config.sortable ? '<i class="fa fa-sort ms-2 text-muted"></i>' : '';
                html += `<th data-column="${col.id}" class="${config.sortable ? 'sortable' : ''}" style="${col.width ? 'width:' + col.width + 'px' : ''}">${col.header}${sortIcon}</th>`;
            });
            
            html += '</tr></thead>';
            html += '<tbody class="datatable-body"></tbody>';
            html += '</table>';
            html += '</div>';
            
            // 行動版：卡片模式
            html += '<div class="d-md-none mobile-view">';
            html += '<div class="datatable-cards"></div>';
            html += '</div>';
            
            html += '</div>';
            
            // 分頁
            if (config.pagination) {
                html += `
                    <div class="card-footer bg-white border-top">
                        <div class="row align-items-center g-2">
                            <div class="col-md-6 col-12 text-center text-md-start">
                                <div class="datatable-info text-muted small"></div>
                            </div>
                            <div class="col-md-6 col-12">
                                <nav>
                                    <ul class="pagination pagination-sm justify-content-center justify-content-md-end mb-0 datatable-pagination"></ul>
                                </nav>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            html += '</div>';
            tableWrapper.innerHTML = html;
            container.appendChild(tableWrapper);

            // 渲染表格內容（桌面版）
            function renderTableDesktop() {
                const tbody = tableWrapper.querySelector('.datatable-body');
                if (!tbody) return;
                
                const start = (currentPage - 1) * config.pageSize;
                const end = start + config.pageSize;
                const pageData = filteredData.slice(start, end);
                
                let bodyHtml = '';
                pageData.forEach((row, index) => {
                    const rowClass = selectedRows.has(row.id) ? 'table-active' : '';
                    bodyHtml += `<tr data-id="${row.id}" data-index="${start + index}" class="${rowClass}">`;
                    config.columns.forEach(col => {
                        bodyHtml += `<td data-label="${col.header}">${row[col.id] || ''}</td>`;
                    });
                    bodyHtml += '</tr>';
                });
                
                tbody.innerHTML = bodyHtml || '<tr><td colspan="' + config.columns.length + '" class="text-center text-muted py-4">查無資料</td></tr>';
                
                // 綁定行點擊事件
                tbody.querySelectorAll('tr[data-id]').forEach(tr => {
                    tr.style.cursor = 'pointer';
                    tr.addEventListener('click', function(e) {
                        handleRowClick(this);
                    });
                });
            }
            
            // 渲染卡片內容（行動版）
            function renderTableMobile() {
                const cardsContainer = tableWrapper.querySelector('.datatable-cards');
                if (!cardsContainer) return;
                
                const start = (currentPage - 1) * config.pageSize;
                const end = start + config.pageSize;
                const pageData = filteredData.slice(start, end);
                
                let cardsHtml = '';
                pageData.forEach((row, index) => {
                    const isSelected = selectedRows.has(row.id);
                    const cardClass = isSelected ? 'border-primary bg-light' : '';
                    
                    cardsHtml += `
                        <div class="mobile-card card mb-2 ${cardClass}" data-id="${row.id}" data-index="${start + index}">
                            <div class="card-body p-3">
                    `;
                    
                    config.columns.forEach((col, idx) => {
                        const value = row[col.id] || '';
                        if (idx === 0) {
                            // 第一個欄位作為標題
                            cardsHtml += `<h6 class="card-title mb-2 text-primary">${value}</h6>`;
                        } else {
                            cardsHtml += `
                                <div class="row mb-1">
                                    <div class="col-5 text-muted small"><strong>${col.header}:</strong></div>
                                    <div class="col-7 small">${value}</div>
                                </div>
                            `;
                        }
                    });
                    
                    cardsHtml += `
                            </div>
                        </div>
                    `;
                });
                
                cardsContainer.innerHTML = cardsHtml || '<div class="text-center text-muted py-4">查無資料</div>';
                
                // 綁定卡片點擊事件
                cardsContainer.querySelectorAll('.mobile-card').forEach(card => {
                    card.style.cursor = 'pointer';
                    card.addEventListener('click', function(e) {
                        handleRowClick(this);
                    });
                });
            }
            
            // 統一的行點擊處理
            function handleRowClick(element) {
                const rowId = element.dataset.id;
                const rowIndex = parseInt(element.dataset.index);
                const rowData = config.data[rowIndex];
                
                if (config.selectable) {
                    if (selectedRows.has(rowId)) {
                        selectedRows.delete(rowId);
                        element.classList.remove('table-active', 'border-primary', 'bg-light');
                    } else {
                        selectedRows.add(rowId);
                        element.classList.add('table-active');
                        if (element.classList.contains('mobile-card')) {
                            element.classList.add('border-primary', 'bg-light');
                        }
                    }
                    
                    if (config.onRowSelect) {
                        config.onRowSelect(rowData, Array.from(selectedRows));
                    }
                }
                
                if (config.onRowClick) {
                    config.onRowClick(rowData, rowIndex);
                }
            }
            
            // 渲染表格（根據螢幕尺寸選擇模式）
            function renderTable() {
                renderTableDesktop();
                if (config.responsive) {
                    renderTableMobile();
                }
            }

            // 渲染分頁
            function renderPagination() {
                if (!config.pagination) return;
                
                const totalPages = Math.ceil(filteredData.length / config.pageSize);
                const pagination = tableWrapper.querySelector('.datatable-pagination');
                const info = tableWrapper.querySelector('.datatable-info');
                
                // 更新資訊
                const start = (currentPage - 1) * config.pageSize + 1;
                const end = Math.min(currentPage * config.pageSize, filteredData.length);
                info.textContent = `顯示 ${start} 到 ${end}，共 ${filteredData.length} 筆`;
                
                // 更新分頁按鈕
                let paginationHtml = '';
                
                // 上一頁
                paginationHtml += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage - 1}">上一頁</a>
                </li>`;
                
                // 頁碼
                for (let i = 1; i <= totalPages; i++) {
                    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                        paginationHtml += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>`;
                    } else if (i === currentPage - 3 || i === currentPage + 3) {
                        paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
                    }
                }
                
                // 下一頁
                paginationHtml += `<li class="page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage + 1}">下一頁</a>
                </li>`;
                
                pagination.innerHTML = paginationHtml;
                
                // 綁定分頁點擊事件
                pagination.querySelectorAll('a[data-page]').forEach(link => {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        const page = parseInt(this.dataset.page);
                        if (page >= 1 && page <= totalPages) {
                            currentPage = page;
                            renderTable();
                            renderPagination();
                        }
                    });
                });
            }

            // 排序功能
            if (config.sortable) {
                tableWrapper.querySelectorAll('th.sortable').forEach(th => {
                    th.style.cursor = 'pointer';
                    th.addEventListener('click', function() {
                        const column = this.dataset.column;
                        
                        if (sortColumn === column) {
                            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                        } else {
                            sortColumn = column;
                            sortDirection = 'asc';
                        }
                        
                        // 更新排序圖示
                        tableWrapper.querySelectorAll('th.sortable i').forEach(icon => {
                            icon.className = 'fa fa-sort ms-2 text-muted';
                        });
                        
                        const icon = this.querySelector('i');
                        icon.className = sortDirection === 'asc' ? 'fa fa-sort-up ms-2' : 'fa fa-sort-down ms-2';
                        
                        // 執行排序
                        filteredData.sort((a, b) => {
                            let aVal = a[column];
                            let bVal = b[column];
                            
                            // 數字排序
                            if (!isNaN(aVal) && !isNaN(bVal)) {
                                aVal = parseFloat(aVal);
                                bVal = parseFloat(bVal);
                            }
                            
                            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
                            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
                            return 0;
                        });
                        
                        currentPage = 1;
                        renderTable();
                        renderPagination();
                    });
                });
            }

            // 搜尋功能
            if (config.searchable) {
                const searchInput = tableWrapper.querySelector('.search-input');
                searchInput.addEventListener('input', function() {
                    searchTerm = this.value.toLowerCase();
                    
                    filteredData = config.data.filter(row => {
                        return config.columns.some(col => {
                            const value = row[col.id];
                            return value && value.toString().toLowerCase().includes(searchTerm);
                        });
                    });
                    
                    currentPage = 1;
                    renderTable();
                    renderPagination();
                });
            }

            // 初始渲染
            renderTable();
            renderPagination();

            // 返回 API
            return {
                refresh: function() {
                    filteredData = [...config.data];
                    currentPage = 1;
                    renderTable();
                    renderPagination();
                },
                updateData: function(newData) {
                    config.data = newData;
                    filteredData = [...newData];
                    currentPage = 1;
                    selectedRows.clear();
                    renderTable();
                    renderPagination();
                },
                getSelectedRows: function() {
                    return Array.from(selectedRows);
                },
                clearSelection: function() {
                    selectedRows.clear();
                    renderTable();
                }
            };
        },

        /**
         * 初始化 Bootstrap 風格的 Datepicker
         * @param {Object} options - 配置選項
         */
        Datepicker: function(options) {
            const config = {
                container: options.container || 'datepicker',
                label: options.label || '選擇日期',
                value: options.value || new Date(),
                format: options.format || 'yyyy-MM-dd',
                minDate: options.minDate || null,
                maxDate: options.maxDate || null,
                onChange: options.onChange || null,
                placeholder: options.placeholder || '請選擇日期'
            };

            const container = document.getElementById(config.container);
            if (!container) {
                console.error(`Container #${config.container} not found`);
                return;
            }

            let selectedDate = config.value;
            let currentMonth = selectedDate.getMonth();
            let currentYear = selectedDate.getFullYear();

            // 建立日期選擇器 HTML 結構
            const pickerWrapper = document.createElement('div');
            pickerWrapper.className = 'webix-bootstrap-datepicker';
            
            const html = `
                <div class="mb-3">
                    <label class="form-label">${config.label}</label>
                    <div class="input-group">
                        <input type="text" class="form-control date-input" placeholder="${config.placeholder}" readonly>
                        <button class="btn btn-outline-secondary" type="button">
                            <i class="fa fa-calendar"></i>
                        </button>
                    </div>
                    <div class="datepicker-dropdown card shadow-lg mt-2" style="display: none; position: absolute; z-index: 1050; max-width: 320px;">
                        <div class="card-header bg-primary text-white">
                            <div class="d-flex justify-content-between align-items-center">
                                <button class="btn btn-sm btn-primary border-0 prev-month">
                                    <i class="fa fa-chevron-left"></i>
                                </button>
                                <div class="current-month-year fw-bold"></div>
                                <button class="btn btn-sm btn-primary border-0 next-month">
                                    <i class="fa fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                        <div class="card-body p-2">
                            <table class="table table-sm mb-0 datepicker-calendar">
                                <thead>
                                    <tr class="text-center">
                                        <th class="text-danger">日</th>
                                        <th>一</th>
                                        <th>二</th>
                                        <th>三</th>
                                        <th>四</th>
                                        <th>五</th>
                                        <th class="text-primary">六</th>
                                    </tr>
                                </thead>
                                <tbody class="calendar-days"></tbody>
                            </table>
                        </div>
                        <div class="card-footer bg-white border-top text-center py-2">
                            <button class="btn btn-sm btn-outline-secondary today-btn">今天</button>
                            <button class="btn btn-sm btn-outline-secondary clear-btn ms-2">清除</button>
                        </div>
                    </div>
                </div>
            `;
            
            pickerWrapper.innerHTML = html;
            container.appendChild(pickerWrapper);

            const input = pickerWrapper.querySelector('.date-input');
            const dropdown = pickerWrapper.querySelector('.datepicker-dropdown');
            const toggleBtn = pickerWrapper.querySelector('.btn-outline-secondary');
            const monthYearDisplay = pickerWrapper.querySelector('.current-month-year');
            const calendarDays = pickerWrapper.querySelector('.calendar-days');
            const prevMonthBtn = pickerWrapper.querySelector('.prev-month');
            const nextMonthBtn = pickerWrapper.querySelector('.next-month');
            const todayBtn = pickerWrapper.querySelector('.today-btn');
            const clearBtn = pickerWrapper.querySelector('.clear-btn');

            // 格式化日期
            function formatDate(date) {
                if (!date) return '';
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                
                return config.format
                    .replace('yyyy', year)
                    .replace('MM', month)
                    .replace('dd', day);
            }

            // 渲染日曆
            function renderCalendar() {
                const firstDay = new Date(currentYear, currentMonth, 1);
                const lastDay = new Date(currentYear, currentMonth + 1, 0);
                const prevLastDay = new Date(currentYear, currentMonth, 0);
                
                const firstDayIndex = firstDay.getDay();
                const lastDate = lastDay.getDate();
                const prevLastDate = prevLastDay.getDate();
                
                monthYearDisplay.textContent = `${currentYear}年 ${currentMonth + 1}月`;
                
                let daysHtml = '';
                let dayCount = 1;
                
                // 計算需要的週數
                const totalCells = Math.ceil((firstDayIndex + lastDate) / 7) * 7;
                
                for (let i = 0; i < totalCells; i++) {
                    if (i % 7 === 0) daysHtml += '<tr>';
                    
                    if (i < firstDayIndex) {
                        // 上個月的日期
                        const day = prevLastDate - firstDayIndex + i + 1;
                        daysHtml += `<td class="text-muted other-month" data-date="${currentYear}-${currentMonth}-${day}">${day}</td>`;
                    } else if (dayCount <= lastDate) {
                        // 本月的日期
                        const date = new Date(currentYear, currentMonth, dayCount);
                        const dateStr = `${currentYear}-${currentMonth + 1}-${dayCount}`;
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                        const isDisabled = (config.minDate && date < config.minDate) || (config.maxDate && date > config.maxDate);
                        
                        let classes = ['selectable'];
                        if (isToday) classes.push('today');
                        if (isSelected) classes.push('selected');
                        if (isDisabled) classes.push('disabled');
                        if (i % 7 === 0) classes.push('text-danger'); // 週日
                        if (i % 7 === 6) classes.push('text-primary'); // 週六
                        
                        daysHtml += `<td class="${classes.join(' ')}" data-date="${dateStr}">${dayCount}</td>`;
                        dayCount++;
                    } else {
                        // 下個月的日期
                        const day = dayCount - lastDate;
                        daysHtml += `<td class="text-muted other-month" data-date="${currentYear}-${currentMonth + 2}-${day}">${day}</td>`;
                        dayCount++;
                    }
                    
                    if (i % 7 === 6) daysHtml += '</tr>';
                }
                
                calendarDays.innerHTML = daysHtml;
                
                // 綁定日期點擊事件
                calendarDays.querySelectorAll('.selectable:not(.disabled)').forEach(td => {
                    td.style.cursor = 'pointer';
                    td.addEventListener('click', function() {
                        const [year, month, day] = this.dataset.date.split('-').map(Number);
                        selectedDate = new Date(year, month - 1, day);
                        input.value = formatDate(selectedDate);
                        dropdown.style.display = 'none';
                        
                        if (config.onChange) {
                            config.onChange(selectedDate);
                        }
                        
                        renderCalendar();
                    });
                });
            }

            // 顯示/隱藏下拉選單
            toggleBtn.addEventListener('click', function() {
                dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            });

            input.addEventListener('click', function() {
                dropdown.style.display = 'block';
            });

            // 點擊外部關閉
            document.addEventListener('click', function(e) {
                if (!pickerWrapper.contains(e.target)) {
                    dropdown.style.display = 'none';
                }
            });

            // 上/下個月
            prevMonthBtn.addEventListener('click', function() {
                currentMonth--;
                if (currentMonth < 0) {
                    currentMonth = 11;
                    currentYear--;
                }
                renderCalendar();
            });

            nextMonthBtn.addEventListener('click', function() {
                currentMonth++;
                if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
                renderCalendar();
            });

            // 今天按鈕
            todayBtn.addEventListener('click', function() {
                selectedDate = new Date();
                currentMonth = selectedDate.getMonth();
                currentYear = selectedDate.getFullYear();
                input.value = formatDate(selectedDate);
                dropdown.style.display = 'none';
                
                if (config.onChange) {
                    config.onChange(selectedDate);
                }
                
                renderCalendar();
            });

            // 清除按鈕
            clearBtn.addEventListener('click', function() {
                selectedDate = null;
                input.value = '';
                dropdown.style.display = 'none';
                
                if (config.onChange) {
                    config.onChange(null);
                }
                
                renderCalendar();
            });

            // 初始設定
            if (selectedDate) {
                input.value = formatDate(selectedDate);
            }
            renderCalendar();

            // 返回 API
            return {
                getValue: function() {
                    return selectedDate;
                },
                setValue: function(date) {
                    selectedDate = date;
                    currentMonth = date.getMonth();
                    currentYear = date.getFullYear();
                    input.value = formatDate(date);
                    renderCalendar();
                },
                clear: function() {
                    selectedDate = null;
                    input.value = '';
                    renderCalendar();
                }
            };
        }
    };

    // 導出到全域
    window.WebixBootstrapUI = WebixBootstrapUI;

})(window);
