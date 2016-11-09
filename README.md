# laxar-vue-adapter

*Warning:* This is still experimental, HOWEVER, you might be able to use it
to develop widgets with [Vue.js](https://vuejs.org).

You can either use the familiar directory structure with separate `.js`, `.html`
and `.css` files, or you can use the [`vue-loader`](https://vue-loader.vuejs.org/en/index.html)
and put the whole widget into a single `.vue` file.

# Separate files:

Note that in this case the template will be compiled on-the-fly in the user's browser and
might incur a slight performance penalty. You will also have to make sure that `vue` resolves
to the so-called "standalone build" of Vue.js. (See `webpack.config` below)

```html
<!-- default.theme/my-widget.html -->
<b>{counter}}</b>
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

```js
// webpack.config.js
module.exports = {
   resolve: {
      alias: {
         'vue': 'vue/dist/vue.min.js'
      }
   }
};
```

# Single file

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

# Injections

You can inject _LaxarJS_ [widget services](https://github.com/LaxarJS/laxar/blob/master/docs/manuals/widget_services.md)
into your Vue.js component by using the `injections` option. Your component will then be instantiated with
an object containing the requested services. The injections will also be available as `this.$injections` in your
component.

```js
export default {
   injections: [ 'axEventBus', 'axGlobalLog' ],
   created() {
      const { axEventBus, axGlobalLog } = this.$options.injections;
      axEventBus === this.$injections[ 0 ];
      axGlobalLog === this.$injections[ 1 ];
   }
};
```

## Default injections, axContext

The [`axContext`](https://github.com/LaxarJS/laxar/blob/master/docs/manuals/widget_services.md#axcontext)
service is automatically injected. It can be accessed via the `$data` property or as
`this.$options.injections.axContext`. It does not appear in `this.$injections` unless you specify it in
your component's options. This allows you to easily access (for example) the `id()` generator and
the configured features.

```js
export default {
   template: '<b>{{features.mytext}}</b>',
   created() {
      this.$data.eventBus === this.$options.injections.axContext.eventBus;
   }
};
```

# Controls

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

# Theming

Theme directories are fully supported. Additionally, if you are using the `vue-loader`, the
default theme template and CSS can be embedded in the `.vue` file. However, the HTML and CSS
corresponding to the default theme will be present in the bundled application regardless of
the theme used for bundling. If that is an issue, we recommend using separate files for the
HTML template and CSS.

# Precompiling themed assets

_Bonus feature_: You can also use the `vue-loader` to precompile your template HTML (and CSS).
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
