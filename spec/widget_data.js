/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
export const descriptor = {
   name: 'some-widget',
   integration: {
      type: 'widget',
      technology: 'vue'
   },
   features: {
      $schema: 'http://json-schema.org/draft-04/schema#',
      type: 'object',
      properties: {
         myFeature: {
            type: 'object',
            properties: {
               myProp: {
                  type: 'string',
                  'default': 'x'
               }
            }
         }
      }
   }
};

export const module = {
   data: () => ({ test: 'ok' }),
   created() {}
};

export const configuration = {
   area: 'contentArea',
   widget: 'some-widget',
   id: 'myWidget',
   features: {
      myFeature: {}
   }
};
