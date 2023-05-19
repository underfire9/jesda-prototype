$(function() {
  var sidebarCtrl = $('#v-nav-primary')[0];
  var primaryMenu = $('.sidebar--primary').find('.menu');

  $('.sidebar--primary').on('click.nevCtrler', '.nav-ctrler', function(event) {
    event.preventDefault();

    $(this).parent('.has-sub').toggleClass('active');

    // trigger open for collapsed sidebar
    if (!sidebarCtrl.checked) {
      sidebarCtrl.checked = true;
    }
  });
});
