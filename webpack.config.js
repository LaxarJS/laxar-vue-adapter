/**
 * Copyright 2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
/* eslint-env node */

const path = require( 'path' );
const webpack = require( 'webpack' );

const nodeEnv = process.env.NODE_ENV;
const isProduction = nodeEnv === 'production';
const isBrowserSpec = nodeEnv === 'browser-spec';

const name = require( './package.json' ).name;
const externals = {
   'laxar': 'laxar',
   'vue': 'vue'
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

const baseConfig = {
   module: {
      rules: [
         {
            test: /\.js$/,
            exclude: /(node_modules)/,
            loader: 'babel-loader'
         }
      ]
   }
};

const config = isProduction ? distConfig() : baseConfig;

if( isBrowserSpec ) {
   const WebpackJasmineHtmlRunnerPlugin = require( 'webpack-jasmine-html-runner-plugin' );
   config.entry = WebpackJasmineHtmlRunnerPlugin.entry( './spec/spec-runner.js' );
   config.plugins = [ new WebpackJasmineHtmlRunnerPlugin() ];
   config.output = {
      path: path.resolve( path.join( process.cwd(), 'spec-output' ) ),
      publicPath: '/spec-output/',
      filename: '[name].bundle.js'
   };
}

module.exports = config;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function distConfig() {

   return [
      distConfigItem( `./${name}.js`, `./${name}.js` ),
      distConfigItem( `./${name}.js`, `./${name}.min.js`, { minify: true } )
   ];

   function distConfigItem( entry, output, optionalOptions ) {
      const options = Object.assign( {
         minify: false,
         externals
      }, optionalOptions || {} );

      const config = Object.assign( {}, baseConfig );

      config.entry = entry;

      config.output = {
         path: path.resolve( __dirname ),
         filename: `dist/${output}`,
         library: name,
         libraryTarget: 'umd',
         umdNamedDefine: true
      };

      config.externals = options.externals;

      config.plugins = [
         new webpack.SourceMapDevToolPlugin( {
            filename: `dist/${output}.map`
         } )
      ];

      if( options.minify ) {
         config.plugins.push(
            new webpack.optimize.UglifyJsPlugin( {
               compress: { warnings: false },
               sourceMap: true
            } )
         );
      }

      return config;
   }

}
