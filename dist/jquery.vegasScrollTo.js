/**
 * Created by Vegas s on 22.11.2018.
 */

(function ($) {
	"use strict";
	
	$.fn.vegasScrollTo = function (options) {
		
		options = $.extend({
			speed: 1000,
			offset: 0,
			spy: false,
		}, arguments[0] || {});
		
		let $container = this;
		
		$container.each(function () {
			let $section = $(this);
			
			options.spy = $section.attr('data-scrollTo') === 'spy' || false;
			
			if (options.spy) {
				let $a = $section.find('a');
				
				$a.each(function () {
					onClick($(this), true);
					onScroll($(this));
				});
				
			} else {
				onClick($section, false)
			}
			
			function onClick(self, spy) {
				self.on('click', function () {
					let data = attributes($(this), options);
					
					if ($(data.target).length) {
						scroll(destination(data.target, data.offset), data.speed);
					}
					
					if (spy) {
						$section.find('li').removeClass('active');
						$(this).closest('li').addClass('active');
					}
					
					return false;
				});
			}
			
			function onScroll(self) {
				sTop(self, $(window).scrollTop());
				
				$(window).scroll(function () {
					sTop(self, $(this).scrollTop())
				});
				
				
			}
			
			function sTop(self, scrollTop) {
				
				let data = attributes(self, options),
					$element = false;
				
				if ($(data.target).length) {
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
			
			function attributes(self, options) {
				return {
					target: self.attr('href') || self.data('target'),
					speed: self.data('speed') || options.speed,
					offset: self.data('offset') || options.offset
				};
			}
			
			function destination(element, offset) {
				return $(element).offset().top + (offset);
			}
			
			function scroll(destination, speed) {
				$('html, body').animate({scrollTop: destination}, speed);
			}
		});
		
		return this;
	};
})(jQuery);


(function (document, $) {
	"use strict";
	
	$(document).ready(function () {
		$('[data-scrollTo]').vegasScrollTo();
	});
	
})(document, jQuery);