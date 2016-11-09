# laxar-vue-adapter

> Implement _[LaxarJS][laxar]_ widgets and controls with _[Vue.js][vue]_.

- [Installation](#installation)
- [Getting started](#getting-started)
  - [Separate files](#separate-files)
  - [Single file components](#single-file-components)
- [LaxarJS integration](#laxarjs-integration)
  - [Injections](#injections)
  - [Default injections, axContext](#default-injections-axcontext)
  - [Controls](#controls)
  - [Theming](#theming)
  
## Installation

You can install this module via _NPM_, _Bower_ or just place the `.js` file somewhere it can be found.
Just make sure your JavaScript pipeline supports ES2015 and Object spread.


## Getting started

You can either use the familiar directory structure with separate `.js`, `.html`
and `.css` files, or you can use the [`vue-loader`][vue-loader] and put the whole
widget into a single `.vue` file.

In any case, your widget module will have to export an object of [_Vue_ options][vue-options].
These will be passed to `Vue.extend()` by the adapter (together with some extras to enable
widget service [injections](#injections)) so make sure you use options that are supported
in component definitions.


### Separate files

Note that in this case the template will be compiled on-the-fly in the user's browser and
might incur a slight performance penalty. You will also have to make sure that `vue` resolves
to the so-called "[standalone build][vue-standalone]" of _Vue.js_.

```html
<!-- default.theme/my-widget.html -->
<b>{{counter}}</b>
```

```js
// my-widget.js
export default {
   data: {
      counter: 0
   },
   created() {
      this.interval = setInterval(() => {
         this.counter++;
      }, 1000);
   },
   destroyed() {
      clearInterval(this.interval);
   }
}
```

You have to make sure `laxar-vue-adapter` has access to [`Vue.compile`][vue-compile] to compile the template
HTML. This method is not part of _Vue.js'_ default _NPM_ package. If you are using [webpack][webpack] (which
you absolutely should) you can use the standalone build of _Vue.js_ by defining an alias in your resolve
configuration:

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

In this example the `vue-loader` will preprocess the `.vue` file and compile the template to
a JavaScript function.

```vue
<!-- my-widget.vue -->
<template>
   <b class="counter">{{counter}}</b>
</template>

<script>
export default {
   data: {
      counter: 0
   },
   created() {
      this.interval = setInterval(() => {
         this.counter++;
      }, 1000);
   },
   destroyed() {
      clearInterval(this.interval);
   }
}
</script>

<style>
.counter {
   color: red;
}
</stlye>
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
The following sections will describe how the `laxar-vue-loader` provides a (mostly) non-invasive integration
with LaxarJS.


### Injections

_LaxarJS_ [widget services](https://github.com/LaxarJS/laxar/blob/master/docs/manuals/widget_services.md) can
be injected into your _Vue.js_ component by using the `injections` option. Your component will then be
instantiated with an `injections` option containing the requested services. The injections will also be
available as `this.$injections` in your component.

```js
export default {
   injections: [ 'axEventBus', 'axGlobalLog' ],
   created() {
      const [ eventBus, globalLog ] = this.$injections;
      const { axEventBus, axGlobalLog } = this.$options.injections;
      axEventBus === eventBus;
      axGlobalLog === globalLog;
   }
};
```

### Default injections, axContext

The [`axContext`](https://github.com/LaxarJS/laxar/blob/master/docs/manuals/widget_services.md#axcontext)
service is automatically injected. It can be accessed via the `$data` property or as
`this.$options.injections.axContext`. It does not appear in `this.$injections` unless you explicitly specify
it in your component's `injections` option. Its presence in the component's `$data` allows you to easily
access the `id()` generator, the event bus and the features configured for your particular widget instance.

```js
export default {
   template: '<b :id="id('some-suffix')">{{features.mytext}}</b>',
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

You can specify controls in your `widget.json`. Just list a module that can resolved by the module loader.
The control will then be [registered locally](https://vuejs.org/v2/guide/components.html#Local-Registration)
as a component with the name specified in its `control.json`.

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

### Theming

Theme directories are fully supported. Additionally, if you are using the `vue-loader`, the
default theme template and CSS can be embedded in the `.vue` file. However, the HTML and CSS
corresponding to the default theme will be present in the bundled application regardless of
the theme used for bundling. If that is an issue, we recommend using separate files for the
HTML template and CSS.

#### Precompiling themed assets

You can also use the `vue-loader` to precompile your template HTML (and CSS).
Just specify a Vue.js component file as your `templateSource` and make sure it gets processed
by the `vue-loader`.


```json
{
   "name": "my-widget",
   "templateSource": "my-widget.vue"
}
```

```vue
<!-- default.theme/my-widget.vue -->
<template>
   <b class="counter">{{counter}}</b>
</template>

<style>
.counter {
   color: red;
}
</style>
```


[laxar]: https://laxarjs.org/
[vue]: https://vuejs.org/
[webpack]: https://webpack.github.io/
[vue-options]: https://vuejs.org/v2/api/#Options-Data
[vue-loader]: https://vue-loader.vuejs.org/en/index.html
[vue-compile]: https://vuejs.org/v2/api/#Vue-compile
[vue-standalone]: https://vuejs.org/v2/guide/installation.html#Standalone-vs-Runtime-only-Build
