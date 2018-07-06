const natural = require('natural');
// console.log(natural.PorterStemmer.stem('words'));
// console.log(natural.PorterStemmerEs.stem('jugaría'));
// console.log(natural.PorterStemmerRu.stem('падший'));
// const tokenizer = new natural.RegexpTokenizer({pattern: /[ ]/});
// console.log(tokenizer.tokenize('hi ni hao'));
// console.log(tokenizer.tokenize('的疯狂的金凤凰 客户反馈  地方看到回复  付货款 地方'));
const classifier = new natural.BayesClassifier();
classifier.addDocument('create channel', 'admin create channel');
classifier.addDocument('create VM', 'admin create VM');
classifier.addDocument('create user', 'admin create user');


classifier.train();

classifier.save('td.json', function (error, classifier) {
  classifier.addDocument('create bot', 'admin create bot');
  classifier.train();
  natural.BayesClassifier.load('td.json', null, function(err, classifier) {
    classifier.addDocument('admin create student', 'ate student');
    classifier.addDocument('admin create channel', 'admin create channel');
    classifier.addDocument('admin create VM', 'admin create VM');
    classifier.addDocument('admin create user', 'admin create user');
    classifier.addDocument('i need a channel', 'admin get channel');
    classifier.train();
    console.log(classifier.getClassifications('I want a channel'));
    console.log('                                     ');
    console.log(classifier.getClassifications('i need a channel'));
    console.log('                                     ');
    console.log(classifier.getClassifications('give me a vm'));
    console.log('                                     ');
    console.log(classifier.getClassifications('give me a '));
    console.log('                                     ');
    console.log(classifier.getClassifications('give me bot '));
    console.log('                                     ');
    console.log(classifier.getClassifications('give me student '));
    console.log('                                     ');
    console.log(classifier.getClassifications('admin create student'));
  });
});
