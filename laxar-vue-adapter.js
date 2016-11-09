/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */

/**
 * Implements the LaxarJS adapter API for the integration technology "vue":
 * https://github.com/LaxarJS/laxar/blob/master/docs/manuals/adapters.md
 *
 * @module laxar-vue-adapter
 */

import Vue from 'vue';

export const technology = 'vue';

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function bootstrap( {}, { widgetLoader, artifactProvider, log } ) {

   const { adapterErrors } = widgetLoader;

   const components = {
      widgets: {},
      controls: {}
   };

   return {
      create,
      technology
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function create( { widgetName, anchorElement, services, onBeforeControllerCreation } ) {

      const provider = artifactProvider.forWidget( widgetName );

      return provideComponent( provider, components.widgets )
         .then( Component => {
            const mixin = injectionsMixin( Component.options.injections, services );

            onBeforeControllerCreation( mixin.injections );

            const vm = new Component( { mixins: [ mixin ] } );

            return {
               domAttachTo( areaElement, templateHtml ) {
                  if( templateHtml ) {
                     const res = compileTemplate( templateHtml, log );

                     vm.$options.render = res.render;
                     vm.$options.staticRenderFns = res.staticRenderFns;

                     // attach beforeCreate, beforeDestroy hooks to enable hot reload
                     if( res.beforeCreate && res.beforeDestroy ) {
                        vm.$options.beforeCreate.push.apply( vm.$options.beforeCreate, res.beforeCreate );
                        vm.$options.beforeDestroy.push.apply( vm.$options.beforeDestroy, res.beforeDestroy );

                        // call beforeCreate hook manually because the component is already created
                        res.beforeCreate.forEach( fn => fn.apply( vm ) );
                     }
                  }
                  vm.$mount( anchorElement, true );
                  areaElement.appendChild( anchorElement );
               },
               domDetach() {
                  const parent = anchorElement.parentNode;
                  if( parent ) {
                     parent.removeChild( anchorElement );
                  }
               },
               destroy() {
                  vm.$destroy();
               }
            };
         } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function provideComponent( provider, cache = {} ) {
      return provider.descriptor()
         .then( ( { name, controls = [] } ) => {
            if( !cache[ name ] ) {
               cache[ name ] = Promise.all( [
                  provider.module(),
                  provideComponents( controls.map( artifactProvider.forControl ), components.controls )
               ] ).then( ( [ module, controls ] ) => Vue.extend( {
                  // modules loaded with the vue-loader have a _Ctor property which causes them to be non-
                  // extensible with Vue.extend
                  ...module,
                  _Ctor: null,
                  // store name from descriptor so it is available to provideComponents and so that
                  // components can be nested recursively in their HTML templates
                  name,
                  // register control components locally, but also allow modules to just import
                  // components themselves
                  components: {
                     ...controls,
                     ...module.components
                  }
               } ) );
            }

            return cache[ name ];
         } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function provideComponents( providers, cache = {} ) {
      return Promise.all( providers.map( provider => provideComponent( provider, cache ) ) )
         .then( components => components.reduce( ( components, component ) => {
            const { name } = component.options;
            components[ name ] = component;
            return components;
         }, {} ) );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function injectionsMixin( injections = [], services ) {
      return {
         beforeCreate() {
            this.$injections = injections
               .map( name => this.$options.injections[ name ] );
         },
         data() {
            return this.$options.injections.axContext;
         },
         injections: [ 'axContext', ...injections ].reduce( ( injections, injection ) => {
            if( !services[ injection ] ) {
               throw adapterErrors.unknownInjection( { technology, injection, widgetName } );
            }
            injections[ injection ] = services[ injection ];
            return injections;
         }, {} )
      };
   }

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function compileTemplate( template, log ) {
   if( typeof template === 'object' && typeof template.render === 'function' ) {
      return template; // already compiled, return unmodified
   }
   if( !Vue.compile ) {
      log.error( 'Compiling templates on-the-fly requires "vue" to resolve to a standalone build of Vue.js.' );
      return {};
   }

   return Vue.compile( template );
}
