module.exports = [function(stdin) {
    var filterRecursive = function (obj) {
        if (_.isArray(obj)) {
            obj = _.reduce(obj, function (acc, sub) {
                var ret = filterRecursive(sub);

                if (ret) {
                    if (_.isArray(ret)) {
                        acc.push(ret);
                    }
                    else {
                        acc.push(sub);
                    }
                }

                return acc;
            }, []);
            return obj;
        }
        else {
            return Boolean(obj);
        }
    };
    return filterRecursive(stdin);
}];