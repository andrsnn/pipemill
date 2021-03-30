# pipemill

All your favorite *nix utilities in JavaScript.

Pipemill allows manipulation of stdin process streams, chaining stdin between a series of JavaScript expressions.

Inspiration taken from the [unix pipemill](https://en.wikipedia.org/wiki/Pipeline_(Unix)#Pipemill).

## Install

`npm i -g pipemill`

## Examples

### Replace package.json license

```bash

cat package.json | pipepill -p 'stdin.replace("ISC", "MIT")'

```

### Get the userId from an API request
```bash
curl https://jsonplaceholder.typicode.com/todos/1 | pipemill --parse -p 'stdin.userId'
```

### Group AWS lambdas by VpcId

```bash
# aws lambda list-functions output
# {
#   "Functions": [
#       { "FunctionName": "LambdaA", "VpcConfig": { "VpcId": "vpc-12345" } },
#       { "FunctionName": "LambdaB", "VpcConfig": { "VpcId": "vpc-12345" } },
#       { "FunctionName": "LambdaC", "VpcConfig": { "VpcId": "vpc-123456" } },
#   ]
# }

aws lambda list-functions --region us-east-1 | pipemill --parse -p '_.groupBy(stdin.Functions, "VpcConfig.VpcId")'

# {
#    "vpc-12345": [
#         { "FunctionName": "LambdaA", "VpcConfig": { "VpcId": "vpc-12345" } },
#         { "FunctionName": "LambdaB", "VpcConfig": { "VpcId": "vpc-12345" } }
#     ],
#    "vpc-123456": [{ "FunctionName": "LambdaC", "VpcConfig": { "VpcId": "vpc-123456" } }]
# }
```

### Grab file permissions from `ls -l`

```bash

# extract file permissions from ls -l
ls -l | pipemill --columnAt 0

# produces
# [ 'total',
# '-rw-r--r--',
# '-rw-r--r--',
# '-rwxr-xr-x']

# OR

ls -l | pipemill --split --map 'e.split(/\s+/g)' --map 'e[0]'

```

### Find all unique open source licenses used in node_modules

```bash
find ./node_modules -iname 'package.json' | while read file; do 
    cat $file | pipemill --buffer --parse -p 'stdin.license'
done | pipemill --buffer --split -p 'stdin.filter(Boolean)' -p '_.uniq(stdin)'

# Outputs:
# [
#   'MIT',
#   '(MIT OR CC0-1.0)',
#   'Apache-2.0',
#   'BSD-2-Clause',
#   'BSD-3-Clause',
#   'ISC',
#   'CC-BY-3.0',
#   'CC0-1.0'
# ]
```

### Get JSON files from directory

```bash
find . -iname '*.json' -type f | while read file; do echo $file | pipemill -p 'stdin.match(/\d+\.json/g)[0]'; done

# Outputs:
# 1.json
# 2.json
# etc ...
```

### Parsing Apache logs

```bash

cat logs | pipemill --split -p 'stdin.map(e => e.split(" "))'

# Outputs:
# [
#   [
#     '192.168.2.20',
#     '-',
#     '-',
#     '[28/Jul/2006:10:27:10',
#     '-0300]',
#     '"GET',
#     '/cgi-bin/try/',
#     'HTTP/1.0"',
#     '200',
#     '3395'
#   ],
#   [
#     '127.0.0.1',
#     '-',
#     '-',
#     '[28/Jul/2006:10:22:04',
#     '-0300]',
#     '"GET',
#     '/',
#     'HTTP/1.0"',
#     '200',
#     '2216'
#   ],
#   [
#     '192.168.2.20',
#     '-',
#     '-',
#     '[28/Jul/2006:10:22:04',
#     '-0300]',
#     '"GET',
#     '/',
#     'HTTP/1.0"',
#     '200',
#     '2216'
#   ]
# ]

cat logs | pipemill --split \
    -p 'stdin.map(e => e.split(" "))' \
    -p 'stdin.map(e => e[0])' \
    -p '_.uniq(stdin)'

# Outputs:
# [ '192.168.2.20', '127.0.0.1' ]

cat logs | pipemill --split \
    -p 'stdin.map(e => e.split(" "))' \
    -p 'stdin.map(e => e[0])' \
    -p '_.uniq(stdin)' \
    --join

# Outputs:
# 192.168.2.20
# 127.0.0.1
```

### Get AWS Lambda's grouped by attached layers

```bash
aws lambda list-functions --region us-east-1 | pipemill --parse \
-p 'nestedFor(stdin, "Functions.Layers", layer => {
        var arn = layer.Arn.split(":");
        layer.name = arn.slice(arn.length - 2).join(":");
}); return stdin;' \
-p '_.groupBy(stdin.Functions, e => _.map(e.Layers, "name").sort().join(","))'

# {
# 'layerA:92,layerB:32': [
#     {
#       FunctionName: 'lambdaA',
#       FunctionArn: 'arn:aws:lambda:us-east-1:123456789:function:lambdaA',
#       ...
#       Environment: [Object],
#       TracingConfig: [Object],
#       Layers: [Array],
#       PackageType: 'Zip'
#     }
#   ]
# }
```