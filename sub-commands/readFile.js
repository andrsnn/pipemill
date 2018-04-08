var fs = require('fs');

module.exports.run = function(stdin, args, rawArgs, sandbox) {
	var filePath = args[0] || '';
	var fileName = args[1] || filePath.slice(filePath.lastIndexOf('/') + 1, filePath.lastIndexOf('.'));

	sandbox.files = sandbox.files || {};
	sandbox.files[fileName] = fs.readFileSync(filePath).toString();
	return stdin;
};

module.exports.help = 'Read a file from file path (0).  Save contents to variable attached to sandbox (1, optional or file name is used).'