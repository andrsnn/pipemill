
module.exports.run = function(stdin, args, rawArgs, sandbox) {
	var indentation = args[0] || 4;
	return JSON.stringify(stdin, null, indentation);
};

module.exports.help = 'JSON.stringify stdin.';