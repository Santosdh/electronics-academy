// Loads the browser curriculum files into Node so the server can grade quizzes and compute progress.
const path = require('path');
const dir = path.join(__dirname, '..', 'public', 'js', 'content');
const FILES = ['program', 'level1', 'level2', 'level3', 'level4', 'level5', 'core-p1', 'core-p2', 'core-p3'];
FILES.forEach((f) => require(path.join(dir, f + '.js')));
module.exports = require(path.join(__dirname, '..', 'public', 'js', 'content.js'));
module.exports.FILES = FILES;
