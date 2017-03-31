/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import { bootstrap, technology, injections } from '../laxar-vue-adapter';
import * as widgetData from './widget_data';

describe( 'A vue widget adapter module', () => {

   it( 'advertises "vue" as its technology', () => {
      expect( technology ).toEqual( 'vue' );
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   it( 'provides a `bootstrap` method', () => {
      expect( bootstrap ).toEqual( jasmine.any( Function ) );
   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'when bootstrapped with services and modules', () => {

      let artifacts;
      let services;
      let factory;

      beforeEach( () => {
         artifacts = { widgets: [ widgetData ], controls: [] };
         services = createAdapterServicesMock( artifacts );
         factory = bootstrap( artifacts, services );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'produces a factory-object with a create-method', () => {
         expect( factory.create ).toEqual( jasmine.any( Function ) );
      } );

   } );

} );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe( 'a vue widget adapter factory', () => {

   let artifacts;
   let services;
   let factory;

   let anchorElement;
   let module;
   let provideServices;
   let environment;

   let receivedInjections;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   beforeEach( () => {
      module = {
         ...widgetData.module,
         created: jasmine.createSpy( 'some-widget.created' ).and.callFake( function() {
            receivedInjections = this.$injections;
         } )
      };

      artifacts = {
         widgets: [
            {
               descriptor: widgetData.descriptor,
               module
            }
         ],
         controls: []
      };

      services = createAdapterServicesMock( artifacts );
      factory = bootstrap( artifacts, services );

      const context = {
         widget: {
            id: widgetData.configuration.id,
            name: widgetData.configuration.name
         },
         eventBus: { fake: 'I am a mock event bus!' },
         features: widgetData.configuration.features
      };
      anchorElement = document.createElement( 'div' );
      provideServices = jasmine.createSpy( 'provideServices' );

      environment = {
         widgetName: widgetData.descriptor.name,
         anchorElement,
         provideServices,
         services: {
            axLog: { warn() {}, info() {} },
            axContext: context,
            axEventBus: context.eventBus,
            axFeatures: context.features
         }
      };
   } );

   describe( 'asked to instantiate a widget adapter', () => {

      let adapter;
      beforeEach( done => {
         factory.create( environment )
            .then( result => { adapter = result; } )
            .then( done );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'creates the widget component', () => {
         expect( module.created ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'calls provideServices', () => {
         expect( provideServices ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'returns an adapter API', () => {
         expect( adapter.domAttachTo ).toEqual( jasmine.any( Function ) );
         expect( adapter.domDetach ).toEqual( jasmine.any( Function ) );
         expect( adapter.destroy ).toEqual( jasmine.any( Function ) );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'asked to instantiate a widget controller with injections', () => {

      beforeEach( done => {
         module.mixins = [ injections( 'axLog', 'axFeatures' ) ];
         factory.create( environment )
            .then( done );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'creates that controller with injections', () => {
         expect( receivedInjections[ 0 ].warn ).toEqual( jasmine.any( Function ) );
         expect( receivedInjections[ 0 ].info ).toEqual( jasmine.any( Function ) );
         expect( receivedInjections[ 1 ] )
            .toEqual( { myFeature: jasmine.any( Object ) } );
      } );

   } );

} );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function createAdapterServicesMock( artifacts ) {
   const widgetData = artifacts.widgets[ 0 ];
   return {
      artifactProvider: {
         forWidget() {
            return {
               descriptor: () => Promise.resolve( widgetData.descriptor ),
               module: () => Promise.resolve( widgetData.module )
            };
         },
         forControl() {
            // no controls in the test yet
            expect( true ).toBe( false );
         }
      },
      adapterUtilities: createAdapterUtilitiesMock()
   };
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function createAdapterUtilitiesMock() {
   const utilities = {};
   [ 'unknownWidget', 'unknownInjection', 'activityAccessingDom' ].forEach( method => {
      utilities[ method ] = jasmine.createSpy( method ).and.returnValue( new Error() );
   } );
   return utilities;
}
