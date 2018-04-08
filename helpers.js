var fs = require('fs');
var vm = require('vm');

module.exports.getAvailableSubCommands = (pathToSubCommands) => {
    var pipelines = {};
    var dir = fs.readdirSync(pathToSubCommands).filter(file => file[0] !== '.');

    dir.forEach(subCommandFilePath => {
        var subCommandName = subCommandFilePath.slice(0, subCommandFilePath.lastIndexOf('.'));
        var subCommandPath = `${pathToSubCommands}/${subCommandFilePath}`;
        var subCommandModule = require(subCommandPath);
        if ((subCommandModule === null || subCommandModule === undefined) ||
            typeof subCommandModule !== 'function' &&
            typeof subCommandModule.run !== 'function') {
            console.error(`Sub command ${subCommandName} must export a function or a method run which is a function.`);
            process.exit(0);
        }
        pipelines[subCommandName] = {
            path: subCommandPath,
            fileName: subCommandFilePath,
            name: subCommandName,
            run: subCommandModule.run ? subCommandModule.run : subCommandModule,
            help: subCommandModule.help || ''
        };
    });

    return pipelines;
};

module.exports.runInSandbox = (pipemillSandboxContext) =>
    (script, subCommandSandboxContext) => {
        var contextifiedSandbox = vm.createContext(
            Object.assign({}, global, pipemillSandboxContext, subCommandSandboxContext));
        return vm.runInContext(script, contextifiedSandbox);
    };