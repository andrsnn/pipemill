# pipemill

Pipemill is a cli utility for manipulating process streams with JavaScript.  Pipemill is akin to pjs but gives a complete degree of control over what code is evaluated in the context of the stream.

Like UNIX streams pipemill chains the process stdin between a series of JavaScript pipeline expressions.

``` bash
#split stdin into new lines
ls -tlr | pipemill -p 'return stdin.split("\n")'
```
```javascript
    [ 
        'drwxr-xr-x@ 20 user  staff   680 Aug  8 21:45 node_modules',
        'drwxr-xr-x@ 20 user  staff   680 Aug  8 21:45 package.json'
    ]
```

``` bash
# split stdin into new lines then filter out node_modules
ls -tlr | pipemill -p 'return stdin.split("\n")' \
    -p 'return _.filter(stdin, function (item){return ~item.indexOf("package")});'
````
```javascript
    [ 
        'drwxr-xr-x@ 20 user  staff   680 Aug  8 21:45 package.json'
    ]
```
``` bash
# save your javascript pipeline with an argument and reuse by passing in an expression
pipemill -p 'return stdin.split("\n")' \
    -p 'return _.filter(stdin, function (item){return ~item.indexOf($0)});' --save filter
ls -tlr | pipemill -p 'pipelines.filter("package")'
````
```javascript
    [ 
        'drwxr-xr-x@ 20 user  staff   680 Aug  8 21:45 package.json'
    ]
```
```bash
# pipeline supports asynchronous code evaluation
pipemill -p 'setTimeout(function() { done("1 second");},1000)'
```

As each pipe shares a sandbox environment on execution, its possible to set sandbox environment variables in one pipe and pass them onto the next.

```bash
# evaluate a file which connects to a database, then insert a document
pipemill -p "pipelines.runInContext('./example/connect.js')" \
-p 'var collection = connection.collection("documents");
quote>   // Insert some documents
quote>   collection.insertMany([
quote>     {a : 1}, {a : 2}, {a : 3}
quote>   ], function(err, result){
quote>     if (err) throw new Error(err);
quote>     console.log("Inserted 3 documents into the document collection");
quote>     done();
quote>   });'
Connected correctly to server
Inserted 3 documents into the document collection
```

  Options:

    -h, --help            output usage information
    -p, --pipe [value]    An expression to which will be evaluated in the context of the stream.
    -s, --save [value]    Save pipeline by name.
    -r, --remove [value]  Remove a saved pipeline by name.
    --list [value]        List all saved pipelines.
    --show [value]        Echo out a saved pipeline by name.
    --encoding [value]    Stdin encoding.
    -b, --buffer [value]  Read stdin into process memory until stdin end is emitted, then process pipeline.
    -d, --debug [value]   Turn on debug mode.

Caveats: 
- Currently only one memoised pipeline can be used per pipe.  Pipelines cannot currently be passed to be evaluated later.
- Must be used with node 0.12.15 or GREATER.