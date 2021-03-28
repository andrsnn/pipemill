# pipemill

All your favorite *nix utilities in JavaScript.

Pipemill allows manipulation of stdin process streams, chaining stdin between a series of JavaScript expressions.

Inspiration taken from the [unix pipemill](https://en.wikipedia.org/wiki/Pipeline_(Unix)#Pipemill).

### Grep

```bash

ls -l | pipemill --split --filter 'e.includes("json")' --join

#OR

ls -l | pipemill -p 'stdin.split("\n")' -p 'stdin.filter(Boolean)' -p 'stdin.filter(e => e.includes("json"))' -p 'stdin.toString()'

```

### Sed

```bash

cat package.json | pipepill -p 'stdin.replace("ISC", "MIT")'

```

### AWK

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

### JQ

```bash

cat package.json | pipemill --parse -p 'stdin.license = "MIT"; return stdin' --stringify

```

### Parsing Apache logs

```bash

cat logs | pipemill --split -p 'stdin.map(e => e.split(" "))'

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

# [ '192.168.2.20', '127.0.0.1' ]

cat logs | pipemill --split \
    -p 'stdin.map(e => e.split(" "))' \
    -p 'stdin.map(e => e[0])' \
    -p '_.uniq(stdin)' \
    --join

# 192.168.2.20
# 127.0.0.1
```