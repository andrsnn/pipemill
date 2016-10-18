module.exports = [function(stdin) {
    if ($1 !== undefined) {
        stdin = stdin[$1];
    }
    return stdin.split($0 || "\n");
}]