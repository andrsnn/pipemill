var path = require('path');
var _ = require('lodash');
var esprima = require('esprima');
var escodegen = require('escodegen');

var ARGUMENTS_REGEX = /\$\d/g;
var PATH_TO_PIPELINES = path.resolve(__dirname, 'pipelines');

module.exports.applyArguments = function (pipelines, pipeline, args) {
    var hasProvidedArgs = args && args.length;

    if (hasProvidedArgs) {
        args = _.map(args, function (arg) {
            return module.exports.resolve(arg, pipelines);
        });
    }

    pipeline = _.flattenDeep(pipeline);

    pipeline = _.map(pipeline, function (pipe) {
        pipe = typeof pipe === 'function' ? pipe.toString() : pipe;
        var pipelineArguments = pipe && pipe.match && pipe.match(ARGUMENTS_REGEX);
        var numberOfPipelineArgs = (pipelineArguments && pipelineArguments.length) || 0;

        for (var i = 0; i <= numberOfPipelineArgs; i++) {
            var argIndex = '$' + i;
            var arg = args[i] || undefined;
            pipe = pipe && pipe.replace ?
                pipe.replace(new RegExp('\\' + argIndex, 'g'), arg) :
                pipe;
        }

        return pipe;
    });

    return pipeline;
};

module.exports.resolve = function (code, pipelines) {
    var output = [];

    //TODO refactor
    //case that sub pipelines are used in a pipeline
    //must wrap sub pipeline in expression
    code = typeof code === 'function' ?
        '(' + code.toString() + ')' : code;

    if (code.indexOf('pipelines.') === -1) {
        return code;
    }

    var ast = esprima.parse(code);

    function resolveSubPipelines(pipelineStr, pipeline) {
        var out = [];
        //TODO: improve control flow
        if (pipelineStr.indexOf('pipelines.') > -1) {
            var sub = _.flattenDeep(pipeline).map(function (pipe) {
                return module.exports.resolve(pipe, pipelines);
            });
            out = sub;
        }
        else {
            out = pipeline;
        }
        return out;
    }

    function parsePipeline(nodes, key, name, args) {
        if (pipelines[name]) {
            var pipeline = require(path.resolve(PATH_TO_PIPELINES, name));
            pipelineStr = pipeline.toString();
            pipeline = resolveSubPipelines(pipelineStr, pipeline);
            var argsToApply = _.map(args, function (arg) {
                return escodegen.generate(arg);
            });

            return module.exports.applyArguments(pipelines, pipeline, argsToApply);
        }
    }

    (function walk (nodes) {
        for (var key in nodes) {
            var node = nodes[key];
            var type = node && node.type;
            if (type === 'CallExpression') {
                var callee = node.callee;
                var calleeType = callee.type;
                var name = _.get(callee, 'property.name');
                var identifierName = _.get(callee, 'object.name');
                var args = node.arguments;

                if (calleeType === 'MemberExpression' && identifierName === 'pipelines') {
                    output.push(parsePipeline(nodes, key, name, args));
                    //were done with this object, break out
                    break;
                }

            }
            else if (type === 'MemberExpression' ) {
                var name = _.get(node, 'property.name');
                var identifierName = _.get(node, 'object.name');
                if (identifierName === 'pipeline') {
                    output.push(parsePipeline(nodes, key, name));
                }
            }

            if (typeof node === 'object' &&
                nodes.hasOwnProperty(key)) {
                walk(node);
            }
        }
    })(ast.body);

    return output;
};