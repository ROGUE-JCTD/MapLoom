var GeoGigRepo = function(_url, _uniqueId, _branch, _name) {
  this.url = _url;
  this.uniqueId = _uniqueId;
  this.branch = _branch;
  this.name = _name;
  this.branches = [];
  this.remotes = [];
  this.commitId = null;
  this.isEqual = function(repo) {
    return this.url === repo.url && this.branch === repo.branch && this.name === repo.name;
  };
};

var GeoGigTransaction = function(_commandFunction, _repoId, _TransactionParams) {
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
// Geogig Command Options
//
// Default values can be specified here.
// Use null to use GeoGig default.
//
// Variables that conflict with keywords
// should be tailed with _something.
////////////////////////////////////////////

var GeoGigPushOptions = function() {
  this.all = null;
  this.ref = null;
  this.remoteName = null;
};

var GeoGigPullOptions = function() {
  this.all = null;
  this.ref = null;
  this.remoteName = null;
  this.authorName = null;
  this.authorEmail = null;
};

var GeoGigFetchOptions = function() {
  this.all = null;
  this.prune = null;
  this.remote = null;
};

var GeoGigMergeOptions = function() {
  this.noCommit = null;
  this.commit = null;
  this.authorName = null;
  this.authorEmail = null;
};

var GeoGigCheckoutOptions = function() {
  this.branch = null;
  this.ours = null;
  this.theirs = null;
  this.path = null;
};

var GeoGigAddOptions = function() {
  this.path = null;
};

var GeoGigCatOptions = function() {
  this.objectid = null;
};

var GeoGigRemoveOptions = function() {
  this.path = null;
  this.recursive = null;
};

var GeoGigResolveConflictOptions = function() {
  this.path = null;
  this.objectid = null;
};

var GeoGigVersionOptions = function() {
};

var GeoGigTagOptions = function() {
  this.list = null;
};

var GeoGigFeatureDiffOptions = function() {
  this.path = null;
  this.oldTreeish = null;
  this.newTreeish = null;
  this.all = null;
};

var GeoGigBlameOptions = function() {
  this.path = null;
  this.commit = null;
};

var GeoGigGetCommitGraphOptions = function() {
  this.depth = null;
  this.commitId = null;
  this.page = null;
  this.show = null;
};

var GeoGigUpdateRefOptions = function() {
  this.name = null;
  // delete conflicts with a keyword, add _ref to prevent this.
  // It will be resolved later.
  this.delete_ref = null;
  this.newValue = null;
};

var GeoGigRefParseOptions = function() {
  this.name = null;
};

var GeoGigRemoteOptions = function() {
  this.list = null;
  this.remove = null;
  this.remoteName = null;
  this.remoteURL = null;
  this.username = null;
  this.password = null;
  this.ping = null;
  this.update = null;
  this.newName = null;
  this.verbose = null;
};

var GeoGigBranchOptions = function() {
  this.list = null;
  this.remotes = null;
};

var GeoGigLsTreeOptions = function() {
  this.showTree = null;
  this.onlyTree = null;
  this.recursive = null;
  this.verbose = null;
  this.paths = null;
};

var GeoGigCommitOptions = function() {
  this.all = null;
  this.message = null;
  this.authorName = null;
  this.authorEmail = null;
};

var GeoGigDiffOptions = function() {
  this.oldRefSpec = null;
  this.newRefSpec = null;
  this.pathFilter = null;
  this.showGeometryChanges = null;
  this.page = null;
  this.show = null;
};

var GeoGigLogOptions = function() {
  this.limit = null;
  this.offset = null;
  this.path = null;
  this.since = null;
  this.until = null;
  this.sinceTime = null;
  this.untilTime = null;
  this.page = null;
  this.show = null;
  this.firstParentOnly = null;
  this.countChanges = null;
  this.summary = null;
  this.returnRange = null;
};

var GeoGigRevertFeatureOptions = function() {
  this.authorName = null;
  this.authorEmail = null;
  this.commitMessage = null;
  this.mergeMessage = null;
  this.oldCommitId = null;
  this.newCommitId = null;
  this.path = null;
};
