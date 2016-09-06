var _ = require('lodash');
var a = [ 'total 64',
  '-rw-r--r--   1 aidananderson  staff  2870 Sep  2 19:21 README.md',
  'drwxr-xr-x  33 aidananderson  staff  1122 Sep  4 18:13 node_modules',
  '-rw-r--r--   1 aidananderson  staff   462 Sep  4 21:11 package.json',
  '-rw-rw-r--   1 aidananderson  staff   604 Sep  5 02:33 tester.js',
  '-rwxr-xr-x   1 aidananderson  staff  9291 Sep  5 02:39 index.js',
  '-rw-r--r--   1 aidananderson  staff   316 Sep  5 02:39 config.json',
  '-rw-r--r--   1 aidananderson  staff  3531 Sep  5 02:47 pipeline-parser.js',
  'drwxr-xr-x   9 aidananderson  staff   306 Sep  5 02:49 pipelines' ]

console.log(_.invokeMap(a, String.prototype.split, ' '));