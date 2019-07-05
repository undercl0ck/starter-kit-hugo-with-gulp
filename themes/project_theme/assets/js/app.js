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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJ0aGVtZXMvcHJvamVjdF90aGVtZS9zcmMvanMvYXBwLmpzIiwidGhlbWVzL3Byb2plY3RfdGhlbWUvc3JjL2pzL21vZHVsZXMvaGFtYnVyZ2VyLmpzIiwidGhlbWVzL3Byb2plY3RfdGhlbWUvc3JjL2pzL21vZHVsZXMvcGFnZVNjcm9sbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDTUE7Ozs7QUFDQTs7Ozs7O0FBUEE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFJQSxDQUFDLFVBQUMsQ0FBRCxFQUFPO0FBQ047QUFDQSxJQUFFLFlBQU07QUFDTixNQUFFLGNBQUYsRUFBa0IsSUFBbEIsTUFBMEIsSUFBSSxJQUFKLEdBQVcsV0FBWCxFQUExQjtBQUNBLHlCQUFXLGVBQVg7QUFDQSx3QkFBVSxPQUFWO0FBQ0QsR0FKRDtBQUtELENBUEQsRUFPRyxNQVBIOzs7Ozs7OztBQ1RBLElBQU0sWUFBWTtBQUNoQixTQURnQixxQkFDTjtBQUNSLFFBQU0sUUFBUSxFQUFFLE1BQUYsQ0FBZDtBQUNBLFFBQU0sT0FBTyxFQUFFLFlBQUYsQ0FBYjtBQUNBLFFBQU0sUUFBUSxFQUFFLE9BQUYsQ0FBZDtBQUNBLFFBQU0sV0FBVyxFQUFFLFVBQUYsQ0FBakI7QUFDQSxRQUFNLGVBQWUsRUFBRSxzQkFBRixDQUFyQjtBQUNBLFFBQU0sZ0JBQWdCLEVBQUUsd0JBQUYsQ0FBdEI7QUFDQSxRQUFNLGVBQWUsUUFBckI7QUFDQSxRQUFNLGdCQUFnQixTQUF0QjtBQUNBLGFBQVMsZUFBVCxHQUEyQjtBQUN6QixXQUFLLEVBQUwsQ0FBUSxPQUFSLEVBQWlCLFNBQVMsUUFBVCxHQUFvQjtBQUNuQyxVQUFFLElBQUYsRUFBUSxXQUFSLENBQW9CLFlBQXBCO0FBQ0EsY0FBTSxXQUFOLENBQWtCLFlBQWxCO0FBQ0EsY0FBTSxXQUFOLENBQWtCLGFBQWxCO0FBQ0EsaUJBQVMsV0FBVCxDQUFxQixZQUFyQjtBQUNELE9BTEQ7QUFNRDtBQUNELGFBQVMsYUFBVCxHQUF5QjtBQUN2QixtQkFBYSxFQUFiLENBQWdCLE9BQWhCLEVBQXlCLFVBQUMsS0FBRCxFQUFXO0FBQ2xDLGNBQU0sY0FBTjtBQUNBLGlCQUFTLFdBQVQsQ0FBcUIsWUFBckI7QUFDRCxPQUhEO0FBSUEsb0JBQWMsRUFBZCxDQUFpQixPQUFqQixFQUEwQixVQUFDLEtBQUQsRUFBVztBQUNuQyxjQUFNLGNBQU47QUFDQSxpQkFBUyxXQUFULENBQXFCLFlBQXJCO0FBQ0QsT0FIRDtBQUlEO0FBQ0QsYUFBUyxJQUFULEdBQWdCO0FBQ2QsVUFBSSxDQUFDLEtBQUssTUFBVixFQUFrQjtBQUNsQjtBQUNBO0FBQ0Q7QUFDRCxXQUFPO0FBQ0wsWUFBTTtBQURELEtBQVA7QUFHRDtBQXBDZSxDQUFsQjs7a0JBdUNlLFM7Ozs7Ozs7O0FDdkNmLElBQU0sYUFBYTtBQUNqQixpQkFEaUIsNkJBQ0M7QUFDaEIsUUFBTSxVQUFVLEVBQUUsTUFBRixDQUFoQjtBQUNBLFFBQU0sUUFBUSxFQUFFLFlBQUYsQ0FBZDtBQUNBLFFBQU0sUUFBUSxFQUFFLE1BQUYsQ0FBZDtBQUNBLFFBQU0sUUFBUSxFQUFFLE9BQUYsQ0FBZDtBQUNBLFFBQU0sY0FBYyxFQUFFLGNBQUYsQ0FBcEI7QUFDQSxRQUFNLGtCQUFrQixHQUF4QjtBQUNBLFFBQU0sZ0JBQWdCLENBQXRCO0FBQ0EsUUFBTSxpQkFBaUIsaUJBQXZCO0FBQ0EsUUFBTSxpQkFBaUIsSUFBdkI7QUFDQSxhQUFTLFNBQVQsR0FBcUI7QUFDbkIsa0JBQVksRUFBWixDQUFlLE9BQWYsRUFBd0IsU0FBUyxRQUFULENBQWtCLEtBQWxCLEVBQXlCO0FBQy9DLGNBQU0sY0FBTjtBQUNBLFlBQU0sWUFBWSxFQUFFLEVBQUUsSUFBRixDQUFPLElBQVAsRUFBYSxNQUFiLENBQUYsRUFBd0IsTUFBeEIsR0FBaUMsR0FBbkQ7QUFDQSxjQUFNLE9BQU4sQ0FBYztBQUNaLHFCQUFjLFlBQVksYUFBMUI7QUFEWSxTQUFkLEVBRUcsZUFGSDtBQUdBLFlBQUksUUFBUSxLQUFSLE1BQW1CLGNBQXZCLEVBQXVDO0FBQ3JDLGdCQUFNLE9BQU47QUFDQSxnQkFBTSxXQUFOLENBQWtCLGNBQWxCO0FBQ0Q7QUFDRCxlQUFPLEtBQVA7QUFDRCxPQVhEO0FBWUQ7QUFDRCxhQUFTLElBQVQsR0FBZ0I7QUFDZCxVQUFJLENBQUMsTUFBTSxNQUFYLEVBQW1CO0FBQ25CO0FBQ0Q7QUFDRCxXQUFPO0FBQ0wsWUFBTTtBQURELEtBQVA7QUFHRDtBQWhDZ0IsQ0FBbkI7O2tCQW1DZSxVIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLy8gWW91IGNhbiB3cml0ZSBhIGNhbGwgYW5kIGltcG9ydCB5b3VyIGZ1bmN0aW9ucyBpbiB0aGlzIGZpbGUuXG4vL1xuLy8gVGhpcyBmaWxlIHdpbGwgYmUgY29tcGlsZWQgaW50byBhcHAuanMgYW5kIHdpbGwgbm90IGJlIG1pbmlmaWVkLlxuLy8gRmVlbCBmcmVlIHdpdGggdXNpbmcgRVM2IGhlcmUuXG5cbi8vIGltcG9ydCB7TkFNRX0gZnJvbSAnLi9tb2R1bGVzLy4uLic7XG5pbXBvcnQgaGFtYnVyZ2VyIGZyb20gJy4vbW9kdWxlcy9oYW1idXJnZXInO1xuaW1wb3J0IHBhZ2VTY3JvbGwgZnJvbSAnLi9tb2R1bGVzL3BhZ2VTY3JvbGwnO1xuXG4oKCQpID0+IHtcbiAgLy8gV2hlbiBET00gaXMgcmVhZHlcbiAgJCgoKSA9PiB7XG4gICAgJCgnI2N1cnJlbnRZZWFyJykudGV4dChgJHtuZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCl9YCk7XG4gICAgcGFnZVNjcm9sbC5zbW9vdGhTY3JvbGxpbmcoKTtcbiAgICBoYW1idXJnZXIuaGFuZGxlcigpO1xuICB9KTtcbn0pKGpRdWVyeSk7XG4iLCJjb25zdCBoYW1idXJnZXIgPSB7XG4gIGhhbmRsZXIoKSB7XG4gICAgY29uc3QgJGJvZHkgPSAkKCdib2R5Jyk7XG4gICAgY29uc3QgJGJ0biA9ICQoJy5oYW1idXJnZXInKTtcbiAgICBjb25zdCAkbWVudSA9ICQoJy5tZW51Jyk7XG4gICAgY29uc3QgJHN1Ym1lbnUgPSAkKCcuc3VibWVudScpO1xuICAgIGNvbnN0ICRzdWJtZW51TGluayA9ICQoJy5tZW51X19saW5rLS1zdWJtZW51Jyk7XG4gICAgY29uc3QgJHN1Ym1lbnVDbG9zZSA9ICQoJy5zdWJtZW51X19pdGVtLS1zdGF0aWMnKTtcbiAgICBjb25zdCBPUEVORURfQ0xBU1MgPSAnb3BlbmVkJztcbiAgICBjb25zdCBPVkVSTEFZX0NMQVNTID0gJ292ZXJsYXknO1xuICAgIGZ1bmN0aW9uIGhhbWJ1cmdlclRvZ2dsZSgpIHtcbiAgICAgICRidG4ub24oJ2NsaWNrJywgZnVuY3Rpb24gc3dpdGNoZXIoKSB7XG4gICAgICAgICQodGhpcykudG9nZ2xlQ2xhc3MoT1BFTkVEX0NMQVNTKTtcbiAgICAgICAgJG1lbnUudG9nZ2xlQ2xhc3MoT1BFTkVEX0NMQVNTKTtcbiAgICAgICAgJGJvZHkudG9nZ2xlQ2xhc3MoT1ZFUkxBWV9DTEFTUyk7XG4gICAgICAgICRzdWJtZW51LnJlbW92ZUNsYXNzKE9QRU5FRF9DTEFTUyk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gc3VibWVudVRvZ2dsZSgpIHtcbiAgICAgICRzdWJtZW51TGluay5vbignY2xpY2snLCAoZXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgJHN1Ym1lbnUudG9nZ2xlQ2xhc3MoT1BFTkVEX0NMQVNTKTtcbiAgICAgIH0pO1xuICAgICAgJHN1Ym1lbnVDbG9zZS5vbignY2xpY2snLCAoZXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgJHN1Ym1lbnUudG9nZ2xlQ2xhc3MoT1BFTkVEX0NMQVNTKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbml0KCkge1xuICAgICAgaWYgKCEkYnRuLmxlbmd0aCkgcmV0dXJuO1xuICAgICAgaGFtYnVyZ2VyVG9nZ2xlKCk7XG4gICAgICBzdWJtZW51VG9nZ2xlKCk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBpbml0OiBpbml0KCksXG4gICAgfTtcbiAgfSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGhhbWJ1cmdlcjtcbiIsImNvbnN0IHBhZ2VTY3JvbGwgPSB7XG4gIHNtb290aFNjcm9sbGluZygpIHtcbiAgICBjb25zdCAkd2luZG93ID0gJCh3aW5kb3cpO1xuICAgIGNvbnN0ICRwYWdlID0gJCgnaHRtbCwgYm9keScpO1xuICAgIGNvbnN0ICRib2R5ID0gJCgnYm9keScpO1xuICAgIGNvbnN0ICRtZW51ID0gJCgnLm1lbnUnKTtcbiAgICBjb25zdCAkYW5jaG9yTGluayA9ICQoJ2FbaHJlZl49XCIjXCJdJyk7XG4gICAgY29uc3QgQU5JTUFUSU9OX1NQRUVEID0gNDAwO1xuICAgIGNvbnN0IEhFQURFUl9IRUlHSFQgPSAwO1xuICAgIGNvbnN0IE9WRVJGTE9XX0NMQVNTID0gJ292ZXJmbG93LWhpZGRlbic7XG4gICAgY29uc3QgTU9CSUxFX1ZJRVdfT04gPSAxMDI0O1xuICAgIGZ1bmN0aW9uIHNjcm9sbGluZygpIHtcbiAgICAgICRhbmNob3JMaW5rLm9uKCdjbGljaycsIGZ1bmN0aW9uIHNjcm9sbFRvKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0ICRwb3NpdGlvbiA9ICQoJC5hdHRyKHRoaXMsICdocmVmJykpLm9mZnNldCgpLnRvcDtcbiAgICAgICAgJHBhZ2UuYW5pbWF0ZSh7XG4gICAgICAgICAgc2Nyb2xsVG9wOiBgJHskcG9zaXRpb24gLSBIRUFERVJfSEVJR0hUfXB4YCxcbiAgICAgICAgfSwgQU5JTUFUSU9OX1NQRUVEKTtcbiAgICAgICAgaWYgKCR3aW5kb3cud2lkdGgoKSA8PSBNT0JJTEVfVklFV19PTikge1xuICAgICAgICAgICRtZW51LmZhZGVPdXQoKTtcbiAgICAgICAgICAkYm9keS5yZW1vdmVDbGFzcyhPVkVSRkxPV19DTEFTUyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgICBpZiAoISRwYWdlLmxlbmd0aCkgcmV0dXJuO1xuICAgICAgc2Nyb2xsaW5nKCk7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBpbml0OiBpbml0KCksXG4gICAgfTtcbiAgfSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHBhZ2VTY3JvbGw7XG4iXX0=
