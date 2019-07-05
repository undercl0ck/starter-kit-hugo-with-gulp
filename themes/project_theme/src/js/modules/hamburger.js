const hamburger = {
  handler() {
    const $body = $('body');
    const $btn = $('.hamburger');
    const $menu = $('.menu');
    const $submenu = $('.submenu');
    const $submenuLink = $('.menu__link--submenu');
    const $submenuClose = $('.submenu__item--static');
    const OPENED_CLASS = 'opened';
    const OVERLAY_CLASS = 'overlay';
    function hamburgerToggle() {
      $btn.on('click', function switcher() {
        $(this).toggleClass(OPENED_CLASS);
        $menu.toggleClass(OPENED_CLASS);
        $body.toggleClass(OVERLAY_CLASS);
        $submenu.removeClass(OPENED_CLASS);
      });
    }
    function submenuToggle() {
      $submenuLink.on('click', (event) => {
        event.preventDefault();
        $submenu.toggleClass(OPENED_CLASS);
      });
      $submenuClose.on('click', (event) => {
        event.preventDefault();
        $submenu.toggleClass(OPENED_CLASS);
      });
    }
    function init() {
      if (!$btn.length) return;
      hamburgerToggle();
      if (!$submenu.length) return;
      submenuToggle();
    }
    return {
      init: init(),
    };
  },
};

export default hamburger;
