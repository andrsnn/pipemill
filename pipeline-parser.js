var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var esprima = require('esprima');
var escodegen = require('escodegen');

module.exports.resolve = function (code, pipelines) {
    var output = [];

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
            var pipeline = require(path.resolve(__dirname, name + '.pipeline'));
            pipelineStr = JSON.stringify(pipeline);
            pipeline = resolveSubPipelines(pipelineStr, pipeline);

            return applyArguments(pipeline, args);
        }
    }

    function applyArguments(pipeline, args) {
        _.each(args, function (arg, i) {
            var code = escodegen.generate(arg);
            var argIndex = '$' + i + '';
            code = module.exports.resolve(code, pipelines);
            pipeline = _.flattenDeep(pipeline).map(function (pipe) {
                return pipe && pipe.replace ?
                    pipe.replace(argIndex, code) :
                    pipe;
            });
        });
        return pipeline;
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