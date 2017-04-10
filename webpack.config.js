/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/* eslint-env node */

const path = require( 'path' );
const pkg = require( './package.json' );

const webpack = require( 'laxar-infrastructure' ).webpack( {
   context: __dirname,
   module: {
      rules: [
         {
            test: /\.js$/,
            exclude: path.resolve( __dirname, 'node_modules' ),
            loader: 'babel-loader'
         }
      ]
   }
} );

module.exports = [
   webpack.library(),
   webpack.browserSpec( [ `./spec/${pkg.name}.spec.js` ] )
];
