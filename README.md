# vegas-scrollTo + SPY

`VGSpy` - небольшая библиотека на vanilla JS для навигации по секциям страницы:

- клик по пункту меню скроллит к нужному блоку;
- при прокрутке подсвечивается текущий пункт;
- можно задавать смещения (`offset`) на уровне меню и отдельных ссылок;
- можно синхронизировать hash в URL через History API (`state`);
- есть коллбеки `onClick` и `onActive`.

## Как это работает

1. Скрипт находит меню с атрибутом `data-vgspy`.
2. Внутри меню ищет ссылки:
   - сначала элементы с `data-target`,
   - если их нет, берет все `<a>`.
3. Для каждой ссылки определяет целевую секцию по `data-target` или `href` (`#id`, `/#id`, `https://site/page#id`).
4. По клику:
   - проставляет активные классы,
   - делает `window.scrollTo(0, top)`,
   - при `state=true` обновляет hash.
5. На `scroll` через `requestAnimationFrame` пересчитывает активную секцию и обновляет активные классы.

## Установка

```bash
npm i vgscrollto
```

## Быстрый старт

### HTML

```html
<nav data-vgspy data-offset="-80" data-state="true">
  <a href="#section-1" data-offset="-20">Секция 1</a>
  <a href="#section-2" data-offset="-20" data-offset-down="-80" data-offset-up="0">Секция 2</a>
  <a data-target="section-3" data-offset="-20">Секция 3</a>
</nav>

<section id="section-1"></section>
<section id="section-2"></section>
<section id="section-3"></section>
```

### ESM

```js
import { VGSpy } from "vgscrollto";

new VGSpy("[data-vgspy]", {
  offset: -80,
  state: true,
  activeClass: "active is-current",
  onClick: (event, link) => {
    // ваш код
  },
  onActive: (link, section) => {
    // ваш код
  },
});
```

### UMD (browser)

```html
<script src="./dist/vgspy.umd.js"></script>
```

Если на странице есть `data-vgspy`, автоинициализация произойдет сама. При необходимости можно создать экземпляр вручную:

```js
new window.VGSpy("[data-vgspy]");
```

## Опции конструктора

```js
new VGSpy(navSection, options);
```

| Опция | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `offset` | `number` | `0` | Глобальное смещение для расчета позиции секции. |
| `activeClass` | `string` | `"active"` | Один или несколько классов через пробел. |
| `onClick` | `function` | `null` | Вызывается на клик: `(event, link)`. |
| `onActive` | `function` | `null` | Вызывается при активации: `(link, section)`. |

`navSection` можно передать как CSS-селектор (`string`) или как `HTMLElement`.

## Data-атрибуты

- `data-vgspy` - включает автоинициализацию меню.
- `data-offset` (на контейнере) - глобальный offset.
- `data-target` (на ссылке) - цель секции (id с `#` или без).
- `data-offset` (на ссылке) - offset по умолчанию для всех направлений.
- `data-offset-up` (на ссылке) - offset только для движения вверх.
- `data-offset-down` (на ссылке) - offset только для движения вниз.

Приоритет:
1. Для `up`: `data-offset-up`, если нет - `data-offset`.
2. Для `down`: `data-offset-down`, если нет - `data-offset`.
3. Если ничего не задано - `0`.
