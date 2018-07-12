const natural = require('natural');
console.log(natural.JaroWinklerDistance('nihaoa', 'nihaoa'));
for (let [integration, commandInfo] of commands.entries()) {
  for (let commandStr of commandInfo.subs.keys()) {
    let similarity = natural.JaroWinklerDistance(`${words[1]} ${words[2]} ${words[3]}`, `${integration} ${commandStr}`);
    if (similarity > this.MINIMUM_SIMILARITY) {
      similarCommands.push({
        similarity: similarity,
        command: command
      });
      if (similarity === 1) {
        similarCommands = [{
          similarity: similarity,
          command: command
        }];
        break;
      }
    }
  }
}