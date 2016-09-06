module.exports = [function(stdin) {
    return stdin.filter(function(item) {
        return ~item.indexOf($0 || true);
    });
}];