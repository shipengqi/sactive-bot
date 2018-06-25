const path = require('path');
const {ymlHelper} = require('../../lib/utils');
const commonConfig = path.join(__dirname, '../mock', 'common.yml');
let commonData = ymlHelper.get(commonConfig);
let reg = eval(commonData.PLATFORM.pattern);
console.log(reg)
console.log(reg.test(9));
console.log(reg.test("9"));
console.log(reg.test(7));
console.log(reg.test("7"));
console.log(reg.test(1));
console.log(reg.test("1"));
console.log(reg.test(2));
console.log(reg.test("2"));