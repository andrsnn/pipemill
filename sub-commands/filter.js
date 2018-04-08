
module.exports.run = function(stdin, args = [], rawArgs, runInSandbox) {
	return stdin.filter(e => {
		//Boolean
		if (typeof global[args[0]] === 'function') {
			return global[args[0]](e);
		} 
		
		return runInSandbox(args[0], { e });
	});
};

module.exports.help = 'Run the builtin filter function on stdin, variable e is available in scope of supplied expression (0) per item in the collection.'