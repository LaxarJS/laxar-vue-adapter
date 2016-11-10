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

const WIDGET_PROPERTY = '_widget';

export const technology = 'vue';

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function bootstrap( {}, adapterServices ) {

   const widgetServices = {};
   const { widgetLoader, artifactProvider, log } = adapterServices;
   const { adapterErrors } = widgetLoader;

   const widgetInjectionsMixin = injectionsMixin( widgetServiceFactory );
   const controlInjectionsMixin = injectionsMixin( controlServiceFactory );

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
      const widget = services.axContext.widget;
      const mixins = [
         { beforeCreate() { this[ WIDGET_PROPERTY ] = widget; } },
         widgetInjectionsMixin,
         { beforeCreate() { onBeforeControllerCreation( /* this.$options.injections */ services ); } }
      ];

      widgetServices[ widget.id ] = services;

      return provideComponent( provider, mixins, components.widgets )
         .then( Component => {

            const vm = new Component( { data: services.axContext } );

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

   function provideComponent( provider, mixins = [], cache = {} ) {
      return provider.descriptor()
         .then( ( { name, controls = [] } ) => {
            if( !cache[ name ] ) {
               cache[ name ] = Promise.all( [
                  provider.module(),
                  provideComponents( controls.map( artifactProvider.forControl ), [ controlInjectionsMixin ], components.controls )
               ] ).then( ( [ module, controls ] ) => Vue.extend( {
                  // modules loaded with the vue-loader have a _Ctor property which causes them to be non-
                  // extensible with Vue.extend. Override to make the module extensible.
                  ...module,
                  _Ctor: null
               } ).extend( {
                  name,
                  mixins,
                  components: {
                     ...controls
                  }
               } ) );
            }

            return cache[ name ];
         } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function provideComponents( providers, mixins = [], cache = {} ) {
      return Promise.all( providers.map( provider => provideComponent( provider, mixins, cache ) ) )
         .then( components => components.reduce( ( components, component ) => {
            const { name } = component.options;
            components[ name ] = component;
            return components;
         }, {} ) );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function widgetServiceFactory( injection ) {
      const {
         id: widgetId,
         name: widgetName
      } = this[ WIDGET_PROPERTY ];
      const services = widgetServices[ widgetId ];

      if( !services ) {
         throw new Error( 'Failed to lookup services for widget ' + widgetId );
      }
      if( !services[ injection ] ) {
         throw adapterErrors.unknownInjection( { technology, injection, widgetName } );
      }
      return services[ injection ];
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function controlServiceFactory( injection ) {
      const services = {
         axConfiguration: adapterServices.configuration,
         axGlobalEventBus: adapterServices.globalEventBus,
         axGlobalLog: adapterServices.log,
         axGlobalStorage: adapterServices.storage,
         axHeartbeat: adapterServices.heartbeat,
         axTooling: adapterServices.toolingProviders
      };

      if( services[ injection ] ) {
         return services[ injection ];
      }
      if( injection === 'axWidgetServices' ) {
         let vm = this;
         while( vm && !vm[ WIDGET_PROPERTY ] ) {
            vm = vm.$parent;
         }
         if( vm ) {
            const {
               id: widgetId,
               name: widgetName
            } = vm[ WIDGET_PROPERTY ];
            return widgetServices[ widgetId ];
         }
         throw new Error( 'Failed to lookup widget services' );
      }
      throw adapterErrors.unknownInjection( { technology, injection, widgetName: 'unknown' } );
   }

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function injectionsMixin( serviceFactory ) {
   return {
      beforeCreate() {
         const injections = this.$options.injections || [];

         this.$injections = [];
         this.$options.injections = {};

         injections.forEach( injection => {
            const service = serviceFactory.call( this, injection );
            this.$injections.push( service );
            this.$options.injections[ injection ] = service;
         } );
      }
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function compileTemplate( template, log ) {
   if( typeof template === 'object' && typeof template.render === 'function' ) {
      return template; // already compiled, return unmodified
   }
   if( !Vue.compile ) {
      throw new Error( 'Compiling templates on-the-fly requires "vue" to resolve to a standalone build of Vue.js.' );
   }

   return Vue.compile( template );
}
