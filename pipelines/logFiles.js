module.exports = [(function(stdin) {
    stdin.forEach(function(item) {
        var file = fs.readFileSync(item).toString();
        fs.writeSync(1, file);
    });
})];