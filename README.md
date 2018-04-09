# pipemill

All your favorite nix utilities in JavaScript.

Pipemill allows manipulation of stdin process streams, chaining process stdin between a series of JavaScript expressions.

Grep

```bash

ls -l | pipemill --split --filter 'e.includes("json")' --join

#OR

ls -l | pipemill -p 'stdin.split("\n")' -p 'stdin.filter(Boolean)' -p 'stdin.filter(e => e.includes("json"))' -p 'stdin.toString()'

```


Sed

```bash

cat package.json | pipepill -p 'stdin.replace("ISC", "MIT")'

```

AWK

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

JQ

```bash

cat package.json | pipemill --parse -p 'stdin.license = "MIT"; return stdin' --stringify

```

Find

```bash
# find all js files in node_modules folder

pipemill -p 'a = []' --walk './node_modules, path.extname(filePath) === ".js" && a.push(filePath)' -p 'a'

```