'use strict';

var path = require('path');

var PATH_TO_CONFIG = path.resolve((process.env.HOME || process.env.USERPROFILE), '.pipemillrc');
var PATH_TO_DEFAULT_CONFIG = path.resolve(__dirname, 'config.json');
var PATH_TO_PIPELINES = path.resolve((process.env.HOME || process.env.USERPROFILE), 'pipemill-pipelines');
var PATH_TO_DEFAULT_PIPELINES = path.resolve(__dirname, 'pipelines');
var DONE_CALLBACK_REGEX = /done\s*(?:\().*(?:\))/g;
var HAS_STDIN = !Boolean(process.stdin.isTTY);
var ARGUMENTS_REGEX = /\$\d/g;

module.exports = {
	PATH_TO_CONFIG: PATH_TO_CONFIG,
	PATH_TO_DEFAULT_CONFIG: PATH_TO_DEFAULT_CONFIG,
	PATH_TO_PIPELINES: PATH_TO_PIPELINES,
	PATH_TO_DEFAULT_PIPELINES: PATH_TO_DEFAULT_PIPELINES,
	DONE_CALLBACK_REGEX: DONE_CALLBACK_REGEX,
	HAS_STDIN: HAS_STDIN,
	ARGUMENTS_REGEX: ARGUMENTS_REGEX
};