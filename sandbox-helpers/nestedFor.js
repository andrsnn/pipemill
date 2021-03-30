module.exports = function nestedFor(obj, path, iterator, _currKey = '') {
    if (_currKey === path) {
        if (Array.isArray(obj)) {
            for(var i = 0; i < obj.length; i++) {
                if (iterator(obj[i])) {
                    return;
                }
            }
            return;
        }
        else {
            throw new Error(_currKey + ' is not an array!');
        }    
    }
    
    if (typeof obj === 'object' && obj !== null) {
        for (var key in obj) {
            let p = _currKey;
            if (!Array.isArray(obj)) {
                p += (p ? ('.' + key) : key);
            }            
            nestedFor(obj[key], path, iterator, p)
        }
    }
}