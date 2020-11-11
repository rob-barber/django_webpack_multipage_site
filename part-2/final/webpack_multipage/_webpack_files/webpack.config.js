'use strict';

// _webpack_files/webpack.config.js


const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const path = require('path');
const fs = require('fs');
const webpackUtils = require('./supporting/webpack_utils');


// Since this file resides in a sub-directory we need to go up one level for the correct root reference
let projectRootPath = path.join(__dirname, './../');

// Both directories should live within the project root.'
let webAssetsDir = path.resolve(projectRootPath, 'web_assets');  // Directory where web assets that need building live.
let webAssetsDistDir = path.resolve(projectRootPath, 'web_dist'); // Directory where built web assets are outputted to.

module.exports = (env, argv) => {

    let isProduction = false;
    if (env && env.production) {
        isProduction = true;
    }

    return {

        mode: 'development',
        devtool: 'source-map',

        /*
        * Transpile each js file in-place for the 'screens' directory so they can be imported with the same directory
        * structure and with the same name
        * */
        entry: {
            // Create entry points for any file that starts with an underscore.
            // Check "plugins" section of this config for context where the following filenames are actually used.
            // .entry = This entry will be manually included in a specific HTML file. Don't add to generated js file.
            // .entry-load = This entry should be loaded automatically. Include in the generated js file.
            ...webpackUtils.getJSEntries(`${webAssetsDir}/js/**/*+(.entry|.entry-load).js`, projectRootPath),
            ...webpackUtils.getStyleEntries(`${webAssetsDir}/styles/**/index.scss`, projectRootPath)
        },

        /*
         * The output should reflect the same hierarchy and file structure as the 'entry' files. The only difference is that
         * the outputted files will be placed in the given directory (i.e. assets_dist directory)
         * */
        output: {
            path: webAssetsDistDir,
            filename: '[name].js',
        },

        resolve: {
            // What extensions webpack should understand (allows import statements to leave out the extension)
            extensions: [".js"],

            /*
            Sort of like Django's STATICFILES_DIRS. Allows import statements to use these aliases as the start of the
            import path rather than having to use relative or absolute file paths.
            */
            alias: {
                'js': path.resolve(webAssetsDir, 'js'),
                'model_layer': path.resolve(webAssetsDir, 'js/model_layer')
            }

        },

        module: {
            rules: [
                { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" },
                {
                    test: /\.js$/,
                    use: ["source-map-loader"],
                    enforce: "pre"
                },
                {
                    test: /\.scss$/,
                    use: [
                        { loader: MiniCssExtractPlugin.loader },
                        { loader: "css-loader" },
                        {
                            // Check https://webpack.js.org/loaders/postcss-loader/#plugins for more details
                            loader: "postcss-loader",
                            options: {
                                ident: 'postcss',
                                plugins: (loader) => [
                                    require('postcss-preset-env')()
                                ]
                            }
                        },
                        { loader: "sass-loader" } // compiles Sass to CSS
                    ]
                }
            ],
        },

        optimization: {
            runtimeChunk: {
                // The runtime should be stored within the js directory. We MUST use only 1 shared runtime or else our
                // code will not execute correctly.
                name: 'js/runtime'
            },
            splitChunks: {
                name: (module, chunks, cacheGroupKey)=>{
                    // Manually generate chunk file names in order to place them in the correct directory
                    const names = chunks.map(c => c.name);
                    names.sort();

                    const joinedName = names.join("~"); // Join the names like how the SplitChunksPlugin does it.
                    const hashedFilename = webpackUtils.hashFilename(joinedName);

                    return `js/common/${hashedFilename}`
                },
                chunks: "all",
                maxInitialRequests: Infinity,
                minSize: 0,
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name(module) {
                            // get the name. E.g. node_modules/packageName/not/this/part.js
                            // or node_modules/packageName
                            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];

                            // npm package names are URL-safe, but some servers don't like @ symbols
                            return `js/common/npm.${packageName.replace('@', '')}`;
                        },
                    },
                },
            }
        },

        plugins: [
            new CleanWebpackPlugin(),
            new MiniCssExtractPlugin({
                // Options similar to the same options in webpackOptions.output
                // all options are optional
                filename: '[name].css',
                allChunks: true
            }),

            // Build the JS into it's own HTML file (js_bundle.html) that Django can include in templates.
            new HtmlWebpackPlugin({
                inject: false,
                templateContent: ({htmlWebpackPlugin})=>{
                    return webpackUtils.tagsToTemplate(htmlWebpackPlugin.tags.bodyTags);
                },
                filename: 'js_bundle.html'
            }),
            {
                // Ad-hoc custom plugin to move HtmlWebpackPlugin built files to the Django templates/generated directory.
                apply(compiler) {
                    compiler.hooks.afterEmit.tap('MoveResourcesPlugin', (compilation)=>{
                        let movePath = isProduction
                            ? `${projectRootPath}/templates/_auto_generated/production/js_bundle.html`
                            : `${projectRootPath}/templates/_auto_generated/development/js_bundle.html`;

                        fs.rename(
                            `${webAssetsDistDir}/js_bundle.html`,
                            movePath,
                            webpackUtils.moveResourcePluginErrorCallback);
                    });
                }
            }
        ]

    };
}