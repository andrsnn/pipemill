# pipemill

All your favorite nix utilities in JavaScript.

Pipemill allows manipulation of stdin process streams, chaining process stdin between a series of JavaScript expressions.

Grep

```bash

ls -l | pipemill --split --filter 'e.includes("json")' --join

#OR

ls -l | node index.js -p 'stdin.split("\n")' -p 'stdin.filter(Boolean)' -p 'stdin.filter(e => e.includes("json"))' -p 'stdin.toString()'

```


Sed

```bash

cat package.json | pipepill -p 'stdin.replace("ISC", "MIT")'

```

JQ

```bash

cat package.json | pipemill --parse -p 'stdin.license = "MIT"; return stdin' --stringify

```


Find

```bash
# find all js files in node_modules folder

node index.js -p 'a = []' --walk 'path.extname(filePath) === ".js" && a.push(filePath), ./node_modules' -p 'a'

```