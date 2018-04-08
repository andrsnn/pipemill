
module.exports.run = function(stdin, args = [], rawArgs, runInSandbox) {
	return stdin.map(e => {
		return runInSandbox(rawArgs, { e });
	});
};

module.exports.help = 'Run the builtin map function on stdin, variable e is available in scope of supplied expression (0) per item in the collection.'