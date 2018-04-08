module.exports.run = function(stdin, args, rawArgs) {
	var delimiter = rawArgs || '\n';

	if (stdin[stdin.length - 1] === '\n') {
		stdin = stdin.slice(0, stdin.length - 1);
	}

	return stdin.split(delimiter);
}

module.exports.help = 'Run the builtin split function on stdin.  Delimiter defaults to new line (0).'