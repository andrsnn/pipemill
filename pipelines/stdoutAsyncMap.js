module.exports = [
    function (stdin) {
        async.eachSeries(stdin, function (item, callback) {
            writeToStdout($0 + '\n\n\n');
            callback();
        }, function () {
            done();
        });
    }
];