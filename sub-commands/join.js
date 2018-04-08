
module.exports.run = function(stdin, args, rawArgs) {
	var delimiter = rawArgs || '\n';

	return stdin.join(delimiter);
};

module.exports.help = 'Run the builtin join function on stdin.  Delimiter defaults to new line (0).'