(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

var _pageScroll = require('./modules/pageScroll');

var _pageScroll2 = _interopRequireDefault(_pageScroll);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(function ($) {
  // When DOM is ready
  $(function () {
    $('#currentYear').text('' + new Date().getFullYear());
    _pageScroll2.default.smoothScrolling();
  });
})(jQuery); // You can write a call and import your functions in this file.
//
// This file will be compiled into app.js and will not be minified.
// Feel free with using ES6 here.

// import {NAME} from './modules/...';

},{"./modules/pageScroll":2}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var pageScroll = {
  smoothScrolling: function smoothScrolling() {
    var $window = $(window);
    var $page = $('html, body');
    var $body = $('body');
    var $menu = $('.menu');
    var $anchorLink = $('a[href^="#"]');
    var ANIMATION_SPEED = 400;
    var HEADER_HEIGHT = 0;
    var OVERFLOW_CLASS = 'overflow-hidden';
    var MOBILE_VIEW_ON = 1024;
    function scrolling() {
      $anchorLink.on('click', function scrollTo(event) {
        event.preventDefault();
        var $position = $($.attr(this, 'href')).offset().top;
        $page.animate({
          scrollTop: $position - HEADER_HEIGHT + 'px'
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
      init: init()
    };
  }
};

exports.default = pageScroll;

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJ0aGVtZXMvcHJvamVjdF90aGVtZS9zcmMvanMvYXBwLmpzIiwidGhlbWVzL3Byb2plY3RfdGhlbWUvc3JjL2pzL21vZHVsZXMvcGFnZVNjcm9sbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDTUE7Ozs7OztBQUVBLENBQUMsVUFBQyxDQUFELEVBQU87QUFDTjtBQUNBLElBQUUsWUFBTTtBQUNOLE1BQUUsY0FBRixFQUFrQixJQUFsQixNQUEwQixJQUFJLElBQUosR0FBVyxXQUFYLEVBQTFCO0FBQ0EseUJBQVcsZUFBWDtBQUNELEdBSEQ7QUFJRCxDQU5ELEVBTUcsTUFOSCxFLENBUkE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7Ozs7Ozs7O0FDTEEsSUFBTSxhQUFhO0FBQ2pCLGlCQURpQiw2QkFDQztBQUNoQixRQUFNLFVBQVUsRUFBRSxNQUFGLENBQWhCO0FBQ0EsUUFBTSxRQUFRLEVBQUUsWUFBRixDQUFkO0FBQ0EsUUFBTSxRQUFRLEVBQUUsTUFBRixDQUFkO0FBQ0EsUUFBTSxRQUFRLEVBQUUsT0FBRixDQUFkO0FBQ0EsUUFBTSxjQUFjLEVBQUUsY0FBRixDQUFwQjtBQUNBLFFBQU0sa0JBQWtCLEdBQXhCO0FBQ0EsUUFBTSxnQkFBZ0IsQ0FBdEI7QUFDQSxRQUFNLGlCQUFpQixpQkFBdkI7QUFDQSxRQUFNLGlCQUFpQixJQUF2QjtBQUNBLGFBQVMsU0FBVCxHQUFxQjtBQUNuQixrQkFBWSxFQUFaLENBQWUsT0FBZixFQUF3QixTQUFTLFFBQVQsQ0FBa0IsS0FBbEIsRUFBeUI7QUFDL0MsY0FBTSxjQUFOO0FBQ0EsWUFBTSxZQUFZLEVBQUUsRUFBRSxJQUFGLENBQU8sSUFBUCxFQUFhLE1BQWIsQ0FBRixFQUF3QixNQUF4QixHQUFpQyxHQUFuRDtBQUNBLGNBQU0sT0FBTixDQUFjO0FBQ1oscUJBQWMsWUFBWSxhQUExQjtBQURZLFNBQWQsRUFFRyxlQUZIO0FBR0EsWUFBSSxRQUFRLEtBQVIsTUFBbUIsY0FBdkIsRUFBdUM7QUFDckMsZ0JBQU0sT0FBTjtBQUNBLGdCQUFNLFdBQU4sQ0FBa0IsY0FBbEI7QUFDRDtBQUNELGVBQU8sS0FBUDtBQUNELE9BWEQ7QUFZRDtBQUNELGFBQVMsSUFBVCxHQUFnQjtBQUNkLFVBQUksQ0FBQyxNQUFNLE1BQVgsRUFBbUI7QUFDbkI7QUFDRDtBQUNELFdBQU87QUFDTCxZQUFNO0FBREQsS0FBUDtBQUdEO0FBaENnQixDQUFuQjs7a0JBbUNlLFUiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvLyBZb3UgY2FuIHdyaXRlIGEgY2FsbCBhbmQgaW1wb3J0IHlvdXIgZnVuY3Rpb25zIGluIHRoaXMgZmlsZS5cbi8vXG4vLyBUaGlzIGZpbGUgd2lsbCBiZSBjb21waWxlZCBpbnRvIGFwcC5qcyBhbmQgd2lsbCBub3QgYmUgbWluaWZpZWQuXG4vLyBGZWVsIGZyZWUgd2l0aCB1c2luZyBFUzYgaGVyZS5cblxuLy8gaW1wb3J0IHtOQU1FfSBmcm9tICcuL21vZHVsZXMvLi4uJztcbmltcG9ydCBwYWdlU2Nyb2xsIGZyb20gJy4vbW9kdWxlcy9wYWdlU2Nyb2xsJztcblxuKCgkKSA9PiB7XG4gIC8vIFdoZW4gRE9NIGlzIHJlYWR5XG4gICQoKCkgPT4ge1xuICAgICQoJyNjdXJyZW50WWVhcicpLnRleHQoYCR7bmV3IERhdGUoKS5nZXRGdWxsWWVhcigpfWApO1xuICAgIHBhZ2VTY3JvbGwuc21vb3RoU2Nyb2xsaW5nKCk7XG4gIH0pO1xufSkoalF1ZXJ5KTtcbiIsImNvbnN0IHBhZ2VTY3JvbGwgPSB7XG4gIHNtb290aFNjcm9sbGluZygpIHtcbiAgICBjb25zdCAkd2luZG93ID0gJCh3aW5kb3cpO1xuICAgIGNvbnN0ICRwYWdlID0gJCgnaHRtbCwgYm9keScpO1xuICAgIGNvbnN0ICRib2R5ID0gJCgnYm9keScpO1xuICAgIGNvbnN0ICRtZW51ID0gJCgnLm1lbnUnKTtcbiAgICBjb25zdCAkYW5jaG9yTGluayA9ICQoJ2FbaHJlZl49XCIjXCJdJyk7XG4gICAgY29uc3QgQU5JTUFUSU9OX1NQRUVEID0gNDAwO1xuICAgIGNvbnN0IEhFQURFUl9IRUlHSFQgPSAwO1xuICAgIGNvbnN0IE9WRVJGTE9XX0NMQVNTID0gJ292ZXJmbG93LWhpZGRlbic7XG4gICAgY29uc3QgTU9CSUxFX1ZJRVdfT04gPSAxMDI0O1xuICAgIGZ1bmN0aW9uIHNjcm9sbGluZygpIHtcbiAgICAgICRhbmNob3JMaW5rLm9uKCdjbGljaycsIGZ1bmN0aW9uIHNjcm9sbFRvKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0ICRwb3NpdGlvbiA9ICQoJC5hdHRyKHRoaXMsICdocmVmJykpLm9mZnNldCgpLnRvcDtcbiAgICAgICAgJHBhZ2UuYW5pbWF0ZSh7XG4gICAgICAgICAgc2Nyb2xsVG9wOiBgJHskcG9zaXRpb24gLSBIRUFERVJfSEVJR0hUfXB4YCxcbiAgICAgICAgfSwgQU5JTUFUSU9OX1NQRUVEKTtcbiAgICAgICAgaWYgKCR3aW5kb3cud2lkdGgoKSA8PSBNT0JJTEVfVklFV19PTikge1xuICAgICAgICAgICRtZW51LmZhZGVPdXQoKTtcbiAgICAgICAgICAkYm9keS5yZW1vdmVDbGFzcyhPVkVSRkxPV19DTEFTUyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgICBpZiAoISRwYWdlLmxlbmd0aCkgcmV0dXJuO1xuICAgICAgc2Nyb2xsaW5nKCk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBpbml0OiBpbml0KCksXG4gICAgfTtcbiAgfSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHBhZ2VTY3JvbGw7XG4iXX0=
