#!/usr/bin/env node
'use strict';

var program = require('commander');
var async = require('async');
var _ = require('lodash');
var os = require("os");
var fs = require('fs');
var path = require('path');
var PipelineParser = require('./pipeline-parser');
var vm = require('vm');
var util = require('util');
var beautify = require('js-beautify').js_beautify;

var HAS_STDIN = !Boolean(process.stdin.isTTY);
//this needs to be replaced to make use of the pipeline-parser.esprima resolve call
var DONE_CALLBACK_REGEX = /done\s*(?:\().*(?:\))/g;

var PATH_TO_CONFIG = path.resolve(__dirname, 'config.json');
var PATH_TO_PIPELINES = path.resolve(__dirname, 'pipelines');

var configExists = fs.existsSync(PATH_TO_CONFIG);

if (!configExists) {
    fs.writeFileSync(PATH_TO_CONFIG, JSON.stringify({pipelines: {}, aliases: {}}));
}

var config = JSON.parse(fs.readFileSync(PATH_TO_CONFIG));
var pipeline = [];
var pipelinesRan = {};

function runPipelinesWithOptionalFlags() {
    Object.keys(config.aliases).forEach(function (pipelineName) {
        var commandName = config.aliases[pipelineName];
        //commander names properties by the long flag value
        var hasCommandRan = program[commandName.long];
        if (!pipelinesRan[pipelineName] && hasCommandRan) {
            resolvePipelineFlags(pipelineName);
        }
    });
}

function resolvePipelineFlags(pipelineName, pipelineArguments) {
    pipelineArguments = (pipelineArguments && pipelineArguments.split(',')) || [];
    if (pipelineName) {
        var resolvedPipeline = require(path.resolve(PATH_TO_PIPELINES, pipelineName));
        var parsedPipeline = PipelineParser.applyArguments(config.pipelines, resolvedPipeline, pipelineArguments);
        pipeline.push(parsedPipeline);
        pipelinesRan[pipelineName] = true;
    }
}

function handlePipelineFlags(pipelineName, pipelineArguments) {
    // runPipelinesWithOptionalFlags();
    resolvePipelineFlags(pipelineName, pipelineArguments);
}

function buildOptions() {
    return Object.keys(config.aliases).map(function (pipelineName) {
        var commands = config.aliases[pipelineName];
        var shortCommand = commands.short;
        var longCommand = commands.long;

        var option = [(shortCommand ? '-' + shortCommand + ', ' : '') +
            '--' + longCommand + ' [value]', pipelineName + ' pipeline command.'];

        return option;
    });
}

function bindAliasListeners() {
    Object.keys(config.aliases).forEach(function (pipelineName) {
        var commands = config.aliases[pipelineName];
        var shortCommand = commands.short;
        var longCommand = commands.long;

        //bind emitter
        program.on(longCommand, handlePipelineFlags.bind(null, pipelineName));
    });
}

function handleAlias(aliasArgs) {
    var pipelineName = aliasArgs[0];
    var aliasLongName = aliasArgs[1];
    var aliasShortName = aliasArgs[2];

    var hasShortName = Boolean(aliasShortName);
    var pipelineExists = config.pipelines[pipelineName];

    if (!pipelineExists) {
        return console.error('Pipeline ' + pipelineName + ' does not exist.');
    }

    var definedAliases = _.map(Object.keys(config.aliases), function (key) {
        return config.aliases[key];
    });

    var predicate = {};

    if (hasShortName) {
        predicate.short = aliasShortName;
        predicate.long = aliasLongName;
    }
    else {
        if (!aliasLongName) {
            return console.error('Alias must be supplied.');
        }
        predicate.long = aliasLongName;
    }

    var aliasExists = _.some(definedAliases, predicate);

    //conflict with pipe short hand
    if (aliasExists || predicate.short === 'p') {
        return console.error('Alias already exists.');
    }

    config.aliases[pipelineName] = predicate;
    fs.writeFileSync(PATH_TO_CONFIG, JSON.stringify(config));
    return console.log('Alias sucessfully saved.');
}

var options = buildOptions();
bindAliasListeners();

program
    .option('-p, --pipe [value]', 'An expression to which will be evaluated in the context of the stream.', function (val) {
        //its possible a optional flag has not run that should have (is this a bug with commander?)
        runPipelinesWithOptionalFlags();
        //esprima will crash if anonymous function is not expression
        pipeline.push('(function(stdin) {' + val + '})');
    })
    .option('--save [value]', 'Save pipeline by name.')
    .option('--remove [value]', 'Remove a saved pipeline by name.')
    .option('--list [value]', 'List all saved pipelines.')
    .option('--show [value]', 'Echo out a saved pipeline by name.')
    .option('--encoding [value]', 'Stdin encoding.')
    .option('--buffer [value]', 'Read stdin into process memory until stdin end is emitted, then process pipeline.')
    .option('--debug [value]', 'Turn on debug mode.')
    .option('--alias', 'Create pipeline flag alias.', handleAlias);

options.forEach(function (option) {
    program.option.apply(program, option);
});

program.parse(process.argv);

// runPipelinesWithOptionalFlags();run

var save = program.save;
var remove = program.remove;
var list = program.list;
var show = program.show;

if (list) {
    return console.log(Object.keys(config.pipelines));
}

if (save) {
    if (!pipeline.length) {
        return console.error('No pipeline provided.');
    }

    var name = save.toString();
    config.pipelines[name] = true;
    fs.writeFileSync(PATH_TO_CONFIG, JSON.stringify(config));
    var fileName = PATH_TO_PIPELINES + '/' + name + '.js';
    var content = 'module.exports = [' + pipeline.join(',') + '];';
    content = beautify(content, { indent_size: 4 });
    fs.writeFileSync(fileName, content);
    return console.log(name + ' pipeline saved.');
}

if (remove) {
    var name = remove.toString();
    if (!config.pipelines[name]) {
        return console.error(name + ' not found.');
    }
    delete config.pipelines[name];
    fs.writeFileSync(PATH_TO_CONFIG, JSON.stringify(config));
    fs.unlinkSync(path.resolve(__dirname, name + '.pipeline'));
    return console.log(name + ' pipeline removed.');
}

if (show) {
    var name = show.toString();
    name = name.split('.')[0];
    if (!config.pipelines[name]) {
        return console.error(name + ' not found.');
    }
    var savedPipeline = require(path.resolve(PATH_TO_PIPELINES, name)).toString();
    return console.log(savedPipeline);
}

//TODO: pipeline is outputted as array which is nested too deeply / unnecessarily
pipeline = _.map(pipeline, function (pipe) {
    return PipelineParser.resolve(pipe, config.pipelines);    
});

if (program.debug) {
    console.log('PIPELINE: ' + JSON.stringify(pipeline));
}

function startPipeline(stdin, pipeline, callback) {
    var sandbox = {
        stdin: stdin, 
        _: _, 
        fs: fs, 
        path: path, 
        console: console,
        setTimeout: setTimeout,
        setInterval: setInterval,
        require: require
    };
    vm.createContext(sandbox);

    return processPipeline(sandbox, pipeline, callback);
}

function processPipeline(sandbox, pipeline, callback) {
    var i = 0;
    async.whilst(
        function() { return i < pipeline.length; },
        function(callback) {
            var pipe = pipeline[i];

            if (_.isArray(pipe)){
                return processPipeline(sandbox, pipe, function (err, stdout) {
                    if (err) {
                        return callback(err);
                    }
                    i++;
                    return callback(null, stdout);
                });
            }
            //cheap hack for async for now
            var isDoneCalled = Boolean(pipe && pipe.match && pipe.match(DONE_CALLBACK_REGEX));

            var script = 'stdout = (' +
                pipe + ')(stdin);',
                val;
            if (program.debug) {
                console.log('CURRENT PIPE: ', script);
            }

            var done = function (err, stdout) {
                if (err) {
                    return callback(err);
                }
                if (program.debug) {
                    console.log('STDOUT: ', stdout);
                }

                sandbox.stdin = stdout;
                i++;
                return callback(null, stdout);
            };

            sandbox.done = done;

            vm.runInContext(script, sandbox);

            if (!isDoneCalled) {
                done(null, sandbox.stdout);
            }
        },
        function (err, stdout) {
            return callback(err, stdout);
        }
    );
}

process.stdin.resume();
process.stdin.setEncoding(program.encoding || 'utf8');
var data = '';
process.stdin.on('data', function(stdin) {
    if (program.buffer) {
        data += stdin.toString();
    }
    else {
        startPipeline(stdin, pipeline, function (err, stdout) {
            if (err) {
                return console.error(err);
            }
            if (stdout !== undefined) {
                console.log(stdout);
            }
        });
    }
});

process.stdin.on('end', function () {
    if (program.buffer) {
        startPipeline(data, pipeline, function (err, stdout) {
            if (err) {
                return console.error(err);
            }
            if (stdout !== undefined) {
                console.log(stdout);
            }
        });
    }
});

process.on('SIGINT', function() {
    process.exit();
});

if (!HAS_STDIN) {
    startPipeline(null, pipeline, function (err, stdout) {
        if (err) {
            return console.error(err);
        }
        if (stdout !== undefined) {
            console.log(stdout);
        }
    });
}