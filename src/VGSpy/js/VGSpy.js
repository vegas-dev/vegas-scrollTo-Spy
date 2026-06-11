/**
 * --------------------------------------------------------------------------
 * Module: VGSpy
 * Author: Vegas DEV
 * License: see LICENSE.md
 * --------------------------------------------------------------------------
 */

class VGSpy {
	constructor(navSection, arg = {}) {
		this.isInit = false;
		this.isReady = false;
		this.isClick = false;
		this.currentTarget = '';
		this.navSection = null;
		this.links = [];
		this.items = [];
		this.activeItem = null;
		this.rafScroll = null;
		this.scrollDirection = 'down';
		this.lastPosition = this.getCurrentPosition();

		if (!navSection) return;

		if (typeof navSection === 'string') {
			navSection = document.querySelector(navSection);
		}

		if (navSection instanceof HTMLElement) {
			this.navSection = navSection;
			this.settings = {
				offset: this.toInt(navSection.dataset.offset, arg.offset),
				isState: this.toBool(navSection.dataset.state, arg.state),
				visibilityThreshold: this.normalizeVisibilityThreshold(
					navSection.dataset.visibilityThreshold,
					arg.visibilityThreshold
				),
				onInit: typeof arg.onInit === 'function' ? arg.onInit : null,
				onMove: typeof arg.onMove === 'function' ? arg.onMove : null,
				onActive: typeof arg.onActive === 'function' ? arg.onActive : null,
				onClick: typeof arg.onClick === 'function' ? arg.onClick : null,
				activeClass: this.normalizeActiveClass(arg.activeClass)
			};

			let linksWithTarget = navSection.querySelectorAll('[data-target]');
			this.links = linksWithTarget.length ?
				Array.from(linksWithTarget) :
				Array.from(navSection.querySelectorAll('a'))
			;

			this.items = this.collectItems(this.links);
			this.isInit = this.items.length > 0;

			if (this.isInit) {
				this.onLoad();
				this.onClick();
				this.onScroll();
			}
		}
	}

	onLoad() {
		if (!this.isInit) return;
		let _this = this;

		if (document.readyState === 'complete') {
			_this.setCurrentSection(null, {
				scrollDirection: _this.scrollDirection,
				source: 'init'
			});
			_this.emitInit();
			return;
		}

		window.addEventListener('load', function () {
			_this.setCurrentSection(null, {
				scrollDirection: _this.scrollDirection,
				source: 'init'
			});
			_this.emitInit();
		}, {once: true});
	}

	onClick() {
		if (!this.isInit) return;
		let _this = this;

		for (let i = 0; i < _this.links.length; i++) {
			_this.links[i].addEventListener('click', function (e) {
				if (typeof _this.settings.onClick === 'function') {
					_this.settings.onClick(e, this);
				}

				e.preventDefault();
				_this.isClick = true;
				_this.setCurrentSection(this, {
					source: 'click'
				});

				return false;
			});
		}
	}

	onScroll() {
		if (!this.isInit) return;
		let _this = this;

		window.addEventListener('scroll', function () {
			if (_this.rafScroll !== null) return;

			_this.rafScroll = window.requestAnimationFrame(function () {
				_this.rafScroll = null;
				let previousPosition = _this.lastPosition;
				let currentPosition = _this.getCurrentPosition();
				let scrollDirection = _this.getScrollDirection(currentPosition);

				if (!_this.isClick) {
					_this.setCurrentSection(null, {
						scrollDirection: scrollDirection,
						source: 'scroll',
						position: currentPosition,
						previousPosition: previousPosition
					});
				}
			});
		}, {passive: true});
	}

	setCurrentSection($link = null, options = {
		scrollDirection: null,
		source: null,
		position: null,
		previousPosition: null
	}) {
		if (!this.isInit) return;
		let source = typeof options.source === 'string' ? options.source.trim().toLowerCase() : null;
		if (!source) {
			source = $link ? 'click' : 'scroll';
		}

		if (this.settings.isState) {
			// TODO we expect it in the next version
			/*let target = window.location.hash;
			if (target) {
				let $element = document.querySelector('[href="'+ target +'"]') ||
					document.querySelector('[href="\/' + target +'"]') ||
					document.querySelector('[data-target="'+ target.replace('#', '') +'"]') || null;

				if ($element !== null) {
					$link = $element;
				}
			}*/
		}

		if ($link) {
			let item = this.findItemByLink($link);
			if (!item) {
				this.isClick = false;
				return;
			}
			let section = this.resolveSection(item);
			if (!section) {
				this.isClick = false;
				return;
			}

			let currentPosition = this.getCurrentPosition();
			let sectionTop = this.getSectionTop(section);
			let clickDirection = sectionTop >= currentPosition ? 'down' : 'up';
			let itemOffset = this.getDirectionalOffset(item, clickDirection);
			let to = sectionTop + itemOffset + this.settings.offset;
			this.removeCurrentActive();
			this.setActive(item.link, section, {isScroll: false});
			this.activeItem = item;
			window.scrollTo(0, to);
			this.emitMove({
				source: source,
				direction: clickDirection,
				position: to,
				previousPosition: currentPosition,
				item: item,
				section: section,
				to: to
			});

			this.isClick = false;
		} else {
			let currentPosition = typeof options.position === 'number' ? options.position : this.getCurrentPosition();
			let scrollDirection = this.normalizeScrollDirection(options.scrollDirection);
			if (scrollDirection === 'both') {
				scrollDirection = this.getScrollDirection(currentPosition);
			}
			let activeItem = null;

			if (this.settings.visibilityThreshold !== null) {
				activeItem = this.findActiveItemByVisibility(this.settings.visibilityThreshold);
			} else {
				for (let i = 0; i < this.items.length; i++) {
					let item = this.items[i];
					let section = this.resolveSection(item);
					if (!section) continue;

					let itemOffset = this.getDirectionalOffset(item, scrollDirection);
					let start = this.getSectionTop(section) + itemOffset + this.settings.offset;
					let end = start + section.offsetHeight;
					let isInView = currentPosition >= start && currentPosition < end;

					if (isInView) {
						activeItem = item;
						break;
					}
				}

				if (!activeItem && this.items.length) {
					let last = null;
					for (let i = this.items.length - 1; i >= 0; i--) {
						let section = this.resolveSection(this.items[i]);
						if (section) {
							last = this.items[i];
							break;
						}
					}

					if (last) {
						let lastSection = this.resolveSection(last);
						let lastOffset = this.getDirectionalOffset(last, scrollDirection);
						let lastStart = this.getSectionTop(lastSection) + lastOffset + this.settings.offset;

						if (currentPosition >= lastStart) {
							activeItem = last;
						}
					}
				}
			}

			if (activeItem) {
				let activeSection = this.resolveSection(activeItem);
				if (activeSection) {
					this.removeCurrentActive({ignore: activeItem.link});
					this.setActive(activeItem.link, activeSection, {isScroll: true});
					this.activeItem = activeItem;
				}
			} else {
				this.removeCurrentActive();
				this.activeItem = null;
			}

			if (source !== 'init') {
				this.emitMove({
					source: source,
					direction: scrollDirection,
					position: currentPosition,
					previousPosition: options.previousPosition,
					item: this.activeItem
				});
			}
		}
	}

	setActive($link, $section, options = {isScroll: false}) {
		if (!this.isInit || !$link) return;

		const isActive = this.settings.activeClass.every(function (value){
			return $link.classList.contains(value);
		});

		if (!isActive) {
			if ($section) {
				$section.classList.add(...this.settings.activeClass);
			}

			$link.classList.add(...this.settings.activeClass);

			if (typeof this.settings.onActive === 'function') {
				this.settings.onActive($link, $section);
			}
		}

		let activeItem = this.findItemByLink($link);
		if (activeItem) {
			this.activeItem = activeItem;
		}

		if (this.settings.isState) {
			let text = this.attributes($link, 'text');
			let target = this.attributes($link, 'target');

			if (target && this.currentTarget !== target) {
				if (options.isScroll) {
					history.replaceState('', document.title + text, '#' + target);
				} else {
					history.pushState('', document.title + text, '#' + target);
				}

				this.currentTarget = target;
			}
		}
	}

	removeCurrentActive(options = { ignore: null }) {
		for (let i = 0; i < this.items.length; i++) {
			let section = this.resolveSection(this.items[i]);
			if (!section) continue;

			if (options.ignore !== this.items[i].link) {
				this.items[i].link.classList.remove(...this.settings.activeClass);
				section.classList.remove(...this.settings.activeClass);

				if (this.activeItem === this.items[i]) {
					this.activeItem = null;
				}
			}
		}
	}

	emitInit() {
		if (!this.isInit || this.isReady) return;
		this.isReady = true;

		let payload = this.createEventPayload({
			source: 'init',
			direction: this.scrollDirection,
			item: this.activeItem
		});

		if (typeof this.settings.onInit === 'function') {
			this.settings.onInit(payload, this);
		}

		this.dispatchSpyEvent('vgspy:init', payload);
	}

	emitMove(options = {}) {
		if (!this.isInit) return;

		let payload = this.createEventPayload(options);

		if (typeof this.settings.onMove === 'function') {
			this.settings.onMove(payload, this);
		}

		this.dispatchSpyEvent('vgspy:move', payload);
	}

	createEventPayload(options = {}) {
		let item = options.item || this.activeItem || null;
		let section = options.section || this.resolveSection(item);
		let source = typeof options.source === 'string' ? options.source.trim().toLowerCase() : null;
		let direction = typeof options.direction === 'string' ? options.direction : this.scrollDirection;
		direction = this.normalizeScrollDirection(direction);
		if (direction === 'both') {
			direction = this.scrollDirection;
		}

		let payload = {
			source: source,
			direction: direction,
			position: typeof options.position === 'number' ? options.position : this.getCurrentPosition(),
			previousPosition: typeof options.previousPosition === 'number' ? options.previousPosition : this.lastPosition,
			target: item ? item.target : null,
			link: item ? item.link : null,
			section: section,
			navSection: this.navSection
		};

		if (typeof options.to === 'number') {
			payload.to = options.to;
		}

		return payload;
	}

	dispatchSpyEvent(name, detail = {}) {
		if (!this.navSection || typeof this.navSection.dispatchEvent !== 'function') return;

		let event = this.createCustomEvent(name, detail);
		if (event) {
			this.navSection.dispatchEvent(event);
		}
	}

	createCustomEvent(name, detail = {}) {
		if (typeof window !== 'undefined' && typeof window.CustomEvent === 'function') {
			return new window.CustomEvent(name, {detail: detail});
		}

		if (typeof document !== 'undefined' && typeof document.createEvent === 'function') {
			let event = document.createEvent('CustomEvent');
			event.initCustomEvent(name, false, false, detail);
			return event;
		}

		return null;
	}

	attributes(self, prop = '') {
		let attrs = this.parseLinkAttributes(self);

		if (prop === 'target') return attrs.target;
		if (prop === 'offset') return attrs.offset === null ? 0 : attrs.offset;
		if (prop === 'offsetUp') return attrs.offsetUp;
		if (prop === 'offsetDown') return attrs.offsetDown;
		if (prop === 'text') return attrs.text;

		return attrs;
	}

	toInt(value, fallback = 0) {
		let number = Number.parseInt(value, 10);
		if (Number.isNaN(number)) {
			number = Number.parseInt(fallback, 10);
		}

		return Number.isNaN(number) ? 0 : number;
	}

	toBool(value, fallback = false) {
		let boolValue = this.parseBoolValue(value);
		if (boolValue === null) {
			boolValue = this.parseBoolValue(fallback);
		}

		return boolValue === null ? false : boolValue;
	}

	parseBoolValue(value) {
		if (typeof value === 'undefined' || value === null) return null;
		if (typeof value === 'boolean') return value;

		let normalizedValue = String(value).trim().toLowerCase();
		if (normalizedValue === '') return true;
		if (['true', '1', 'yes', 'on'].includes(normalizedValue)) return true;
		if (['false', '0', 'no', 'off'].includes(normalizedValue)) return false;

		return Boolean(value);
	}

	normalizeVisibilityThreshold(value, fallback = null) {
		let threshold = this.parseVisibilityThreshold(value);
		if (threshold === null) {
			threshold = this.parseVisibilityThreshold(fallback);
		}

		return threshold;
	}

	parseVisibilityThreshold(value) {
		if (typeof value === 'undefined' || value === null) return null;

		let normalizedValue = String(value).trim();
		if (normalizedValue === '') return null;

		if (normalizedValue.indexOf('%') !== -1) {
			normalizedValue = normalizedValue.replace('%', '');
		}

		let number = Number.parseFloat(normalizedValue);
		if (Number.isNaN(number)) return null;

		if (number > 1) {
			number = number / 100;
		}

		if (number < 0) number = 0;
		if (number > 1) number = 1;

		return number;
	}

	normalizeScrollDirection(value) {
		if (typeof value !== 'string') return 'both';

		let normalizedValue = value.trim().toLowerCase();
		if (normalizedValue === 'up' || normalizedValue === 'down') {
			return normalizedValue;
		}

		return 'both';
	}

	getDirectionalOffset(item, direction = null) {
		if (!item) return 0;
		this.refreshItemOffsets(item);

		let normalizedDirection = this.normalizeScrollDirection(direction);
		let defaultOffset = item.offset === null ? 0 : item.offset;

		if (normalizedDirection === 'up') {
			if (item.offsetUp !== null) return item.offsetUp;
			return defaultOffset;
		}

		if (normalizedDirection === 'down') {
			if (item.offsetDown !== null) return item.offsetDown;
			return defaultOffset;
		}

		return defaultOffset;
	}

	refreshItemOffsets(item) {
		if (!item || !item.link) return;

		item.offset = this.toOptionalInt(item.link.dataset.offset);
		item.offsetUp = this.toOptionalInt(item.link.dataset.offsetUp);
		item.offsetDown = this.toOptionalInt(item.link.dataset.offsetDown);
	}

	findActiveItemByVisibility(threshold = null) {
		if (typeof threshold !== 'number') return null;

		let activeItem = null;
		let maxRatio = -1;

		for (let i = 0; i < this.items.length; i++) {
			let item = this.items[i];
			let section = this.resolveSection(item);
			if (!section) continue;

			let ratio = this.getSectionVisibilityRatio(section);
			if (ratio >= threshold && ratio > maxRatio) {
				maxRatio = ratio;
				activeItem = item;
			}
		}

		return activeItem;
	}

	getSectionVisibilityRatio(section) {
		if (!section) return 0;

		let rect = section.getBoundingClientRect();
		let viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
		if (viewportHeight <= 0) return 0;

		let visibleTop = Math.max(rect.top, 0);
		let visibleBottom = Math.min(rect.bottom, viewportHeight);
		let visibleHeight = visibleBottom - visibleTop;

		if (visibleHeight <= 0) return 0;

		let sectionHeight = rect.height || section.offsetHeight || 0;
		let normalizedHeight = Math.min(sectionHeight, viewportHeight);
		if (normalizedHeight <= 0) return 0;

		let ratio = visibleHeight / normalizedHeight;

		if (ratio < 0) return 0;
		if (ratio > 1) return 1;
		return ratio;
	}

	getScrollDirection(currentPosition = null) {
		let position = typeof currentPosition === 'number' ? currentPosition : this.getCurrentPosition();

		if (position > this.lastPosition) {
			this.scrollDirection = 'down';
		} else if (position < this.lastPosition) {
			this.scrollDirection = 'up';
		}

		this.lastPosition = position;
		return this.scrollDirection;
	}

	normalizeActiveClass(value) {
		if (typeof value !== 'string') {
			return ['active'];
		}

		let classes = value
			.trim()
			.split(/\s+/)
			.filter(Boolean)
		;

		return classes.length ? classes : ['active'];
	}

	normalizeTarget(value = '') {
		if (typeof value !== 'string') return '';

		let target = value.trim();
		if (!target || target === 'undefined') return '';

		let hashIndex = target.lastIndexOf('#');
		if (hashIndex !== -1) {
			target = target.substring(hashIndex + 1);
		}

		if (target.indexOf('#') === 0) {
			target = target.substring(1);
		}

		return target.trim();
	}

	toOptionalInt(value) {
		if (typeof value === 'undefined' || value === null) return null;

		let normalizedValue = String(value).trim();
		if (normalizedValue === '') return null;

		let number = Number.parseInt(normalizedValue, 10);
		return Number.isNaN(number) ? null : number;
	}

	parseLinkAttributes(self) {
		let hasDataTarget = typeof self.dataset.target !== 'undefined' && self.dataset.target.trim() !== '';
		let dataTarget = hasDataTarget ? self.dataset.target : null;
		let href = self.getAttribute('href') || '';
		let rawTarget = dataTarget !== null ? dataTarget : href;

		if (dataTarget === null && href.indexOf('#') === -1) {
			rawTarget = '';
		}

		let target = this.normalizeTarget(rawTarget);
		let offset = this.toOptionalInt(self.dataset.offset);
		let offsetUp = this.toOptionalInt(self.dataset.offsetUp);
		let offsetDown = this.toOptionalInt(self.dataset.offsetDown);
		let text = (self.textContent || '').trim();

		return {
			target: target,
			offset: offset,
			offsetUp: offsetUp,
			offsetDown: offsetDown,
			text: text
		};
	}

	collectItems(links = []) {
		let items = [];

		for (let i = 0; i < links.length; i++) {
			let attrs = this.parseLinkAttributes(links[i]);
			if (!attrs.target) continue;

			items.push({
				link: links[i],
				section: document.getElementById(attrs.target),
				target: attrs.target,
				offset: attrs.offset,
				offsetUp: attrs.offsetUp,
				offsetDown: attrs.offsetDown
			});
		}

		return items;
	}

	findItemByLink(link) {
		for (let i = 0; i < this.items.length; i++) {
			if (this.items[i].link === link) {
				return this.items[i];
			}
		}

		return null;
	}

	resolveSection(item) {
		if (!item) return null;

		if (!item.section || !item.section.isConnected) {
			item.section = document.getElementById(item.target);
		}

		return item.section;
	}

	getCurrentPosition() {
		return window.pageYOffset ||
			document.documentElement.scrollTop ||
			document.body.scrollTop ||
			0
		;
	}

	getSectionTop(section) {
		return section.getBoundingClientRect().top + this.getCurrentPosition();
	}
}

let $vg_spy = document.querySelectorAll('[data-vgspy]');
if ($vg_spy.length) {
	for (let $spy of $vg_spy) {
		new VGSpy($spy);
	}
}

export default VGSpy;
