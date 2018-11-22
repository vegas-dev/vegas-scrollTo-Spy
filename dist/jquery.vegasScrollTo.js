/**
 * Created by Vegas s on 22.11.2018.
 */
(function( $ ) {

	$.fn.vegasScrollTo = function(options) {

		var options = $.extend({
			speed: 1000
		}, arguments[0] || {});

		var $self = this;

		$self.on('click', function () {
			var $el = $(this).attr('href');
			var speed = $(this).data('speed') || options.speed;
			var $destination = $($el).offset().top;

			$('html').animate({ scrollTop: $destination }, speed);

			return false;
		});

		return this;

	};
})(jQuery);