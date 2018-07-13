const _ = require('lodash');
let a = ['sdfs', '322', 'sdfsdf'];
let c = _.clone(a);
console.log(c);
c.push('c');
console.log(c);
console.log(a);