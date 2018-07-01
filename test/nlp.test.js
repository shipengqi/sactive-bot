const natural = require('natural');
// console.log(natural.PorterStemmer.stem('words'));
// console.log(natural.PorterStemmerEs.stem('jugaría'));
// console.log(natural.PorterStemmerRu.stem('падший'));
const tokenizer = new natural.RegexpTokenizer({pattern: /[ ]/});
// console.log(tokenizer.tokenize('hi ni hao'));
// console.log(tokenizer.tokenize('的疯狂的金凤凰 客户反馈  地方看到回复  付货款 地方'));
const classifier = new natural.BayesClassifier();
classifier.addDocument('i am long qqqq', 'buy');
classifier.addDocument('buy the q\'s', 'buy');
classifier.addDocument('short gold', 'sell');
classifier.addDocument('的疯狂的金凤凰', 'test');
classifier.addDocument('客户反馈', 'test');
classifier.addDocument('地方看到回复', 'test');
classifier.events.on('trainedWithDocument', function (obj) {
  console.log(obj);
  /* {
  *   total: 23 // There are 23 total documents being trained against
  *   index: 12 // The index/number of the document that's just been trained against
  *   doc: {...} // The document that has just been indexed
  *  }
  */
});
classifier.train();

console.log(classifier.classify('i am short silver'));