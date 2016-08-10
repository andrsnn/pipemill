#!/usr/bin/env node
var program = require('commander');
var async = require('async');
var _ = require('lodash');
var os = require("os");
var fs = require('fs');
var path = require('path');
var PipelineParser = require('./pipeline-parser');
var vm = require('vm');
var util = require('util');

var HAS_STDIN = !Boolean(process.stdin.isTTY);
//this needs to be replaced to make use of the pipline-parser.esprima resolve call
var DONE_CALLBACK_REGEX = /done\s*(?:\().*(?:\))/g;

var PATH_TO_CONFIG = path.resolve(__dirname, 'config.json');

var configExists = fs.existsSync(PATH_TO_CONFIG);

if (!configExists) {
    fs.writeFileSync(PATH_TO_CONFIG, JSON.stringify({pipelines: {}}));
}

var config = JSON.parse(fs.readFileSync(PATH_TO_CONFIG));

program
    .option('-p, --pipe [value]', 'An expression to which will be evaluated in the context of the stream.', function (val, acc) {
        acc.push(val);
        return acc;
    }, [])
    .option('-s, --save [value]', 'Save pipeline by name.')
    .option('-r, --remove [value]', 'Remove a saved pipeline by name.')
    .option('--list [value]', 'List all saved pipelines.')
    .option('--show [value]', 'Echo out a saved pipeline by name.')
    .option('--encoding [value]', 'Stdin encoding.')
    .option('-b, --buffer [value]', 'Read stdin into process memory until stdin end is emitted, then process pipeline.')
    .option('-d, --debug [value]', 'Turn on debug mode.')
    .parse(process.argv);


var pipeline = program.pipe;
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
    var fileName = path.resolve(__dirname, name + '.pipeline');
    var content = 'module.exports = ' + JSON.stringify(pipeline, null, 4);
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
    var savedPipeline = require(path.resolve(__dirname, name + '.pipeline'));
    return console.log(savedPipeline);
}

//TODO: pipeline is outputted as array which is nested too deeply / unnecessarily
pipeline = _.map(pipeline, function (pipeline) {
    return PipelineParser.resolve(pipeline, config.pipelines);    
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

            var script = 'stdout = (function (stdin) {' +
                pipe + '})(stdin);',
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
            console.log(stdout);
        });
    }
});

process.stdin.on('end', function () {
    if (program.buffer) {
        startPipeline(data, pipeline, function (err, stdout) {
            if (err) {
                return console.error(err);
            }
            console.log(stdout);
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
        console.log(stdout);
    });
}