var GeoGitRepo = function(_url, _branch, _name) {
  this.url = _url;
  this.branch = _branch;
  this.name = _name;
  this.branches = [];
  this.remotes = [];
  this.isEqual = function(repo) {
    return this.url === repo.url && this.branch === repo.branch && this.name === repo.name;
  };
};

var GeoGitTransaction = function(_commandFunction, _repoId, _TransactionParams) {
  this.command = function(command, options) {
    if (!goog.isDefAndNotNull(options)) {
      options = {};
    }
    options.transactionId = _TransactionParams.ID;
    return _commandFunction(_repoId, command, options);
  };

  this.finalize = function() {
    return _commandFunction(_repoId, 'endTransaction',
        {'transactionId': _TransactionParams.ID}
    );
  };

  this.abort = function() {
    return _commandFunction(_repoId, 'endTransaction',
        {'transactionId': _TransactionParams.ID, 'cancel': true}
    );
  };
};

////////////////////////////////////////////
// Geogit Command Options
//
// Default values can be specified here.
// Use null to use GeoGit default.
//
// Variables that conflict with keywords
// should be tailed with _something.
////////////////////////////////////////////

var GeoGitPushOptions = function() {
  this.all = null;
  this.ref = null;
  this.remoteName = null;
};

var GeoGitPullOptions = function() {
  this.all = null;
  this.ref = null;
  this.remoteName = null;
  this.authorName = null;
  this.authorEmail = null;
};

var GeoGitFetchOptions = function() {
  this.all = null;
  this.prune = null;
  this.remote = null;
};

var GeoGitMergeOptions = function() {
  this.noCommit = null;
  this.commit = null;
  this.authorName = null;
  this.authorEmail = null;
};

var GeoGitCheckoutOptions = function() {
  this.branch = null;
  this.ours = null;
  this.theirs = null;
  this.path = null;
};

var GeoGitAddOptions = function() {
  this.path = null;
};

var GeoGitRemoveOptions = function() {
  this.path = null;
  this.recursive = null;
};

var GeoGitResolveConflictOptions = function() {
  this.path = null;
  this.objectid = null;
};

var GeoGitVersionOptions = function() {
};

var GeoGitTagOptions = function() {
  this.list = null;
};

var GeoGitFeatureDiffOptions = function() {
  this.path = null;
  this.oldCommitId = null;
  this.newCommitId = null;
  this.all = null;
};

var GeoGitGetCommitGraphOptions = function() {
  this.depth = null;
  this.commitId = null;
  this.page = null;
  this.show = null;
};

var GeoGitUpdateRefOptions = function() {
  this.name = null;
  // delete conflicts with a keyword, add _ref to prevent this.
  // It will be resolved later.
  this.delete_ref = null;
  this.newValue = null;
};

var GeoGitRefParseOptions = function() {
  this.name = null;
};

var GeoGitRemoteOptions = function() {
  this.list = null;
  this.remove = null;
  this.remoteName = null;
  this.remoteURL = null;
  this.username = null;
  this.password = null;
};

var GeoGitBranchOptions = function() {
  this.list = null;
  this.remotes = null;
};

var GeoGitLsTreeOptions = function() {
  this.showTree = null;
  this.onlyTree = null;
  this.recursive = null;
  this.verbose = null;
  this.paths = null;
};

var GeoGitCommitOptions = function() {
  this.all = null;
  this.message = null;
  this.authorName = null;
  this.authorEmail = null;
};

var GeoGitDiffOptions = function() {
  this.oldRefSpec = null;
  this.newRefSpec = null;
  this.pathFilter = null;
  this.showGeometryChanges = null;
  this.page = null;
  this.elementsPerPage = null;
};

var GeoGitLogOptions = function() {
  this.limit = null;
  this.offset = null;
  this.paths = null;
  this.since = null;
  this.until = null;
  this.page = null;
  this.elementsPerPage = null;
  this.firstParentOnly = null;
};
