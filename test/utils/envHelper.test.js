let name = 'this.';
let alias = '/';
let botNameReg = new RegExp(`^(@?(?:${name}|${alias}):?)+( )+(.*)`, "i");
let message = '@this.skdhfjshdfs'
console.log(botNameReg.test(message))
