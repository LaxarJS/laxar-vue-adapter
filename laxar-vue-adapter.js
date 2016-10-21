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

const noOp = () => {};

export const technology = 'vue';

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function bootstrap( { widgets }, { widgetLoader } ) {

   const { adapterErrors } = widgetLoader;
   const widgetModules = {};
   const activitySet = {};
   widgets.forEach( ({ descriptor, module }) => {
      widgetModules[ descriptor.name ] = module;
      if( descriptor.integration.type === 'activity' ) {
         activitySet[ descriptor.name ] = true;
      }
   } );

   return {
      create,
      technology
   };

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function create( { widgetName, anchorElement, services, onBeforeControllerCreation } ) {

      let vm;

      if( !widgetModules[ widgetName ] ) {
         throw adapterErrors.unknownWidget( { technology, widgetName } );
      }

      return {
         domAttachTo,
         domDetach,
         destroy
      };

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function createVueModel( template ) {
         const options = widgetModules[ widgetName ];

         const injectionsByName = {};
         const injections = ( module.injections || [] ).map( injection => {
            const value = services[ injection ];
            if( value === undefined ) {
               throw adapterErrors.unknownInjection( { technology, injection, widgetName } );
            }
            injectionsByName[ injection ] = value;
            return value;
         } );

         onBeforeControllerCreation( injectionsByName );

         return new Vue( {
            template,
            ...options,
            data() {
               const context = services.axContext;
               const data = typeof options.data === 'function' ? options.data( injections ) : options.data;
               return {
                  ...context,
                  ...data
               }
            }
         } );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function domAttachTo( areaElement, templateHtml ) {
         vm = createVueModel( templateHtml );
         vm.$mount();
         areaElement.appendChild( vm.$el );
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function domDetach() {
         const parent = vm.$el.parentNode;
         if( parent ) {
            parent.removeChild( anchorElement );
         }
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function destroy() {
         vm.$destroy();
      }

   }

}

