const path = require('path');
const extend = require('extend');
console.log(path.join(`${__dirname}/adapters/wechat`, 'config.yaml'))
console.log(path.resolve(".", "src", "scripts"))
console.log(extend(true,{test: 2}, {test: 'hh'}, {test: process.env.test}))