
module.exports.run = function(stdin, args, rawArgs, sandbox) {
	return JSON.parse(stdin);
};

module.exports.help = 'JSON.parse stdin.';