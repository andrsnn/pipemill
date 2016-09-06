module.exports = [function(stdin) {
    return stdin.split(undefined || "\n");
}, function(stdin) {
    return stdin.filter(function(item) {
        return ~item.indexOf("total" || true);
    });
}, function(stdin) {
    console.log(stdin)
}];