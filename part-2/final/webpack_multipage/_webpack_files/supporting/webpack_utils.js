'use strict';

// _webpack_files/supporting/webpack_utils.js

const crypto = require('crypto');
const glob = require('glob');

// The directory name where the web assets that need to be compiled live
let assetsDirname = 'web_assets';

/**
 * Converts a tags array into a list of url paths to use within an HTML element.
 *
 * This will also clean any unnecessary urls. The cleaning is based upon the extension meta-data.
 *
 * As of 05/18/2020 the meta-data extensions mean the following:
 * .entry = This entry will be manually included in a specific HTML file. Don't add to generated js file.
 * .entry-load = This entry should be loaded automatically. Include in the generated js file.
 *
 * Ex Naming: MyJsFile.entry.js, MySharedJsFile.entry-load.js
 *
 * Use in conjunction with the "tagsToTemplate" method.
 *
 * @param {[object]} tags: The tags within the "htmlWebpackPlugin.tags" array.
 * */
function convertAndCleanTagsArray(tags) {
    let urlList = [];

    for (const property in tags) {
        let tag = tags[property];
        let type = tag.tagName;

        let url = '';
        if (type === 'script') {
            url = tag.attributes.src;
        } else if (type === 'link') {
            url = tag.attributes.href;
        }

        // Now, validate whether or not this url should go into the array using the extension meta data for the
        // criteria.

        // A match includes a ".entry." character set and does not include a "~" anywhere in the string.
        // A "~" means it is a shared chunk file and should be included in the generated JS file.
        let isEntryRegex = new RegExp('([\.]entry[\.])');
        let isChunkRegex = new RegExp('~');

        let isEntry = isEntryRegex.test(url);
        let isChunk = isChunkRegex.test(url);

        if (isEntry && !isChunk) {
            continue;
        }

        urlList.push(url);
    }

    return urlList;
}


/**
 * Used with the HtmlWebpackPlugin to convert the list of given tags to a fully qualified html template to use with this
 * project.
 *
 * Essentially, this will take what Webpack builds and generate an HTML file that Django can import in templates. This
 * is useful because Webpack will build a variable amount of JS/CSS files based upon the frontend code of the project.
 *
 * See https://github.com/jantimon/html-webpack-plugin#writing-your-own-templates for more information on what this
 * function does and how it does it.
 *
 * @params {[object]}: The tags within the "htmlWebpackPlugin.tags".
 *                     You need to specify which array, i.e. htmlWebpackPlugin.tags.headTags or htmlWebpackPlugin.tags.bodyTags
 *                     as the parameter.
 * @param {string} type: Either "link", or "script". Defines the type of HTML elements the tags array represents.
 *                       Defaults to "script".
 * */
function tagsToTemplate(tags, type='script') {
    // Template needs to load static files from Django to access the build files.
    let template = `{% load static %}`;

    let urlList = convertAndCleanTagsArray(tags);

    for (const index in urlList) {
        let htmlTag = '';
        let url = urlList[index];

        // Configure the htmlTag with Django Template system calls. Django will use this with it's own template system.
        if (type === 'link') {
            htmlTag = `<link href="{% static '${url}' %}" rel="stylesheet" type="text/css">`
        } else if (type === 'script') {
            htmlTag = `<script src="{% static '${url}' %}"></script>`;
        }

        template = template + htmlTag;
    }

    return template
}

function moveResourcePluginErrorCallback(err) {
    if (err) throw err;
    console.log('Renamed/moved build file for use with Django.');
}

/**
 * Fetches all Javascript files that need transpiling and marks them as the entry point
 * */
function getJSEntries(pattern, projectRootPath) {
    const entries = {};

    glob.sync(pattern).forEach((file) => {
        let assetsFolder = projectRootPath + `${assetsDirname}/`;
        let key = file.replace(assetsFolder, '');

        // Remove the .js extension. This will be automatically added by Webpack during the build process.
        //
        key = key.replace('.js', '');

        entries[key] = file;
    });

    return entries;
}

/**
 * Fetches all Sass index files that need transpiling and marks them as the entry point
 * */
function getStyleEntries(pattern, projectRootPath) {
    const entries = {};

    glob.sync(pattern).forEach((file) => {
        let assetsFolder = projectRootPath + `${assetsDirname}/`;
        let key = file.replace(assetsFolder, '');

        // Remove the .scss extension. This will be automatically added by Webpack during the build process.
        //
        key = key.replace('.scss', '');

        entries[key] = file;
    });

    return entries;
}

/**
 * Hashes a filename for webpack. Necessary to mock the default chunk name that
 *
 * Copy of the Webpack > SplitChunksPlugin > hashFileName. The source can be found within the "SplitChunksPlugin.js"
 * within "node_modules/webpack/lib/optimize"
 * */
const hashFilename = name => {
	return crypto
		.createHash("md4")
		.update(name)
		.digest("hex")
		.slice(0, 8);
};

module.exports = {
    hashFilename: hashFilename,
    _convertAndCleanTagsArray: convertAndCleanTagsArray, // Only exposed for testing
    tagsToTemplate: tagsToTemplate,
    moveResourcePluginErrorCallback: moveResourcePluginErrorCallback,
    getJSEntries: getJSEntries,
    getStyleEntries: getStyleEntries
}