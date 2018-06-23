const WECHAT_ADAPTER_LOG_PREFIX = 'sbot-wechat-adapter:';
const WECHAT_API_DOMAIN = [
  {
    wxApi: 'https://wx.qq.com/cgi-bin/mmwebwx-bin',
    pushApi: 'https://webpush.wx.qq.com/cgi-bin/mmwebwx-bin',
    fileApi: 'https://file.wx.qq.com/cgi-bin/mmwebwx-bin'
  },
  {
    wxApi: 'https://wx2.qq.com/cgi-bin/mmwebwx-bin',
    pushApi: 'https://webpush.wx2.qq.com/cgi-bin/mmwebwx-bin',
    fileApi: 'https://file2.wx.qq.com/cgi-bin/mmwebwx-bin'
  }
];

module.exports = {
  WECHAT_ADAPTER_LOG_PREFIX,
  WECHAT_API_DOMAIN
};