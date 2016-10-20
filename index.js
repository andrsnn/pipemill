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
var format = util.format;
var beautify = require('js-beautify').js_beautify;
var Constants = require('./Constants');

var PATH_TO_CONFIG = Constants.PATH_TO_CONFIG;
var PATH_TO_DEFAULT_CONFIG = Constants.PATH_TO_DEFAULT_CONFIG;
var PATH_TO_PIPELINES = Constants.PATH_TO_PIPELINES;
var PATH_TO_DEFAULT_PIPELINES = Constants.PATH_TO_DEFAULT_PIPELINES;
var HAS_STDIN = Constants.HAS_STDIN;
var DONE_CALLBACK_REGEX = Constants.DONE_CALLBACK_REGEX;

var configExists = fs.existsSync(PATH_TO_CONFIG);
var pipelinesFolderExists = fs.existsSync(PATH_TO_PIPELINES);

var defaultConfig = JSON.parse(fs.readFileSync(PATH_TO_DEFAULT_CONFIG).toString());

if (!configExists) {
    fs.writeFileSync(PATH_TO_CONFIG, JSON.stringify(defaultConfig, null, 4));
}
if (!pipelinesFolderExists) {
    fs.mkdirSync(PATH_TO_PIPELINES);
}

if (!configExists && !pipelinesFolderExists) {
    //case we create default config is if pipelines folder does not exist
    //and there was no config
    _.each(defaultConfig.pipelines, function (value, key) {
        key += '.js';
        var pipelineExists = fs.existsSync(path.resolve(PATH_TO_PIPELINES, key));

        if (!pipelineExists) {
            var pipelineFileData = fs.readFileSync(path.resolve(PATH_TO_DEFAULT_PIPELINES, key)).toString();
            fs.writeFileSync(path.resolve(PATH_TO_PIPELINES, key), pipelineFileData);
        }
    });
}

var config = JSON.parse(fs.readFileSync(PATH_TO_CONFIG).toString(), null, 4);

var pipeline = [];
var pipelinesRan = {};
var isRunningCommand = false;

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
        pipeline = pipeline.concat(parsedPipeline);
        pipelinesRan[pipelineName] = true;
    }
}

function handlePipelineFlags(pipelineName, pipelineArguments) {
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

var options = buildOptions();
bindAliasListeners();

function onListCommand() {
    return writeToStdout(Object.keys(config.pipelines));
}

function onRemoveCommand(name) {
    if (!config.pipelines[name]) {
        return writeToStderr(name + ' not found.');
    }
    delete config.pipelines[name];
    fs.unlinkSync(path.resolve(PATH_TO_PIPELINES, name + '.js'));
    fs.writeFileSync(PATH_TO_CONFIG, JSON.stringify(config, null, 4));
    return writeToStdout(name + ' pipeline removed.');
}

function onSaveCommand(name) {
    if (!pipeline.length) {
        return writeToStderr('No pipeline provided.');
    }

    config.pipelines[name] = true;
    fs.writeFileSync(PATH_TO_CONFIG, JSON.stringify(config, null, 4));
    var fileName = PATH_TO_PIPELINES + '/' + name + '.js';
    var content = 'module.exports = [' + pipeline.join(',') + '];';
    content = beautify(content, { indent_size: 4 });
    fs.writeFileSync(fileName, content);
    return writeToStdout(name + ' pipeline saved.');
}

function onShowCommand(name) {
    name = name.split('.')[0];
    if (!config.pipelines[name]) {
        return writeToStderr(name + ' not found.');
    }
    var savedPipeline = require(path.resolve(PATH_TO_PIPELINES, name)).toString();
    return writeToStdout(savedPipeline);
}

function onAliasCommand(pipelineName, Program) {
    var aliasLongName = Program.multi || pipelineName,
        aliasShortName = Program.single;

    if (!pipelineName) {
        return writeToStderr('Invalid alias parameters. At minimum pipeline name must be supplied.');
    }

    var hasShortName = Boolean(aliasShortName);
    var pipelineExists = config.pipelines[pipelineName];

    if (!pipelineExists) {
        return writeToStderr('Pipeline ' + pipelineName + ' does not exist.');
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
            return writeToStderr('Alias must be supplied.');
        }
        predicate.long = aliasLongName;
    }

    var aliasExists = _.some(definedAliases, predicate);

    //conflict with pipe short hand
    if (predicate.short === 'p') {
        return writeToStderr('Cannot override reserved alias.');
    }

    config.aliases[pipelineName] = predicate;
    fs.writeFileSync(PATH_TO_CONFIG, JSON.stringify(config, null, 4));
    return writeToStdout('Alias sucessfully saved.');
}

function onPruneCommand() {
    var directoryListing = fs.readdirSync(PATH_TO_PIPELINES);
    _.each(directoryListing, function (listingName) {
        var listingStat = fs.statSync(path.resolve(PATH_TO_PIPELINES, listingName));
        if (!listingStat.isDirectory()) {
            var extension = path.extname(listingName);
            listingName = listingName.slice(0, listingName.lastIndexOf(extension));

            if (!config.pipelines[listingName]) {
                writeToStdout('Removed ' + listingName + 'from pipelines directory.');
                fs.unlinkSync(path.resolve(PATH_TO_PIPELINES, listingName));
            }
        }
    });

    fs.writeFileSync(PATH_TO_CONFIG, JSON.stringify(config, null, 4));
}

function onIncludeCommand() {
    var directoryListing = fs.readdirSync(PATH_TO_PIPELINES);
    _.each(directoryListing, function (listingName) {
        var listingStat = fs.statSync(path.resolve(PATH_TO_PIPELINES, listingName));
        var extension = path.extname(listingName);
        var nameWithoutExtension = listingName.slice(0, listingName.lastIndexOf(extension));
        if (!listingStat.isDirectory() &&
            extension === '.js' &&
            !config.pipelines[nameWithoutExtension]) {
            console.log('Adding ' + nameWithoutExtension + ' to config.');
            config.pipelines[nameWithoutExtension] = true;
        }
    });
    fs.writeFileSync(PATH_TO_CONFIG, JSON.stringify(config, null, 4));
}

function handleCommand(action) {
    isRunningCommand = true;
    action.apply(action, _.slice(arguments, 1));
}

program
    .option('-p, --pipe [value]', 'An expression to which will be evaluated in the context of the stream.', function (val) {
        //its possible a optional flag has not run that should have (is this a bug with commander?)
        runPipelinesWithOptionalFlags();
        //esprima will crash if anonymous function is not expression
        pipeline.push('(function(stdin) {' + val + '})');
    })
    .option('--encoding [value]', 'Stdin encoding.')
    .option('--buffer [value]', 'Read stdin into process memory until stdin end is emitted, then process pipeline.')
    .option('--debug [value]', 'Turn on debug mode.');

program.command('save [value]').action(handleCommand.bind(null, onSaveCommand));
program.command('remove [value]').action(handleCommand.bind(null, onRemoveCommand));
program.command('list [value]').action(handleCommand.bind(null, onListCommand));
program.command('show [value]').action(handleCommand.bind(null, onShowCommand));
program.command('prune').action(handleCommand.bind(null, onPruneCommand));
program.command('include').action(handleCommand.bind(null, onIncludeCommand));

program.command('alias [value]')
    .option('--single [value]', 'Alias command option: provide a short alias name. e.g. -s for split.')
    .option('--multi [value]', 'Alias command option: provide a long alias name. e.g. --split for split.')
    .action(handleCommand.bind(null, onAliasCommand));

options.forEach(function (option) {
    program.option.apply(program, option);
});

program.parse(process.argv);

if (isRunningCommand) {
    return;
}

//TODO: pipeline is outputted as array which is nested too deeply / unnecessarily
pipeline = _.map(pipeline, function (pipe) {
    return PipelineParser.resolve(pipe, config.pipelines);    
});

if (program.debug) {
    writeToStdout('PIPELINE: ' + JSON.stringify(pipeline));
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
        require: require,
        process: process,
        async: async,
        writeToStdout: writeToStdout,
        writeToStderr: writeToStderr
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
                writeToStdout('CURRENT PIPE: ', script);
            }

            var done = function (err, stdout) {
                if (err) {
                    return callback(err);
                }
                if (program.debug) {
                    writeToStdout('STDOUT: ', stdout);
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

//same implementation as writeToStdout
function writeToStdout() {
    return process.stdout.write(format.apply(this, arguments) + '\n');
}

function writeToStderr() {
    return process.stderr.write(format.apply(this, arguments) + '\n');   
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
                writeToStderr(err);
                return process.exit(1);
            }
            if (stdout !== undefined) {
                writeToStdout(stdout);
            }
        });
    }
});

process.stdin.on('end', function () {
    if (program.buffer) {
        startPipeline(data, pipeline, function (err, stdout) {
            if (err) {
                writeToStderr(err);
                return process.exit(1);
            }
            if (stdout !== undefined) {
                writeToStdout(stdout);
            }
            process.exit(0);
        });
    }
    else {
        process.exit(0);
    }
});

process.on('SIGINT', function() {
    process.exit();
});

if (!HAS_STDIN) {
    startPipeline(null, pipeline, function (err, stdout) {
        if (err) {
            writeToStderr(err);
            return process.exit(1);
        }
        if (stdout !== undefined) {
            writeToStdout(stdout);
        }
        process.exit(0);
    });
}