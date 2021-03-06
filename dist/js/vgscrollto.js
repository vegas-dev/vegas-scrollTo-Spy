/**
 * Created by Vegas s on 22.11.2018.
 */
(function ($) {
  $.fn.vgScrollToSpy = function (options) {
    options = $.extend({
      speed: 500,
      offset: 0,
      spy: false,
      hash: false
    }, arguments[0] || {});
    return this.each(function () {
      let $section = $(this);
      options.spy = $section.attr('data-scrollTo') === 'spy' || false;

      if (options.spy) {
        let $a = $section.find('a');
        $a.each(function () {
          onClick($(this), true);
          onScroll($(this));
        });
      } else {
        onClick($section, false);
      }

      function attributes(self, options) {
        let target = self.attr('href') || self.data('target');

        if (target !== 'undefined' && target.indexOf('#') !== -1) {
          target = target.replace(/(^.+)#/gm, '#');
        } else if (target !== 'undefined' && target.indexOf('#') === -1) {
          target = '';
        }

        return {
          target: target,
          speed: parseInt(self.data('speed')) || options.speed,
          offset: parseInt(self.data('offset')) || options.offset
        };
      }

      function onClick(self, spy) {
        self.on('click', function () {
          let data = attributes($(this), options);

          if ($(data.target).length) {
            scroll(destination(data.target, data.offset), data.speed);

            if (spy) {
              $section.find('li').removeClass('active');
              $(this).closest('li').addClass('active');
            }

            return false;
          }
        });
      }

      function destination(element, offset) {
        return $(element).offset().top + offset;
      }

      function scroll(destination, speed) {
        // TODO  parameter speed is not the lot
        $(window).scrollTop(destination); //$('html, body').animate({ scrollTop: destination }, speed);
      }

      function sTop(self, scrollTop) {
        let data = attributes(self, options),
            $element = false;

        if (data.target && $(data.target).length) {
          $element = $('body').find(data.target);
        }

        if ($element) {
          let dist = destination(self.attr('href'), data.offset);

          if (scrollTop >= dist) {
            $section.find('li').removeClass('active');
            self.closest('li').addClass('active');
          }
        }
      }

      function onScroll(self) {
        sTop(self, $(window).scrollTop());
        $(window).scroll(function () {
          sTop(self, $(this).scrollTop());
        });
      }
    });
  };
})(jQuery);
