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

const WIDGET_PROPERTY = '_axWidget';
const INJECTIONS_PROPERTY = '_axWidgetInjections';

/**
 * Produces a Vue.js mixin that allows widgets to declare and access their injections.
 *
 * @param {...String} injections
 *    a list of injection names. The respective services will be available in the same
 *    order to the instance as `this.$injections`.
 *
 * @return {Object}
 *    a Vue.js mixin that allowws the adapter to register the specified injections
 */
export function injections( ...injections ) {
   return {
      beforeCreate() {
         this[ INJECTIONS_PROPERTY ] = injections;
      }
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////


export const technology = 'vue';

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function bootstrap( _, adapterServices ) {

   const widgetServices = {};
   const { adapterUtilities, artifactProvider } = adapterServices;

   const controlInjectionsMixin = injectionsMixin( controlServiceFactory );
   const widgetInjectionsMixin = injectionsMixin( widgetServiceFactory );

   const components = {
      widgets: {},
      controls: {}
   };

   const AxWidgetArea = {
      props: {
         name: {
            type: String,
            required: true
         }
      },
      render( createElement ) {
         return createElement( 'div', { attrs: { 'data-ax-widget-area': this.name } } );
      },
      mounted() {
         const { axAreaHelper } = findWidgetServices( this );
         axAreaHelper.register( this.name, this.$el );
      }
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      create
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function create( { widgetName, anchorElement, services, provideServices } ) {

      const provider = artifactProvider.forWidget( widgetName );
      const widget = { id: services.axContext.widget.id, name: widgetName };
      const mixins = [
         {
            beforeCreate() {
               this[ WIDGET_PROPERTY ] = widget;
            }
         },
         widgetInjectionsMixin,
         {
            beforeCreate() {
               services.vueComponent = this;
               provideServices( services );
            }
         }
      ];
      widgetServices[ widget.id ] = services;

      return provideComponent( provider, [], components.widgets )
         .then( Component => {

            const vm = new Component( { data: services.axContext, mixins } );

            return {
               domAttachTo( areaElement, templateHtml ) {
                  if( templateHtml ) {
                     const res = compileTemplate( templateHtml );
                     attachRenderFunctions( vm, res );
                  }
                  vm.$mount();
                  anchorElement.appendChild( vm.$el );
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
                  provideComponents(
                     controls.map( artifactProvider.forControl ),
                     [ controlInjectionsMixin ],
                     components.controls
                  )
               ] ).then( ( [ module, controls ] ) => Vue.extend( {
                  // modules loaded with the vue-loader have a _Ctor property which causes them to be non-
                  // extensible with Vue.extend. Override to make sure the component is extensible.
                  ...(
                     module && module.__esModule && module.default !== undefined ?
                     module.default :
                     module
                  ),
                  _Ctor: null
               } ).extend( {
                  name,
                  mixins,
                  components: {
                     'ax-widget-area': AxWidgetArea,
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
         throw new Error( `Failed to lookup services for ${widgetName} '${widgetId}'` );
      }
      if( !services[ injection ] ) {
         throw adapterUtilities.unknownInjection( { technology, injection, widgetName } );
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
         return findWidgetServices( this );
      }
      throw adapterUtilities.unknownInjection( { technology, injection, widgetName: 'unknown' } );
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function findWidgetServices( vm ) {
      let node = vm;
      while( node && !node[ WIDGET_PROPERTY ] ) {
         node = node.$parent;
      }
      if( node ) {
         const widgetId = node[ WIDGET_PROPERTY ].id;
         return widgetServices[ widgetId ];
      }
      throw new Error( 'Failed to lookup widget services' );
   }

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function injectionsMixin( serviceFactory ) {
   return {
      // run right before component creation to make sure that `injections` are available
      beforeCreate() {
         const injections = this[ INJECTIONS_PROPERTY ];
         if( injections ) {
            this.$injections = injections.map( name => serviceFactory.call( this, name ) );
         }
      }
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function compileTemplate( template ) {
   if( typeof template === 'object' && typeof template.render === 'function' ) {
      return template; // already compiled, return unmodified
   }
   if( !Vue.compile ) {
      throw new Error(
         'Compiling templates on-the-fly requires "vue" to resolve to a standalone build of Vue.js.'
      );
   }
   return Vue.compile( template );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function attachRenderFunctions( vm, fns ) {
   vm.$options.render = fns.render;
   vm.$options.staticRenderFns = fns.staticRenderFns;

   // attach beforeCreate, beforeDestroy hooks to enable hot reload
   if( fns.beforeCreate && fns.beforeDestroy ) {
      vm.$options.beforeCreate = vm.$options.beforeCreate || [];
      vm.$options.beforeDestroy = vm.$options.beforeDestroy || [];

      vm.$options.beforeCreate.push( ...fns.beforeCreate );
      vm.$options.beforeDestroy.push( ...fns.beforeDestroy );

      // call beforeCreate hook manually because the component is already created
      fns.beforeCreate.forEach( fn => fn.apply( vm ) );
   }
}
