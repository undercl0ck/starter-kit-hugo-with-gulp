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
    var $btn = $('.hamburger');
    var OPENED_CLASS = 'opened';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJ0aGVtZXMvcHJvamVjdF90aGVtZS9zcmMvanMvYXBwLmpzIiwidGhlbWVzL3Byb2plY3RfdGhlbWUvc3JjL2pzL21vZHVsZXMvaGFtYnVyZ2VyLmpzIiwidGhlbWVzL3Byb2plY3RfdGhlbWUvc3JjL2pzL21vZHVsZXMvcGFnZVNjcm9sbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDTUE7Ozs7QUFDQTs7Ozs7O0FBUEE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFJQSxDQUFDLFVBQUMsQ0FBRCxFQUFPO0FBQ047QUFDQSxJQUFFLFlBQU07QUFDTixNQUFFLGNBQUYsRUFBa0IsSUFBbEIsTUFBMEIsSUFBSSxJQUFKLEdBQVcsV0FBWCxFQUExQjtBQUNBLHlCQUFXLGVBQVg7QUFDQSx3QkFBVSxPQUFWO0FBQ0QsR0FKRDtBQUtELENBUEQsRUFPRyxNQVBIOzs7Ozs7OztBQ1RBLElBQU0sWUFBWTtBQUNoQixTQURnQixxQkFDTjtBQUNSLFFBQU0sT0FBTyxFQUFFLFlBQUYsQ0FBYjtBQUNBLFFBQU0sZUFBZSxRQUFyQjtBQUNBLGFBQVMsZ0JBQVQsR0FBNEI7QUFDMUIsV0FBSyxFQUFMLENBQVEsT0FBUixFQUFpQixTQUFTLFFBQVQsR0FBb0I7QUFDbkMsVUFBRSxJQUFGLEVBQVEsV0FBUixDQUFvQixZQUFwQjtBQUNELE9BRkQ7QUFHRDtBQUNELGFBQVMsSUFBVCxHQUFnQjtBQUNkLFVBQUksQ0FBQyxLQUFLLE1BQVYsRUFBa0I7QUFDbEI7QUFDRDtBQUNELFdBQU87QUFDTCxZQUFNO0FBREQsS0FBUDtBQUdEO0FBaEJlLENBQWxCOztrQkFtQmUsUzs7Ozs7Ozs7QUNuQmYsSUFBTSxhQUFhO0FBQ2pCLGlCQURpQiw2QkFDQztBQUNoQixRQUFNLFVBQVUsRUFBRSxNQUFGLENBQWhCO0FBQ0EsUUFBTSxRQUFRLEVBQUUsWUFBRixDQUFkO0FBQ0EsUUFBTSxRQUFRLEVBQUUsTUFBRixDQUFkO0FBQ0EsUUFBTSxRQUFRLEVBQUUsT0FBRixDQUFkO0FBQ0EsUUFBTSxjQUFjLEVBQUUsY0FBRixDQUFwQjtBQUNBLFFBQU0sa0JBQWtCLEdBQXhCO0FBQ0EsUUFBTSxnQkFBZ0IsQ0FBdEI7QUFDQSxRQUFNLGlCQUFpQixpQkFBdkI7QUFDQSxRQUFNLGlCQUFpQixJQUF2QjtBQUNBLGFBQVMsU0FBVCxHQUFxQjtBQUNuQixrQkFBWSxFQUFaLENBQWUsT0FBZixFQUF3QixTQUFTLFFBQVQsQ0FBa0IsS0FBbEIsRUFBeUI7QUFDL0MsY0FBTSxjQUFOO0FBQ0EsWUFBTSxZQUFZLEVBQUUsRUFBRSxJQUFGLENBQU8sSUFBUCxFQUFhLE1BQWIsQ0FBRixFQUF3QixNQUF4QixHQUFpQyxHQUFuRDtBQUNBLGNBQU0sT0FBTixDQUFjO0FBQ1oscUJBQWMsWUFBWSxhQUExQjtBQURZLFNBQWQsRUFFRyxlQUZIO0FBR0EsWUFBSSxRQUFRLEtBQVIsTUFBbUIsY0FBdkIsRUFBdUM7QUFDckMsZ0JBQU0sT0FBTjtBQUNBLGdCQUFNLFdBQU4sQ0FBa0IsY0FBbEI7QUFDRDtBQUNELGVBQU8sS0FBUDtBQUNELE9BWEQ7QUFZRDtBQUNELGFBQVMsSUFBVCxHQUFnQjtBQUNkLFVBQUksQ0FBQyxNQUFNLE1BQVgsRUFBbUI7QUFDbkI7QUFDRDtBQUNELFdBQU87QUFDTCxZQUFNO0FBREQsS0FBUDtBQUdEO0FBaENnQixDQUFuQjs7a0JBbUNlLFUiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvLyBZb3UgY2FuIHdyaXRlIGEgY2FsbCBhbmQgaW1wb3J0IHlvdXIgZnVuY3Rpb25zIGluIHRoaXMgZmlsZS5cbi8vXG4vLyBUaGlzIGZpbGUgd2lsbCBiZSBjb21waWxlZCBpbnRvIGFwcC5qcyBhbmQgd2lsbCBub3QgYmUgbWluaWZpZWQuXG4vLyBGZWVsIGZyZWUgd2l0aCB1c2luZyBFUzYgaGVyZS5cblxuLy8gaW1wb3J0IHtOQU1FfSBmcm9tICcuL21vZHVsZXMvLi4uJztcbmltcG9ydCBoYW1idXJnZXIgZnJvbSAnLi9tb2R1bGVzL2hhbWJ1cmdlcic7XG5pbXBvcnQgcGFnZVNjcm9sbCBmcm9tICcuL21vZHVsZXMvcGFnZVNjcm9sbCc7XG5cbigoJCkgPT4ge1xuICAvLyBXaGVuIERPTSBpcyByZWFkeVxuICAkKCgpID0+IHtcbiAgICAkKCcjY3VycmVudFllYXInKS50ZXh0KGAke25ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKX1gKTtcbiAgICBwYWdlU2Nyb2xsLnNtb290aFNjcm9sbGluZygpO1xuICAgIGhhbWJ1cmdlci5oYW5kbGVyKCk7XG4gIH0pO1xufSkoalF1ZXJ5KTtcbiIsImNvbnN0IGhhbWJ1cmdlciA9IHtcbiAgaGFuZGxlcigpIHtcbiAgICBjb25zdCAkYnRuID0gJCgnLmhhbWJ1cmdlcicpO1xuICAgIGNvbnN0IE9QRU5FRF9DTEFTUyA9ICdvcGVuZWQnO1xuICAgIGZ1bmN0aW9uIGhhbWJ1cmdlclRvb2dnbGUoKSB7XG4gICAgICAkYnRuLm9uKCdjbGljaycsIGZ1bmN0aW9uIHN3aXRjaGVyKCkge1xuICAgICAgICAkKHRoaXMpLnRvZ2dsZUNsYXNzKE9QRU5FRF9DTEFTUyk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgIGlmICghJGJ0bi5sZW5ndGgpIHJldHVybjtcbiAgICAgIGhhbWJ1cmdlclRvb2dnbGUoKTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGluaXQ6IGluaXQoKSxcbiAgICB9O1xuICB9LFxufTtcblxuZXhwb3J0IGRlZmF1bHQgaGFtYnVyZ2VyO1xuIiwiY29uc3QgcGFnZVNjcm9sbCA9IHtcbiAgc21vb3RoU2Nyb2xsaW5nKCkge1xuICAgIGNvbnN0ICR3aW5kb3cgPSAkKHdpbmRvdyk7XG4gICAgY29uc3QgJHBhZ2UgPSAkKCdodG1sLCBib2R5Jyk7XG4gICAgY29uc3QgJGJvZHkgPSAkKCdib2R5Jyk7XG4gICAgY29uc3QgJG1lbnUgPSAkKCcubWVudScpO1xuICAgIGNvbnN0ICRhbmNob3JMaW5rID0gJCgnYVtocmVmXj1cIiNcIl0nKTtcbiAgICBjb25zdCBBTklNQVRJT05fU1BFRUQgPSA0MDA7XG4gICAgY29uc3QgSEVBREVSX0hFSUdIVCA9IDA7XG4gICAgY29uc3QgT1ZFUkZMT1dfQ0xBU1MgPSAnb3ZlcmZsb3ctaGlkZGVuJztcbiAgICBjb25zdCBNT0JJTEVfVklFV19PTiA9IDEwMjQ7XG4gICAgZnVuY3Rpb24gc2Nyb2xsaW5nKCkge1xuICAgICAgJGFuY2hvckxpbmsub24oJ2NsaWNrJywgZnVuY3Rpb24gc2Nyb2xsVG8oZXZlbnQpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgJHBvc2l0aW9uID0gJCgkLmF0dHIodGhpcywgJ2hyZWYnKSkub2Zmc2V0KCkudG9wO1xuICAgICAgICAkcGFnZS5hbmltYXRlKHtcbiAgICAgICAgICBzY3JvbGxUb3A6IGAkeyRwb3NpdGlvbiAtIEhFQURFUl9IRUlHSFR9cHhgLFxuICAgICAgICB9LCBBTklNQVRJT05fU1BFRUQpO1xuICAgICAgICBpZiAoJHdpbmRvdy53aWR0aCgpIDw9IE1PQklMRV9WSUVXX09OKSB7XG4gICAgICAgICAgJG1lbnUuZmFkZU91dCgpO1xuICAgICAgICAgICRib2R5LnJlbW92ZUNsYXNzKE9WRVJGTE9XX0NMQVNTKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgIGlmICghJHBhZ2UubGVuZ3RoKSByZXR1cm47XG4gICAgICBzY3JvbGxpbmcoKTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIGluaXQ6IGluaXQoKSxcbiAgICB9O1xuICB9LFxufTtcblxuZXhwb3J0IGRlZmF1bHQgcGFnZVNjcm9sbDtcbiJdfQ==
