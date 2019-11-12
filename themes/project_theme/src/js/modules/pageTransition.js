const pageTransition = {
  transition() {
    const $body = $('body');
    const $navLink = $('.menu__link');
    const $blogLink = $('.blog__post a');
    const $backLink = $('.back-to-blog');
    function pageOnLoad() {
      $body.fadeIn(1000);
    }
    function fadeOutOnClick(link) {
      link.on('click', function (event) {
        event.preventDefault();
        const linkLocation = this.href;
        $body.fadeOut(1000, () => {
          window.location = linkLocation;
        });
      });
    }
    function init() {
      if (!$body.length) return;
      $(window).on('load', pageOnLoad());
      fadeOutOnClick($navLink);
      fadeOutOnClick($blogLink);
      fadeOutOnClick($backLink);
    }
    return {
      init: init(),
    };
  },
};

export default pageTransition;
