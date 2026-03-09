/**
 * 圓形進度條組件
 * 用於顯示基於時間的階段倒數
 */

(function() {
    'use strict';

    /**
     * 初始化圓形進度條
     * @param {HTMLElement} element - 包含 .progress-circle 的元素
     */
    function initProgressCircle(element) {
        // 獲取配置參數
        const startDateStr = element.getAttribute('data-start-date');
        const totalStages = parseInt(element.getAttribute('data-total-stages')) || 52;
        const color = element.getAttribute('data-color') || '#4caf50';
        
        if (!startDateStr) {
            console.warn('Progress circle missing data-start-date attribute');
            return;
        }

        // 解析起始日期
        const startDate = new Date(startDateStr);
        const today = new Date();
        
        // 移除時分秒，只比較日期
        startDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        // 計算經過的天數
        const daysPassed = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        
        // 計算當前是第幾個兩週期間（每個階段14天）
        const stagesPassed = Math.floor(daysPassed / 14);
        
        // 計算剩餘階段（倒數）
        const remainingStages = Math.max(0, totalStages - stagesPassed);
        
        // 計算當前階段內的進度（0-1之間）
        const daysIntoCurrentStage = daysPassed % 14;
        const stageProgress = daysIntoCurrentStage / 14;
        
        // 計算總進度百分比（包含當前階段的部分進度）
        const totalProgress = stagesPassed + stageProgress;
        const progressPercent = (totalProgress / totalStages) * 100;
        
        // 更新進度圓環
        updateProgressRing(element, progressPercent, color);
        
        // 更新倒數數字
        updateProgressText(element, remainingStages);
    }

    /**
     * 更新進度圓環
     * @param {HTMLElement} element - 進度圓元素
     * @param {number} percent - 進度百分比 (0-100)
     * @param {string} color - 進度顏色
     */
    function updateProgressRing(element, percent, color) {
        const progressRing = element.querySelector('.progress-ring-progress');
        
        if (!progressRing) return;
        
        // SVG圓的半徑和周長
        const radius = 36;
        const circumference = 2 * Math.PI * radius;
        
        // 計算要顯示的進度長度
        // 進度從頂部開始順時針繪製
        const offset = circumference - (percent / 100) * circumference;
        
        // 設置筆畫樣式
        progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
        progressRing.style.strokeDashoffset = offset;
        progressRing.style.stroke = color;
    }

    /**
     * 更新進度文字
     * @param {HTMLElement} element - 進度圓元素
     * @param {number} remaining - 剩餘階段數
     */
    function updateProgressText(element, remaining) {
        const textElement = element.querySelector('.progress-text');
        
        if (textElement) {
            textElement.textContent = remaining;
        }
    }

    /**
     * 初始化所有進度圓
     */
    function initAllProgressCircles() {
        const progressCircles = document.querySelectorAll('.progress-circle[data-start-date]');
        
        progressCircles.forEach(function(circle) {
            initProgressCircle(circle);
        });
    }

    // DOM 載入完成後初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAllProgressCircles);
    } else {
        initAllProgressCircles();
    }

    // 暴露到全局以便手動重新初始化
    window.initProgressCircle = initProgressCircle;
    window.initAllProgressCircles = initAllProgressCircles;

})();
