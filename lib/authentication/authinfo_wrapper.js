class AuthInfoWrapper {
  constructor(collaborationUser, credential, token, lastAccessTime) {
    this.collaborationUser = collaborationUser;
    this.credential = credential;
    this.token = token;
    this.lastAccessTime = lastAccessTime || new Date().getTime();
  }
}

module.exports = AuthInfoWrapper;