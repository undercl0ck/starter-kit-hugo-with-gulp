(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

var _pageScroll = require('./modules/pageScroll');

var _pageScroll2 = _interopRequireDefault(_pageScroll);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(function ($) {
  // When DOM is ready
  $(function () {
    $('#currentYear').text('' + new Date().getFullYear());
    _pageScroll2.default.init();
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
    var $menu = $('.navigation');
    var $anchorLink = $('a[href^="/#"]');
    var ANIMATION_SPEED = 400;
    var HEADER_HEIGHT = 0;
    var OVERFLOW_CLASS = 'overflow-hidden';
    var MOBILE_VIEW_ON = 980;
    function scrolling() {
      $anchorLink.on('click', function scrollTo() {
        var $position = $($.attr(this, 'href').replace('/', '')).offset().top;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJ0aGVtZXMvcHJvamVjdF90aGVtZS9zcmMvanMvYXBwLmpzIiwidGhlbWVzL3Byb2plY3RfdGhlbWUvc3JjL2pzL21vZHVsZXMvcGFnZVNjcm9sbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDTUE7Ozs7OztBQUVBLENBQUMsVUFBQyxDQUFELEVBQU87QUFDTjtBQUNBLElBQUUsWUFBTTtBQUNOLE1BQUUsY0FBRixFQUFrQixJQUFsQixNQUEwQixJQUFJLElBQUosR0FBVyxXQUFYLEVBQTFCO0FBQ0EseUJBQVcsSUFBWDtBQUNELEdBSEQ7QUFJRCxDQU5ELEVBTUcsTUFOSCxFLENBUkE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7Ozs7Ozs7O0FDTEEsSUFBTSxhQUFhO0FBQ2pCLGlCQURpQiw2QkFDQztBQUNoQixRQUFNLFVBQVUsRUFBRSxNQUFGLENBQWhCO0FBQ0EsUUFBTSxRQUFRLEVBQUUsWUFBRixDQUFkO0FBQ0EsUUFBTSxRQUFRLEVBQUUsTUFBRixDQUFkO0FBQ0EsUUFBTSxRQUFRLEVBQUUsYUFBRixDQUFkO0FBQ0EsUUFBTSxjQUFjLEVBQUUsZUFBRixDQUFwQjtBQUNBLFFBQU0sa0JBQWtCLEdBQXhCO0FBQ0EsUUFBTSxnQkFBZ0IsQ0FBdEI7QUFDQSxRQUFNLGlCQUFpQixpQkFBdkI7QUFDQSxRQUFNLGlCQUFpQixHQUF2QjtBQUNBLGFBQVMsU0FBVCxHQUFxQjtBQUNuQixrQkFBWSxFQUFaLENBQWUsT0FBZixFQUF3QixTQUFTLFFBQVQsR0FBb0I7QUFDMUMsWUFBTSxZQUFZLEVBQUUsRUFBRSxJQUFGLENBQU8sSUFBUCxFQUFhLE1BQWIsRUFBcUIsT0FBckIsQ0FBNkIsR0FBN0IsRUFBa0MsRUFBbEMsQ0FBRixFQUF5QyxNQUF6QyxHQUFrRCxHQUFwRTtBQUNBLGNBQU0sT0FBTixDQUFjO0FBQ1oscUJBQWMsWUFBWSxhQUExQjtBQURZLFNBQWQsRUFFRyxlQUZIO0FBR0EsWUFBSSxRQUFRLEtBQVIsTUFBbUIsY0FBdkIsRUFBdUM7QUFDckMsZ0JBQU0sT0FBTjtBQUNBLGdCQUFNLFdBQU4sQ0FBa0IsY0FBbEI7QUFDRDtBQUNELGVBQU8sS0FBUDtBQUNELE9BVkQ7QUFXRDtBQUNELGFBQVMsSUFBVCxHQUFnQjtBQUNkLFVBQUksQ0FBQyxNQUFNLE1BQVgsRUFBbUI7QUFDbkI7QUFDRDtBQUNELFdBQU87QUFDTCxZQUFNO0FBREQsS0FBUDtBQUdEO0FBL0JnQixDQUFuQjs7a0JBa0NlLFUiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvLyBZb3UgY2FuIHdyaXRlIGEgY2FsbCBhbmQgaW1wb3J0IHlvdXIgZnVuY3Rpb25zIGluIHRoaXMgZmlsZS5cbi8vXG4vLyBUaGlzIGZpbGUgd2lsbCBiZSBjb21waWxlZCBpbnRvIGFwcC5qcyBhbmQgd2lsbCBub3QgYmUgbWluaWZpZWQuXG4vLyBGZWVsIGZyZWUgd2l0aCB1c2luZyBFUzYgaGVyZS5cblxuLy8gaW1wb3J0IHtOQU1FfSBmcm9tICcuL21vZHVsZXMvLi4uJztcbmltcG9ydCBwYWdlU2Nyb2xsIGZyb20gJy4vbW9kdWxlcy9wYWdlU2Nyb2xsJztcblxuKCgkKSA9PiB7XG4gIC8vIFdoZW4gRE9NIGlzIHJlYWR5XG4gICQoKCkgPT4ge1xuICAgICQoJyNjdXJyZW50WWVhcicpLnRleHQoYCR7bmV3IERhdGUoKS5nZXRGdWxsWWVhcigpfWApO1xuICAgIHBhZ2VTY3JvbGwuaW5pdCgpO1xuICB9KTtcbn0pKGpRdWVyeSk7XG4iLCJjb25zdCBwYWdlU2Nyb2xsID0ge1xuICBzbW9vdGhTY3JvbGxpbmcoKSB7XG4gICAgY29uc3QgJHdpbmRvdyA9ICQod2luZG93KTtcbiAgICBjb25zdCAkcGFnZSA9ICQoJ2h0bWwsIGJvZHknKTtcbiAgICBjb25zdCAkYm9keSA9ICQoJ2JvZHknKTtcbiAgICBjb25zdCAkbWVudSA9ICQoJy5uYXZpZ2F0aW9uJyk7XG4gICAgY29uc3QgJGFuY2hvckxpbmsgPSAkKCdhW2hyZWZePVwiLyNcIl0nKTtcbiAgICBjb25zdCBBTklNQVRJT05fU1BFRUQgPSA0MDA7XG4gICAgY29uc3QgSEVBREVSX0hFSUdIVCA9IDA7XG4gICAgY29uc3QgT1ZFUkZMT1dfQ0xBU1MgPSAnb3ZlcmZsb3ctaGlkZGVuJztcbiAgICBjb25zdCBNT0JJTEVfVklFV19PTiA9IDk4MDtcbiAgICBmdW5jdGlvbiBzY3JvbGxpbmcoKSB7XG4gICAgICAkYW5jaG9yTGluay5vbignY2xpY2snLCBmdW5jdGlvbiBzY3JvbGxUbygpIHtcbiAgICAgICAgY29uc3QgJHBvc2l0aW9uID0gJCgkLmF0dHIodGhpcywgJ2hyZWYnKS5yZXBsYWNlKCcvJywgJycpKS5vZmZzZXQoKS50b3A7XG4gICAgICAgICRwYWdlLmFuaW1hdGUoe1xuICAgICAgICAgIHNjcm9sbFRvcDogYCR7JHBvc2l0aW9uIC0gSEVBREVSX0hFSUdIVH1weGAsXG4gICAgICAgIH0sIEFOSU1BVElPTl9TUEVFRCk7XG4gICAgICAgIGlmICgkd2luZG93LndpZHRoKCkgPD0gTU9CSUxFX1ZJRVdfT04pIHtcbiAgICAgICAgICAkbWVudS5mYWRlT3V0KCk7XG4gICAgICAgICAgJGJvZHkucmVtb3ZlQ2xhc3MoT1ZFUkZMT1dfQ0xBU1MpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbml0KCkge1xuICAgICAgaWYgKCEkcGFnZS5sZW5ndGgpIHJldHVybjtcbiAgICAgIHNjcm9sbGluZygpO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgaW5pdDogaW5pdCgpLFxuICAgIH07XG4gIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBwYWdlU2Nyb2xsO1xuIl19
