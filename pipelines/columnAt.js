module.exports = [function(stdin) {
    return pipelines.split();
}, function(stdin) {
    var filterRecursive = function(obj) {
        if (_.isArray(obj)) {
            obj = _.reduce(obj, function(acc, sub) {
                var ret = filterRecursive(sub);

                if (ret) {
                    if (_.isArray(ret)) {
                        acc.push(ret);
                    } else {
                        acc.push(sub);
                    }
                }

                return acc;
            }, []);
            return obj;
        } else {
            return Boolean(obj);
        }
    };
    return filterRecursive(stdin);
},
function (stdin) {
    return _.map(stdin, function (item) {
        return item.split(' ');
    });
},
function (stdin) {
    return _.reduce(stdin, function (acc, item) {
        if (item[$0]) {
            acc.push(item[$0]);
        }
        return acc;
    }, []);
}];