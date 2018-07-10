module.exports = function() {
  return [
    {
      name: 'command-receiver',
      method: 'post',
      path: '/demo2/route2',
      handler: function(ctx, next) {
        ctx.body = 'Hello demo2-route2 !!!';
      }
    }
  ];
};
