module.exports = [function(stdin) {
    return stdin.filter(function(item) {
        return typeof $0 === 'function' ?
            $0(item) : item.indexOf($0) > -1;
    });
}];