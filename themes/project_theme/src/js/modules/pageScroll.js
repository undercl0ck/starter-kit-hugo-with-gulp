const pageScroll = {
  smoothScrolling() {
    const $window = $(window);
    const $page = $('html, body');
    const $body = $('body');
    const $menu = $('.navigation');
    const $anchorLink = $('a[href^="/#"]');
    const ANIMATION_SPEED = 400;
    const HEADER_HEIGHT = 0;
    const OVERFLOW_CLASS = 'overflow-hidden';
    const MOBILE_VIEW_ON = 980;
    function scrolling() {
      $anchorLink.on('click', function scrollTo() {
        const $position = $($.attr(this, 'href').replace('/', '')).offset().top;
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
