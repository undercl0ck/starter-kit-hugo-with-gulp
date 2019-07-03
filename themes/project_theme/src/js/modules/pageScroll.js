const pageScroll = {
  smoothScrolling() {
    const $window = $(window);
    const $page = $('html, body');
    const $body = $('body');
    const $menu = $('.menu');
    const $anchorLink = $('a[href^="#"]');
    const ANIMATION_SPEED = 400;
    const HEADER_HEIGHT = 0;
    const OVERFLOW_CLASS = 'overflow-hidden';
    const MOBILE_VIEW_ON = 1024;
    function scrolling() {
      $anchorLink.on('click', function scrollTo(event) {
        event.preventDefault();
        const $position = $($.attr(this, 'href')).offset().top;
        $page.animate({
          scrollTop: `${$position - HEADER_HEIGHT}px`,
        }, ANIMATION_SPEED);
        if ($window.width() <= MOBILE_VIEW_ON) {
          $menu.fadeOut();
          $body.removeClass(OVERFLOW_CLASS);
        }
        return false;
      });
    }
    function init() {
      if (!$page.length) return;
      scrolling();
    }
    return {
      init: init(),
    };
  },
};

export default pageScroll;
