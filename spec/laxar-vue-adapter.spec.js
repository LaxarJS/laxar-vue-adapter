/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
import { bootstrap, technology } from '../laxar-vue-adapter';
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
         services = { adapterUtilities: createAdapterUtilitiesMock() };
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
   let fakeModule;
   let provideServices;
   let environment;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   beforeEach( () => {
      fakeModule = { create: jasmine.createSpy( 'some-widget.create' ) };

      artifacts = {
         widgets: [
            { ...widgetData, module: fakeModule }
         ],
         controls: []
      };

      services = { adapterUtilities: createAdapterUtilitiesMock() };
      factory = bootstrap( artifacts, services );

      const context = {
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
            axContext: context,
            axEventBus: context.eventBus,
            axFeatures: context.features
         }
      };
   } );

   describe( 'asked to instantiate a widget adapter', () => {

      let adapter;
      beforeEach( () => {
         adapter = factory.create( environment );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'creates the widget controller', () => {
         expect( fakeModule.create ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'calls provideServices', () => {
         expect( provideServices ).toHaveBeenCalled();
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'returns an adapter API', () => {
         expect( adapter ).toEqual( {
            domAttachTo: jasmine.any( Function ),
            domDetach: jasmine.any( Function )
         } );
      } );

   } );

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   describe( 'asked to instantiate a widget controller with injections', () => {

      beforeEach( () => {
         fakeModule.injections = [ 'axContext', 'axFeatures' ];
         factory.create( environment );
      } );

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      it( 'creates that controller with injections', () => {
         expect( fakeModule.create ).toHaveBeenCalledWith(
            { eventBus: jasmine.any( Object ), features: jasmine.any( Object ) },
            { myFeature: {} }
         );
      } );

   } );

} );

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function createAdapterUtilitiesMock() {
   const utilities = {};
   [ 'unknownWidget', 'unknownInjection', 'activityAccessingDom' ].forEach( method => {
      utilities[ method ] = jasmine.createSpy( method ).and.returnValue( new Error() );
   } );
   return utilities;
}
