var path = require('path');
var fs = require('fs');

module.exports.run = function(stdin, args = [], rawArgs, runInSandbox) {
	var pathToFolder = path.resolve(process.cwd(), args[0] || '.');

	function traverse(pathToFolder) {
		var dir = fs.readdirSync(pathToFolder);

		dir.forEach(childPath => {
			var pathToChild = `${pathToFolder}/${childPath}`;
			if (fs.statSync(pathToChild).isDirectory()) {
				traverse(pathToChild);
			}
			else {
				runInSandbox(args[1], { filePath: pathToChild });
			}
		})
	}

	traverse(pathToFolder);
};

module.exports.help = 'Traverse all sub files and folders underneath the supplied path (1, defaults to .).  Execute an expression (0) per filePath.';