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

export function bootstrap( {}, { widgetLoader, artifactProvider } ) {

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
      let vm = null;

      return provideComponent( provider, components.widgets )
         .then( mixinInjections )
         .then( Component => {
            const injections = Component.options.injections
               .map( name => ( { [ name ]: services[ name ] } ) )
               .reduce( ( a, b ) => ( { ...a, ...b } ) );

            onBeforeControllerCreation( injections );

            vm = new Component( { injections } );

            return {
               domAttachTo,
               domDetach,
               destroy
            };
         } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function domAttachTo( areaElement, templateHtml ) {
         if( templateHtml ) {
            compileTemplate( services, templateHtml, vm );
         }
         vm.$mount( anchorElement, true );
         areaElement.appendChild( anchorElement );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function domDetach() {
         const parent = anchorElement.parentNode;
         if( parent ) {
            parent.removeChild( anchorElement );
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function destroy() {
         vm.$destroy();
      }
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function provideComponent( artifactProviderForComponent, cache = {} ) {
      return artifactProviderForComponent.descriptor()
         .then( ( { name, controls = [] } ) => {
            if( cache[ name ] ) {
               return cache[ name ];
            }

            return ( cache[ name ] = Promise.all( [
               artifactProviderForComponent.module(),
               provideComponents( controls.map( artifactProvider.forControl ), components.controls )
            ] ).then( ( [ module, controls ] ) => Vue.extend( {
               ...module,
               _Ctor: null,
               components: {
                  ...controls,
                  ...module.components
               }
            } ) ) );
         } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function provideComponents( artifactProvidersForComponents, cache = {} ) {
      return Promise.all( artifactProvidersForComponents.map( artifactProviderForComponent => {
         return Promise.all( [
            artifactProviderForComponent.descriptor(),
            provideComponent( artifactProviderForComponent, cache )
         ] ).then( ( [ { name }, component ] ) => ( { [ name ]: component } ) );
      } ) ).then( controls => controls.reduce( ( a, b ) => ( { ...a, ...b } ), {} ) );
   }

}

function mixinInjections( Component ) {
   const injections = Component.options.injections || [];

   return Component.extend( {
      created() {
         this.$injections = injections
            .map( name => this.$options.injections[ name ] );
      },
      data() {
         return this.$options.injections.axContext;
      },
      injections: [ 'axContext' ].concat( injections )
   } );
}

function compileTemplate( services, template, vm ) {
   if( /\bdata-v-/.test( template ) ) {
      services.axLog.warn( 'Widget template seems to contain data-v- prefix not supported by Vue.js.' );
   }
   if( !Vue.compile ) {
      services.axLog.error( 'Compiling templates on-the-fly requires "vue" to resolve to a standalone build of Vue.js.' );
      return;
   }

   const res = Vue.compile( template );
   vm.$options.render = res.render;
   vm.$options.staticRenderFns = res.staticRenderFns;
}
