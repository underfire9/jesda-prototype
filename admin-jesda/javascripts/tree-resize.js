var tabContentHeightOffset = 160;
var minHeight = 800;

function JdResizeTreeBlock() {
    JdResizeHeight('.js-tree', 260, minHeight);
}

var lastPosition = null;

function calculatepercent(position) {
    var a = position;
    var b = $("#mainContent").width();
    var c = $("#mainContent").width() - position;

    $('div.main-left').width((returnPerCalc(a, b) + .4) + '%');
    $('div.main-right').width((returnPerCalc(c, b) - .5) + '%');
};

function returnPerCalc(a, b) {
    var c = a / b;
    var d = c * 100;
    return d;
};

$("#draggable").draggable({
    axis: "x",
    start: function (a) {
        calculatepercent(a.target.offsetLeft);
    },
    drag: function (b) {
        calculatepercent(b.target.offsetLeft);
        resizeWindow();
    },
    stop: function (c) {
        calculatepercent(c.target.offsetLeft);
        lastPosition = c.target.offsetLeft;

    }
});

function resizeWindow() {
    let resizeHeight = $('#treeBlock').height();

    $("#draggable").height(resizeHeight);

    // Convert the width from px to %
    var percent = $("div.main-left").width() / $("#mainContent").width() * 100;

    // Get the left postion of drag bar div incase window resized
    var position = (lastPosition != null) ? ((percent * $("#mainContent").width()) / 100) : (($("#mainContent").width() / 10) * 2);

    $("#draggable").css({
        'left': position - 5
    });
};

$(function () {

    $('div.main-left').width('20%');
    $('div.main-right').width('80%');

    $(window).resize(function () {
        JdResizeTreeBlock();
        JdResizeHeight('#main-content', tabContentHeightOffset, minHeight);
        resizeWindow();
    });

    JdResizeTreeBlock();
    resizeWindow();

});