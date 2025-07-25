/**
 * 自定義倒數計時器
 * 相容 jQuery 3.7.1
 */
(function($) {
    'use strict';
    
    $.fn.countdownTimer = function(options) {
        var settings = $.extend({
            targetDate: null,
            onComplete: function() {},
            selectors: {
                days: '.clock-days .val',
                hours: '.clock-hours .val',
                minutes: '.clock-minutes .val',
                seconds: '.clock-seconds .val'
            }
        }, options);
        
        var $container = this;
        var timer;
        
        function updateCountdown() {
            var now = new Date().getTime();
            var distance = settings.targetDate - now;
            
            if (distance < 0) {
                clearInterval(timer);
                settings.onComplete();
                return;
            }
            
            var days = Math.floor(distance / (1000 * 60 * 60 * 24));
            var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            // 更新顯示的數字
            $container.find(settings.selectors.days).text(days);
            $container.find(settings.selectors.hours).text(hours);
            $container.find(settings.selectors.minutes).text(minutes);
            $container.find(settings.selectors.seconds).text(seconds);
            
            // 調試信息
            if (typeof console !== 'undefined' && console.log) {
                console.log('Countdown update:', {days: days, hours: hours, minutes: minutes, seconds: seconds});
            }
        }
        
        // 立即更新一次
        updateCountdown();
        
        // 每秒更新
        timer = setInterval(updateCountdown, 1000);
        
        return this;
    };
})(jQuery);
