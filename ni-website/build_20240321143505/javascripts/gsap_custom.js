gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger);

// fullpage
function goToSection(i) {
    $(window).scrollTop(i)
}

ScrollTrigger.create({
    // markers: true,
    trigger: '.content-panel',
    start: "top top",
    end: '+=1500px',
    onEnterBack: () => {
        goToSection(1500);
    },
   
});

  
let t1 = gsap.timeline({
    scrollTrigger: {
        // markers: true,
        trigger: ".index-workspace",
        scrub: 0,
        start: "top top",
        end: '+=1500px',
        pin: true,
        onLeave: () => {
            goToSection(innerHeight + 1500);
        },
      }
  });

  
// 引字線右
t1.fromTo(".st1", {
    drawSVG: 0,
    
}, {
    drawSVG: "100%",
    stagger: 0.01
})
// 引字線右顏色 (1/2)
.fromTo(".st1", {
    stroke: '#216e92',
}, {
    stroke: '#90b7c9',
}, '<')
// 最底層背景色 (.bg-landing) 由目前 #31454f 轉為 #58b2dc (1/2)
.fromTo(".bg-landing", {
    backgroundColor : '#31454f',
}, {
    backgroundColor : '#457c96',
}, '<')
// 臺灣引路人等字樣 (.main-hgroup) 由白變黑 (#1d2224) (1/2)
.fromTo(".main-hgroup", {
    color : '#ffffff',
}, {
    color : '#8e9192',
}, '<')
// 散光暈背景 (.bg-bokehlicious) 由目前 opacity: .5 轉為 opacity: 0 (1/2)
.fromTo(".bg-bokehlicious", { opacity: 0.5 }, { opacity: 0.25 }, '<')

// 引字線左
.fromTo(".st0", {
    drawSVG: 0,
}, {
    drawSVG: "100%",
    stagger: 0.01
})
// 引字線右顏色 (2/2)
.fromTo(".st1", {
    stroke: '#90b7c9',
}, {
    stroke: '#ffffff',
}, '<')
// 引字線左顏色
.fromTo(".st0", {
    stroke: '#90b7c9',
}, {
    stroke: '#ffffff',
},'<')
// 最底層背景色 (.bg-landing) 由目前 #31454f 轉為 #58b2dc (2/2)
.fromTo(".bg-landing", {
    backgroundColor : '#457c96',
}, {
    backgroundColor : '#58b2dc',
}, '<')
// 臺灣引路人等字樣 (.main-hgroup) 由白變黑 (#1d2224) (2/2)
.fromTo(".main-hgroup", {
    color : '#8e9192',
}, {
    color : '#1d2224',
}, '<')
// 散光暈背景 (.bg-bokehlicious) 由目前 opacity: .5 轉為 opacity: 0 (2/2)
.fromTo(".bg-bokehlicious", { opacity: 0.25 }, { opacity: 0 }, '<')

// 筆畫到最後帶出 mentorship 插圖 (.landing-mentorship)，效果由左視窗外 opacity: 0，移到目前位置 opacity: 1
.fromTo(".landing-mentorship", {
    opacity : 0,
    xPercent: -100
}, {
    opacity : 1,
    xPercent: 0
})

// or SKIP (.jump) 至最後消失 display: none
.fromTo(".jump", {
    display : 'block',
}, {
    display : 'none',
}, '<')

// skip animation
$("#skip").on('click', function(e) {
    e.preventDefault();
    goToSection(innerHeight + 1500);
})