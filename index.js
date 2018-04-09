#!/usr/bin/env node
'use strict';

var program = require('commander');
var async = require('async');
var _ = require('lodash');
var os = require('os');
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var util = require('util');
var format = util.format;

var { getAvailableSubCommands, runInSandbox } = require('./helpers');

var PATH_TO_SUB_COMMANDS = process.env['PIPEMILL_SUB_COMMANDS_PATH'] || path.resolve(__dirname, './sub-commands');
var HAS_STDIN = !Boolean(process.stdin.isTTY);
var ANONYMOUS_COMMAND_TYPE = 'ANONYMOUS_COMMAND';
var SUB_COMMAND_TYPE = 'SUB_COMMAND';

var pipemill = [];

program
    .option('-p, --pipe [value]', 'An expression which will be evaluated in the context of the stream.', function (value) {
        pipemill.push({
            type: ANONYMOUS_COMMAND_TYPE,
            run: value,
            args: null,
            rawArgs: null,
            name: ANONYMOUS_COMMAND_TYPE,
            path: null
        });
    })
    .option('--encoding [value]', 'Stdin encoding.')
    .option('--buffer [value]', 'Read stdin into process memory until stdin end is emitted, then process pipeline.');

var availableSubCommands = getAvailableSubCommands(PATH_TO_SUB_COMMANDS);

Object.keys(availableSubCommands).forEach(function (subCommandName) {
    var subCommand = availableSubCommands[subCommandName];
    var option = `--${subCommand.name} [value]`;
    program.on(subCommand.name, function (args) {
        args = args || '';
        pipemill.push({
            type: SUB_COMMAND_TYPE,
            run: subCommand.run,
            args: args.split(',')
                .filter(Boolean)
                .map(e => e.trim())
                .map(e => {
                    if (e === 'null') return null;
                    else if (e === 'undefined') return undefined;
                    return e;
                }),
            rawArgs: args,
            name: subCommand.name,
            path: subCommand.path
        });
    });
    program.option(option, subCommand.help);
});

program.parse(process.argv);

function runPipemill(stdin) {

    var pipemillSandboxContext = Object.assign({}, global, {
        async,
        _,
        fs,
        path,
        os,
        util,

        stdin,
        stdout: stdin
    });
    vm.createContext(pipemillSandboxContext);

    pipemill.forEach(command => {
        var { type, run, args, rawArgs, name, path } = command;

        pipemillSandboxContext.stdin = pipemillSandboxContext.stdout;

        if (command.type === ANONYMOUS_COMMAND_TYPE) {
            var code = `function(){ ${
                run.indexOf('return') === -1
                    ? 'return ' + command.run
                    : command.run
            }}`;

            vm.runInContext(`stdout = (${code})(stdin)`, pipemillSandboxContext);
        }
        else {
            pipemillSandboxContext.stdout = run(
                pipemillSandboxContext.stdin, args, rawArgs, runInSandbox(pipemillSandboxContext));
        }

    });

    return pipemillSandboxContext.stdout;
}


process.stdin.resume();
process.stdin.setEncoding(program.encoding || 'utf8');

function log(msg) {
    if (typeof msg === 'string') {
        // console.log appends a new line character
        if (msg[msg.length - 1] === '\n') {
            msg = msg.slice(0, msg.length - 1);
        }
    }

    console.log(msg);
}

var data = '';
process.stdin.on('data', function(stdin) {
    if (program.buffer) {
        data += stdin.toString();
    }
    else {
        const stdout = runPipemill(stdin);

        if (stdout !== undefined || stdout !== null) {
            log(stdout);
        }
    }
});

process.stdin.on('end', function () {
    if (program.buffer) {
        const stdout = runPipemill(stdin);

        if (stdout !== undefined || stdout !== null) {
            log(stdout);
        }

        process.exit(0);
    }
    else {
        process.exit(0);
    }
});

process.on('SIGINT', function() {
    process.exit();
});

if (!HAS_STDIN) {
    const stdout = runPipemill(null);

    if (stdout !== undefined || stdout !== null) {
        log(stdout);
    }

    process.exit(0);
}