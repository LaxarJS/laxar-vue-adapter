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
         .then( mixinInjections )
         .then( Component => {
            const injections = provideInjections( Component.options.injections, services );

            onBeforeControllerCreation( injections );

            const vm = new Component( { injections } );

            return {
               domAttachTo( areaElement, templateHtml ) {
                  if( templateHtml ) {
                     const res = compileTemplate( templateHtml, log );

                     vm.$options.render = res.render;
                     vm.$options.staticRenderFns = res.staticRenderFns;

                     // attach beforeCreate, beforeDestroy hooks to enable hot reload
                     if( res.beforeCreate ) {
                        vm.$options.beforeCreate.push.apply( vm.$options.beforeCreate, res.beforeCreate );

                        // call beforeCreate hook manually because the component is already created
                        res.beforeCreate.forEach( fn => fn.apply( vm ) );
                     }
                     if( res.beforeDestroy ) {
                        vm.$options.beforeDestroy.push.apply( vm.$options.beforeDestroy, res.beforeDestroy );
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
                  ...module,
                  _Ctor: null,
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
      return Promise.all( providers.map( provider => Promise.all( [
         provider.descriptor(),
         provideComponent( provider, cache )
      ] ) ) ).then( controls => controls.reduce( ( components, [ { name }, component ] ) => {
         components[ name ] = component;
         return components;
      }, {} ) );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function provideInjections( injections, services ) {
      return injections.reduce( ( injections, injection ) => {
         if( !services[ injection ] ) {
            throw adapterErrors.unknownInjection( { technology, injection, widgetName } );
         }
         injections[ injection ] = services[ injection ];
         return injections;
      }, {
         axContext: services.axContext
      } );
   }
}

function mixinInjections( Component ) {
   const injections = Component.options.injections || [];

   return Component.extend( {
      beforeCreate() {
         this.$injections = injections
            .map( name => this.$options.injections[ name ] );
      },
      data() {
         return this.$options.injections.axContext;
      },
      injections: injections
   } );
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
