var SynchronizationLink = function(_name, _repo, _localBranch, _remote, _remoteBranch) {
  this.name = _name;

  this.isSyncing = false;

  this.continuous = false;

  this.singleSync = false;

  this.syncInterval = 30000; // In milliseconds

  this.timeStamp = new Date().getTime();

  this.setContinuous = function(continuous) {
    this.continuous = continuous;
  };

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

  this.getIsActive = function() {
    return _remote.active;
  };

  this.equals = function(link) {
    return this.getRepo() === link.getRepo() && this.getRemote() === link.getRemote() &&
        this.getLocalBranch() === link.getLocalBranch() && this.getRemoteBranch() === link.getRemoteBranch();
  };
};
