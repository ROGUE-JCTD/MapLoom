var SynchronizationLink = function(_name, _repo, _localBranch, _remote, _remoteBranch) {
  this.name = _name;

  this.getRepo = function() {
    return _repo;
  };
  this.getRemote = function() {
    return _remote;
  };
  this.getLocalBranch = function() {
    return _localBranch;
  };
  this.getRemoteBranch = function() {
    return _remoteBranch;
  };

  this.equals = function(link) {
    return this.getRepo() === link.getRepo() && this.getRemote() === link.getRemote() &&
        this.getLocalBranch() === link.getLocalBranch() && this.getRemoteBranch() === link.getRemoteBranch();
  };
};
