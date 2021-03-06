# laxar-vue-adapter

> Implement _[LaxarJS][laxar]_ widgets and controls with _[Vue.js][vue]_.

* [Installation](#installation)
* [Getting started](#getting-started)
  * [Separate files](#separate-files)
  * [Single file components](#single-file-components)
* [LaxarJS integration](#laxarjs-integration)
  * [Injections](#injections)
  * [axContext](#axcontext)
  * [Controls](#controls)
  * [Widget Areas](#widget-areas)
  * [Testing](#testing)
  * [Theming](#theming)


## Installation

The recommended installation is through NPM:

```console
npm install --save laxar-vue-adapter
```

If using the source module instead, you need to ensure that the `.js` file is loaded with ES2015 support, plus support for Object spread.


## Getting started

You can either use the familiar directory structure for LaxarJS widgets, with separate `.js`, `.html` and `.css` files, or you can use the [`vue-loader`][vue-loader] and put the whole widget into a single `.vue` file.

In any case, your widget module will have to export an object of [_Vue.js_ options][vue-options].
These will be passed to `Vue.extend()` by the adapter (together with some extras to enable widget service [injections](#injections)) so make sure you use options that are supported in component definitions.


### Separate files

When using separate files for HTML template and controller logic, the template will be compiled on-the-fly in the user's browser, incurring a slight performance penalty.
You will also have to make sure that `vue` resolves to the so-called "[standalone build][vue-standalone]" of _Vue.js_.

```html
<!-- default.theme/my-widget.html -->
<b>{{counter}}</b>
```

```js
// my-widget.js
export default {
   data() {
      return { counter: 0 };
   },
   created() {
      this.interval = setInterval( () => {
         this.counter++;
      }, 1000 );
   },
   destroyed() {
      clearInterval( this.interval );
   }
}
```

You have to make sure `laxar-vue-adapter` has access to [`Vue.compile`][vue-compile] to compile the template HTML.
This method is not part of _Vue.js'_ default _NPM_ package.
Using [webpack][webpack], you can use the standalone build of _Vue.js_ by defining an alias in your resolve configuration:

```js
// webpack.config.js
module.exports = {
   resolve: {
      alias: {
         'vue$': 'vue/dist/vue.js'
      }
   }
};
```


### Single file components

In this example the `vue-loader` will preprocess the `.vue` file and compile the template to a JavaScript function.

```vue
<!-- my-widget.vue -->
<template>
   <b class="counter">{{counter}}</b>
</template>

<script>
export default {
   data() {
      return { counter: 0 };
   },
   created() {
      this.interval = setInterval( () => {
         this.counter++;
      }, 1000 );
   },
   destroyed() {
      clearInterval( this.interval );
   }
}
</script>

<style>
.counter {
   color: red;
}
</style>
```

Make sure [`vue-loader`][vue-loader] is installed and set your `webpack.config.js` accordingly.

```js
// webpack.config.js
module.exports = {
   resolve: {
      extensions: [ '', '.js', '.vue' ]
   },
   module: {
      loaders: [ {
         test: /\.vue$/,
         loader: 'vue-loader'
      } ]
   }
};
```


## LaxarJS integration

With the basic setup described above, simple _Vue_ components should _just work_.
If you are developing anything useful you probably need to interact with the LaxarJS runtime in some way.
The following sections will describe how the `laxar-vue-adapter` provides a (mostly) non-invasive integration with _LaxarJS_.


### Injections

_LaxarJS_ [widget services](https://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services) can be injected into your _Vue.js_ component by using the `injections` mixin provided by the `laxar-vue-adapter`.
An list of corresponding injection values is then available to the component instance as `this.$injections`.

```js
import { injections } from 'laxar-vue-adapter';
export default {
   mixins: [ injections( 'axEventBus', 'axGlobalLog' ) ],
   created() {
      const [ eventBus, log ] = this.$injections;
      eventBus.subscribe( 'beginLifecycleRequest', () => {
         log.debug( 'So it has begun!' );
      } );
   }
};
```


### axContext

The [`axContext`](https://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axcontext-) service is automatically injected.
It can be accessed via the `$data` property.
The context does not appear among `this.$injections` unless you explicitly specify it by using the `injections` mixin.
Its presence in the component's `$data` allows you to easily access the `id()` generator, the event bus and the features configured for your particular widget instance.

```js
export default {
   template: '<b :id="id(\'some-suffix\')">{{ features.mytext }}</b>',
   created() {
      this.eventBus.subscribe( 'some-event', this.methods.eventHandler );
   },
   methods: {
      eventHandler( payload, meta ) {
         // ...
      }
   }
};
```


### Controls

You can specify controls in your `widget.json`.
Just list a module that can resolved by the module loader.
The control will then be [registered locally](https://vuejs.org/v2/guide/components.html#Local-Registration) as a component with the name specified in its `control.json`.

```json
{
   "name": "my-widget",
   "integration": {
      "technology": "vue",
      "type": "widget"
   },
   "controls": [ "my-vue-control-module" ]
}
```

```json
{
   "name": "my-vue-control",
   "integration": {
      "technology": "vue",
      "type": "control"
   }
}
```

```vue
<!-- my-widget.vue -->
<template>
<div>This is my widget</div>
<my-vue-control>It's using a control</my-vue-control>
</template>

<script>
export default {
   components: {
      // this part is automatically supplied by the runtime:
      'my-vue-control': ConstructorCreatedByTheVueAdapter
   }
};
</script>
```


#### Injections in controls

Controls can access the following global services via injections:

* [`axConfiguration`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axconfiguration-)
* [`axGlobalEventBus`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axglobaleventbus-)
* [`axGlobalLog`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axgloballog-)
* [`axGlobalStorage`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axglobalstorage-)
* [`axHeartbeat`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axheartbeat-)
* [`axTooling`](http://laxarjs.org/docs/laxar-v2-latest/manuals/widget_services#-axtooling-)


#### axWidgetServices

The services of the widget instance that uses the control can be injected as `axWidgetServices`.

```js
import { injections } from 'laxar-vue-adapter';
// my-vue-control.js
export default {
   mixins: [ injections( 'axWidgetServices' ) ],
   created() {
      const [ { axLog } ] = this.$injections;
      axLog.info( 'I\'m a control using my widget\'s logger!' );
    }
  };
```


### Widget Areas

All Vue.js components loaded by this adapter have access to an additional component `ax-widget-area`.
This component can be used to provide containers for nested widgets.

```vue
<!-- my-widget.vue -->

<template>
   <div>
      <h1>Here are two areas:</h1>
      <ax-widget-area name="first" />
      <ax-widget-area name="second" />
   </div>
</template>

<script>
   <!-- export default { ... }; -->
</script>
```

No modifications to the component JavaScript code are needed.
Behind the scenes, the widget area component uses the `axAreaHelper` widget service injection, to provide additional widget areas:

```js
   // my-page.json, areas:
   "content": [
      {
         "widget": "my-widget",
         "id": "widgetX"
      }
   ],
   "widgetX.first": [ /* ...more widgets... */ ],
   "widgetX.second": [ /* ... */ ]
```

Note that once mounted, widget areas should not be destroyed until their containing page is destroyed.
Use styling (`display: none`) to hide and show areas as needed.
This is a necessary evil for now, as some integration technologies (such as AngularJS v1) do not support temporary removal of their DOM.
For this reason, it is also not recommended to use a mutable expression for the `name` prop.


### Testing

LaxarJS widgets and activities can be tested using [LaxarJS Mocks](http://laxarjs.org/docs/laxar-mocks-v2-latest) just like when using other LaxarJS integration technologies.
Note that the `laxar-vue-adapter` makes available the special property `axMocks.widget.vueComponent` when `axMocks.widget.load` is called, referencing your widget's Vue.js component instance.
You can use this property to inspect your widget component data as well as its `eventBus`, and to simulate method calls.


### Theming

Theme directories are fully supported.
Additionally, if you are using the `vue-loader`, the default HTML and CSS can be embedded in the main `.vue` file.
However, the HTML and CSS corresponding to the default theme will be present in the bundled application regardless of the theme used for bundling.
If that is an issue, we recommend using separate files for the HTML template and CSS.


#### Precompiling themed assets

Using external (S)CSS is supported, just like with other integration technologies.

You can also use the `vue-loader` to precompile your *themed HTML and CSS.*
Just specify a Vue.js component file as your `templateSource` and make sure it gets processed by the `vue-loader`.

```json
{
   "name": "my-widget",
   "templateSource": "my-widget.vue"
}
```

```vue
<!-- any.theme/my-widget.vue -->
<template>
   <b class="counter">{{counter}}</b>
</template>

<style>
.counter {
   color: red;
}
</style>
```

In this case, the component scripting logic could be kept in a `my-widget.js` at the widget's top-level.


## Hacking the Adapter

First, clone the repository and fetch the dependencies:

```console
git clone https://github.com/LaxarJS/laxar-vue-adapter.git
cd laxar-vue-adapter
npm install
```

To rebuild the _pre-compiled bundle_, use:

```console
npm run dist
```

Otherwise, you may need to adjust your project to load the adapter with ES2015 support.
To pick up clone from within a LaxarJS application, you may need to modify the project's webpack resolve configuration.

To _test_ the adapter, run:

```console
npm test
```

For interactive tests that can be inspected in the browser, run:

```console
npm start
```

Now you can access the spec-tests at http://localhost:8080/dist/spec/laxar-vue-adapter.spec.html


[laxar]: https://laxarjs.org/
[vue]: https://vuejs.org/
[webpack]: https://webpack.js.org/
[vue-options]: https://vuejs.org/v2/api/#Options-Data
[vue-loader]: https://vue-loader.vuejs.org/en/index.html
[vue-compile]: https://vuejs.org/v2/api/#Vue-compile
[vue-standalone]: https://vuejs.org/v2/guide/installation.html#Standalone-vs-Runtime-only-Build
