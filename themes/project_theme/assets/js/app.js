(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

var _hamburger = require('./modules/hamburger');

var _hamburger2 = _interopRequireDefault(_hamburger);

var _pageScroll = require('./modules/pageScroll');

var _pageScroll2 = _interopRequireDefault(_pageScroll);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// You can write a call and import your functions in this file.
//
// This file will be compiled into app.js and will not be minified.
// Feel free with using ES6 here.

// import {NAME} from './modules/...';
(function ($) {
  // When DOM is ready
  $(function () {
    $('#currentYear').text('' + new Date().getFullYear());
    _pageScroll2.default.smoothScrolling();
    _hamburger2.default.handler();
  });
})(jQuery);

},{"./modules/hamburger":2,"./modules/pageScroll":3}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var hamburger = {
  handler: function handler() {
    var $body = $('body');
    var $btn = $('.hamburger');
    var $menu = $('.menu');
    var $submenu = $('.submenu');
    var $submenuLink = $('.menu__link--submenu');
    var $submenuClose = $('.submenu__item--static');
    var OPENED_CLASS = 'opened';
    var OVERLAY_CLASS = 'overlay';
    function hamburgerToggle() {
      $btn.on('click', function switcher() {
        $(this).toggleClass(OPENED_CLASS);
        $menu.toggleClass(OPENED_CLASS);
        $body.toggleClass(OVERLAY_CLASS);
        $submenu.removeClass(OPENED_CLASS);
      });
    }
    function submenuToggle() {
      $submenuLink.on('click', function (event) {
        event.preventDefault();
        $submenu.toggleClass(OPENED_CLASS);
      });
      $submenuClose.on('click', function (event) {
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
      init: init()
    };
  }
};

exports.default = hamburger;

},{}],3:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJ0aGVtZXMvcHJvamVjdF90aGVtZS9zcmMvanMvYXBwLmpzIiwidGhlbWVzL3Byb2plY3RfdGhlbWUvc3JjL2pzL21vZHVsZXMvaGFtYnVyZ2VyLmpzIiwidGhlbWVzL3Byb2plY3RfdGhlbWUvc3JjL2pzL21vZHVsZXMvcGFnZVNjcm9sbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDTUE7Ozs7QUFDQTs7Ozs7O0FBUEE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFJQSxDQUFDLFVBQUMsQ0FBRCxFQUFPO0FBQ047QUFDQSxJQUFFLFlBQU07QUFDTixNQUFFLGNBQUYsRUFBa0IsSUFBbEIsTUFBMEIsSUFBSSxJQUFKLEdBQVcsV0FBWCxFQUExQjtBQUNBLHlCQUFXLGVBQVg7QUFDQSx3QkFBVSxPQUFWO0FBQ0QsR0FKRDtBQUtELENBUEQsRUFPRyxNQVBIOzs7Ozs7OztBQ1RBLElBQU0sWUFBWTtBQUNoQixTQURnQixxQkFDTjtBQUNSLFFBQU0sUUFBUSxFQUFFLE1BQUYsQ0FBZDtBQUNBLFFBQU0sT0FBTyxFQUFFLFlBQUYsQ0FBYjtBQUNBLFFBQU0sUUFBUSxFQUFFLE9BQUYsQ0FBZDtBQUNBLFFBQU0sV0FBVyxFQUFFLFVBQUYsQ0FBakI7QUFDQSxRQUFNLGVBQWUsRUFBRSxzQkFBRixDQUFyQjtBQUNBLFFBQU0sZ0JBQWdCLEVBQUUsd0JBQUYsQ0FBdEI7QUFDQSxRQUFNLGVBQWUsUUFBckI7QUFDQSxRQUFNLGdCQUFnQixTQUF0QjtBQUNBLGFBQVMsZUFBVCxHQUEyQjtBQUN6QixXQUFLLEVBQUwsQ0FBUSxPQUFSLEVBQWlCLFNBQVMsUUFBVCxHQUFvQjtBQUNuQyxVQUFFLElBQUYsRUFBUSxXQUFSLENBQW9CLFlBQXBCO0FBQ0EsY0FBTSxXQUFOLENBQWtCLFlBQWxCO0FBQ0EsY0FBTSxXQUFOLENBQWtCLGFBQWxCO0FBQ0EsaUJBQVMsV0FBVCxDQUFxQixZQUFyQjtBQUNELE9BTEQ7QUFNRDtBQUNELGFBQVMsYUFBVCxHQUF5QjtBQUN2QixtQkFBYSxFQUFiLENBQWdCLE9BQWhCLEVBQXlCLFVBQUMsS0FBRCxFQUFXO0FBQ2xDLGNBQU0sY0FBTjtBQUNBLGlCQUFTLFdBQVQsQ0FBcUIsWUFBckI7QUFDRCxPQUhEO0FBSUEsb0JBQWMsRUFBZCxDQUFpQixPQUFqQixFQUEwQixVQUFDLEtBQUQsRUFBVztBQUNuQyxjQUFNLGNBQU47QUFDQSxpQkFBUyxXQUFULENBQXFCLFlBQXJCO0FBQ0QsT0FIRDtBQUlEO0FBQ0QsYUFBUyxJQUFULEdBQWdCO0FBQ2QsVUFBSSxDQUFDLEtBQUssTUFBVixFQUFrQjtBQUNsQjtBQUNBLFVBQUksQ0FBQyxTQUFTLE1BQWQsRUFBc0I7QUFDdEI7QUFDRDtBQUNELFdBQU87QUFDTCxZQUFNO0FBREQsS0FBUDtBQUdEO0FBckNlLENBQWxCOztrQkF3Q2UsUzs7Ozs7Ozs7QUN4Q2YsSUFBTSxhQUFhO0FBQ2pCLGlCQURpQiw2QkFDQztBQUNoQixRQUFNLFVBQVUsRUFBRSxNQUFGLENBQWhCO0FBQ0EsUUFBTSxRQUFRLEVBQUUsWUFBRixDQUFkO0FBQ0EsUUFBTSxRQUFRLEVBQUUsTUFBRixDQUFkO0FBQ0EsUUFBTSxRQUFRLEVBQUUsT0FBRixDQUFkO0FBQ0EsUUFBTSxjQUFjLEVBQUUsY0FBRixDQUFwQjtBQUNBLFFBQU0sa0JBQWtCLEdBQXhCO0FBQ0EsUUFBTSxnQkFBZ0IsQ0FBdEI7QUFDQSxRQUFNLGlCQUFpQixpQkFBdkI7QUFDQSxRQUFNLGlCQUFpQixJQUF2QjtBQUNBLGFBQVMsU0FBVCxHQUFxQjtBQUNuQixrQkFBWSxFQUFaLENBQWUsT0FBZixFQUF3QixTQUFTLFFBQVQsQ0FBa0IsS0FBbEIsRUFBeUI7QUFDL0MsY0FBTSxjQUFOO0FBQ0EsWUFBTSxZQUFZLEVBQUUsRUFBRSxJQUFGLENBQU8sSUFBUCxFQUFhLE1BQWIsQ0FBRixFQUF3QixNQUF4QixHQUFpQyxHQUFuRDtBQUNBLGNBQU0sT0FBTixDQUFjO0FBQ1oscUJBQWMsWUFBWSxhQUExQjtBQURZLFNBQWQsRUFFRyxlQUZIO0FBR0EsWUFBSSxRQUFRLEtBQVIsTUFBbUIsY0FBdkIsRUFBdUM7QUFDckMsZ0JBQU0sT0FBTjtBQUNBLGdCQUFNLFdBQU4sQ0FBa0IsY0FBbEI7QUFDRDtBQUNELGVBQU8sS0FBUDtBQUNELE9BWEQ7QUFZRDtBQUNELGFBQVMsSUFBVCxHQUFnQjtBQUNkLFVBQUksQ0FBQyxNQUFNLE1BQVgsRUFBbUI7QUFDbkI7QUFDRDtBQUNELFdBQU87QUFDTCxZQUFNO0FBREQsS0FBUDtBQUdEO0FBaENnQixDQUFuQjs7a0JBbUNlLFUiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvLyBZb3UgY2FuIHdyaXRlIGEgY2FsbCBhbmQgaW1wb3J0IHlvdXIgZnVuY3Rpb25zIGluIHRoaXMgZmlsZS5cbi8vXG4vLyBUaGlzIGZpbGUgd2lsbCBiZSBjb21waWxlZCBpbnRvIGFwcC5qcyBhbmQgd2lsbCBub3QgYmUgbWluaWZpZWQuXG4vLyBGZWVsIGZyZWUgd2l0aCB1c2luZyBFUzYgaGVyZS5cblxuLy8gaW1wb3J0IHtOQU1FfSBmcm9tICcuL21vZHVsZXMvLi4uJztcbmltcG9ydCBoYW1idXJnZXIgZnJvbSAnLi9tb2R1bGVzL2hhbWJ1cmdlcic7XG5pbXBvcnQgcGFnZVNjcm9sbCBmcm9tICcuL21vZHVsZXMvcGFnZVNjcm9sbCc7XG5cbigoJCkgPT4ge1xuICAvLyBXaGVuIERPTSBpcyByZWFkeVxuICAkKCgpID0+IHtcbiAgICAkKCcjY3VycmVudFllYXInKS50ZXh0KGAke25ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKX1gKTtcbiAgICBwYWdlU2Nyb2xsLnNtb290aFNjcm9sbGluZygpO1xuICAgIGhhbWJ1cmdlci5oYW5kbGVyKCk7XG4gIH0pO1xufSkoalF1ZXJ5KTtcbiIsImNvbnN0IGhhbWJ1cmdlciA9IHtcbiAgaGFuZGxlcigpIHtcbiAgICBjb25zdCAkYm9keSA9ICQoJ2JvZHknKTtcbiAgICBjb25zdCAkYnRuID0gJCgnLmhhbWJ1cmdlcicpO1xuICAgIGNvbnN0ICRtZW51ID0gJCgnLm1lbnUnKTtcbiAgICBjb25zdCAkc3VibWVudSA9ICQoJy5zdWJtZW51Jyk7XG4gICAgY29uc3QgJHN1Ym1lbnVMaW5rID0gJCgnLm1lbnVfX2xpbmstLXN1Ym1lbnUnKTtcbiAgICBjb25zdCAkc3VibWVudUNsb3NlID0gJCgnLnN1Ym1lbnVfX2l0ZW0tLXN0YXRpYycpO1xuICAgIGNvbnN0IE9QRU5FRF9DTEFTUyA9ICdvcGVuZWQnO1xuICAgIGNvbnN0IE9WRVJMQVlfQ0xBU1MgPSAnb3ZlcmxheSc7XG4gICAgZnVuY3Rpb24gaGFtYnVyZ2VyVG9nZ2xlKCkge1xuICAgICAgJGJ0bi5vbignY2xpY2snLCBmdW5jdGlvbiBzd2l0Y2hlcigpIHtcbiAgICAgICAgJCh0aGlzKS50b2dnbGVDbGFzcyhPUEVORURfQ0xBU1MpO1xuICAgICAgICAkbWVudS50b2dnbGVDbGFzcyhPUEVORURfQ0xBU1MpO1xuICAgICAgICAkYm9keS50b2dnbGVDbGFzcyhPVkVSTEFZX0NMQVNTKTtcbiAgICAgICAgJHN1Ym1lbnUucmVtb3ZlQ2xhc3MoT1BFTkVEX0NMQVNTKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzdWJtZW51VG9nZ2xlKCkge1xuICAgICAgJHN1Ym1lbnVMaW5rLm9uKCdjbGljaycsIChldmVudCkgPT4ge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAkc3VibWVudS50b2dnbGVDbGFzcyhPUEVORURfQ0xBU1MpO1xuICAgICAgfSk7XG4gICAgICAkc3VibWVudUNsb3NlLm9uKCdjbGljaycsIChldmVudCkgPT4ge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAkc3VibWVudS50b2dnbGVDbGFzcyhPUEVORURfQ0xBU1MpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgICBpZiAoISRidG4ubGVuZ3RoKSByZXR1cm47XG4gICAgICBoYW1idXJnZXJUb2dnbGUoKTtcbiAgICAgIGlmICghJHN1Ym1lbnUubGVuZ3RoKSByZXR1cm47XG4gICAgICBzdWJtZW51VG9nZ2xlKCk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBpbml0OiBpbml0KCksXG4gICAgfTtcbiAgfSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGhhbWJ1cmdlcjtcbiIsImNvbnN0IHBhZ2VTY3JvbGwgPSB7XG4gIHNtb290aFNjcm9sbGluZygpIHtcbiAgICBjb25zdCAkd2luZG93ID0gJCh3aW5kb3cpO1xuICAgIGNvbnN0ICRwYWdlID0gJCgnaHRtbCwgYm9keScpO1xuICAgIGNvbnN0ICRib2R5ID0gJCgnYm9keScpO1xuICAgIGNvbnN0ICRtZW51ID0gJCgnLm1lbnUnKTtcbiAgICBjb25zdCAkYW5jaG9yTGluayA9ICQoJ2FbaHJlZl49XCIjXCJdJyk7XG4gICAgY29uc3QgQU5JTUFUSU9OX1NQRUVEID0gNDAwO1xuICAgIGNvbnN0IEhFQURFUl9IRUlHSFQgPSAwO1xuICAgIGNvbnN0IE9WRVJGTE9XX0NMQVNTID0gJ292ZXJmbG93LWhpZGRlbic7XG4gICAgY29uc3QgTU9CSUxFX1ZJRVdfT04gPSAxMDI0O1xuICAgIGZ1bmN0aW9uIHNjcm9sbGluZygpIHtcbiAgICAgICRhbmNob3JMaW5rLm9uKCdjbGljaycsIGZ1bmN0aW9uIHNjcm9sbFRvKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0ICRwb3NpdGlvbiA9ICQoJC5hdHRyKHRoaXMsICdocmVmJykpLm9mZnNldCgpLnRvcDtcbiAgICAgICAgJHBhZ2UuYW5pbWF0ZSh7XG4gICAgICAgICAgc2Nyb2xsVG9wOiBgJHskcG9zaXRpb24gLSBIRUFERVJfSEVJR0hUfXB4YCxcbiAgICAgICAgfSwgQU5JTUFUSU9OX1NQRUVEKTtcbiAgICAgICAgaWYgKCR3aW5kb3cud2lkdGgoKSA8PSBNT0JJTEVfVklFV19PTikge1xuICAgICAgICAgICRtZW51LmZhZGVPdXQoKTtcbiAgICAgICAgICAkYm9keS5yZW1vdmVDbGFzcyhPVkVSRkxPV19DTEFTUyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgICBpZiAoISRwYWdlLmxlbmd0aCkgcmV0dXJuO1xuICAgICAgc2Nyb2xsaW5nKCk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBpbml0OiBpbml0KCksXG4gICAgfTtcbiAgfSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHBhZ2VTY3JvbGw7XG4iXX0=
