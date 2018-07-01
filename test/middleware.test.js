let encodeString = encodeURI('@this. 你儿子儿');
console.log(encodeString);
let decodeString = decodeURI(encodeString);
console.log(decodeString);

console.log(/^\s*[@]?(?:this\.[:,]?|\/[:,]?)\s*(?:test get sbot[ ]?(.*)?$)/i.test('@this.  test get bot'));
console.log(/^\s*[@]?(?:this\.[:,]?|\/[:,]?)\s*(?:test get bot)/.test('@this.  test get bot'));