# laxar-vue-adapter

*Warning:* This is still experimental, HOWEVER, you might be able to use it
to develop widgets with [Vue.js](https://vuejs.org).

You can either use the familiar directory structure with separate `.js`, `.html`
and `.css` files, or you can use the [`vue-loader`](https://vue-loader.vuejs.org/en/index.html)
and put the whole widget into a single `.vue` file.

# Separate files:

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

# Single file

```vue
<!-- my-widget.vue -->
<template>
   <b>{{counter}}</b>
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
