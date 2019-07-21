class AuthInfoWrapper {
  constructor(userInfo, username, password, lastAccessTime) {
    this.userInfo = userInfo;
    this.username = username;
    this.password = password;
    this.lastAccessTime = lastAccessTime || new Date().getTime();
  }
}

module.exports = AuthInfoWrapper;