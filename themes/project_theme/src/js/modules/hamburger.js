const hamburger = {
  handler() {
    const $btn = $('.hamburger');
    const OPENED_CLASS = 'opened';
    function hamburgerTooggle() {
      $btn.on('click', function switcher() {
        $(this).toggleClass(OPENED_CLASS);
      });
    }
    function init() {
      if (!$btn.length) return;
      hamburgerTooggle();
    }
    return {
      init: init(),
    };
  },
};

export default hamburger;
