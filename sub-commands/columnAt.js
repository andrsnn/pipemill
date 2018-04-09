
module.exports.run = function(stdin, args = [], rawArgs, runInSandbox) {
	return stdin.split(args[2] || '\n')
		.filter(Boolean)
		.map(e => e.split(args[1] ? new RegExp(args[1]) : /\s+/g))
		.map(e => e[args[0] || 0]);
};

module.exports.help = 'Extract a column of data (0, defaults to column zero).  Defaults to new line delimited input (2, optional), split individual lines by spaces (1, optional)';