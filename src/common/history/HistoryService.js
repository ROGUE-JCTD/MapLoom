(function() {
  var module = angular.module('loom_history_service', []);

  // Private Variables
  var rootScope_ = null;
  var service_ = null;
  var geogigService_ = null;
  var pulldownService_ = null;
  var dialogService_ = null;
  var translate_ = null;
  var q_ = null;

  module.provider('historyService', function() {
    this.log = [];
    this.title = 'History';
    this.nextPage = false;
    this.entriesPerPage = 10;
    this.layer = null;
    this.repoId = null;
    this.pathFilter = null;
    this.fetchingHistory = false;
    this.historyTransaction = 0;

    this.$get = function($q, $rootScope, $translate, geogigService, pulldownService, dialogService) {
      rootScope_ = $rootScope;
      service_ = this;
      geogigService_ = geogigService;
      pulldownService_ = pulldownService;
      dialogService_ = dialogService;
      translate_ = $translate;
      q_ = $q;
      return this;
    };

    this.getHistory = function(layer, pathFilter) {
      if (service_.fetchingHistory === false) {
        service_.historyTransaction++;
        service_.clearHistory();
        service_.fetchingHistory = true;
        service_.pathFilter = pathFilter;
        if (goog.isDefAndNotNull(layer)) {
          service_.layer = layer;
        }
        return getHistoryInternal();
      }
      return null;
    };

    this.getMoreHistory = function() {
      if (service_.fetchingHistory === false) {
        service_.fetchingHistory = true;
        getHistoryInternal();
      }
    };

    this.refreshHistory = function(layerName) {
      if (goog.isDefAndNotNull(service_.layer) && service_.fetchingHistory === false) {
        if (goog.isDefAndNotNull(layerName) && service_.layer.get('metadata').uniqueID !== layerName) {
          return;
        }
        service_.fetchingHistory = true;
        getHistoryInternal(true);
      }
    };

    this.clearHistory = function() {
      service_.fetchingHistory = false;
      service_.log = [];
      service_.nextPage = false;
      service_.layer = null;
      service_.repoId = null;
      service_.pathFilter = null;
      rootScope_.$broadcast('history_cleared');
    };

    this.setTitle = function(title) {
      service_.title = title;
    };
  });

  function getHistoryInternal(_refresh) {
    var deferredResponse = q_.defer();
    var refresh = _refresh;
    if (!goog.isDefAndNotNull(refresh)) {
      refresh = false;
    }
    if (goog.isDefAndNotNull(service_.layer)) {
      var logOptions = new GeoGigLogOptions();
      if (refresh && service_.log.length > 0) {
        // for refresh we will limit the log by specifying since and until
        logOptions.show = 1000;
      } else {
        logOptions.show = service_.entriesPerPage;
      }

      logOptions.countChanges = true;
      var thisTransaction = service_.historyTransaction;
      var metadata = service_.layer.get('metadata');
      if (goog.isDefAndNotNull(metadata)) {
        if (goog.isDefAndNotNull(metadata.branchName)) {
          logOptions.until = metadata.branchName;
        }
        if (service_.log.length > 0 && !refresh) {
          logOptions.until = getFirstParent(service_.log[service_.log.length - 1]);
        }
        if (refresh && service_.log.length > 0) {
          logOptions.since = service_.log[0].id;
        }
        if (goog.isDefAndNotNull(metadata.repoId) && goog.isDefAndNotNull(metadata.nativeName)) {
          service_.repoId = metadata.repoId;
          if (!goog.isDefAndNotNull(service_.pathFilter)) {
            service_.pathFilter = metadata.nativeName;
          }
          logOptions.path = service_.pathFilter;
          geogigService_.command(metadata.repoId, 'log', logOptions).then(function(response) {
            if (service_.fetchingHistory === false || thisTransaction != service_.historyTransaction) {
              // History was cleared, we don't want this data anymore
              deferredResponse.reject();
              return;
            }
            if (goog.isDefAndNotNull(response.commit)) {
              forEachArrayish(response.commit, function(commit) {
                var added = 0;
                var modified = 0;
                var removed = 0;
                if (goog.isDefAndNotNull(commit.adds)) {
                  added = commit.adds;
                }
                if (goog.isDefAndNotNull(commit.modifies)) {
                  modified = commit.modifies;
                }
                if (goog.isDefAndNotNull(commit.removes)) {
                  removed = commit.removes;
                }
                var totalChanges = added + removed + modified;
                if (totalChanges === 0 && goog.isArray(commit.parents.id) && commit.parents.id.length > 0) {
                  commit.visible = false;
                } else {
                  commit.visible = true;
                  if (totalChanges === 0) {
                    commit.summary = {
                      added: {width: '0%'},
                      modified: {width: '0%'},
                      removed: {width: '0%'}
                    };
                  } else {
                    commit.summary = {
                      added: {width: added / totalChanges * 100 + '%'},
                      modified: {width: modified / totalChanges * 100 + '%'},
                      removed: {width: removed / totalChanges * 100 + '%'}
                    };
                  }
                }
              });
              var numCommits = 0;
              if (goog.isArray(response.commit)) {
                if (refresh) {
                  // Insert the array at the beginning of the log
                  Array.prototype.splice.apply(service_.log, [0, 0].concat(response.commit));
                  numCommits = response.commit.length;
                } else {
                  service_.log = service_.log.concat(response.commit);
                }
              } else {
                if (refresh) {
                  service_.log.splice(0, 0, response.commit);
                  numCommits = 1;
                } else {
                  service_.log.push(response.commit);
                }
              }
              rootScope_.$broadcast('history_fetched');
              if (refresh) {
                rootScope_.$broadcast('history-refreshed', numCommits);
              } else {
                pulldownService_.showHistoryPanel();
              }
            }
            if (!refresh) {
              if (goog.isDefAndNotNull(response.nextPage)) {
                service_.nextPage = response.nextPage;
              } else {
                service_.nextPage = false;
              }
            }
            service_.fetchingHistory = false;
            deferredResponse.resolve(0);
          }, function(reject) {
            if (service_.fetchingHistory === false || thisTransaction != service_.historyTransaction) {
              // History was cleared, we don't want this data anymore
              deferredResponse.reject();
              return;
            }
            service_.fetchingHistory = false;
            console.log('History failed: ', reject);
            dialogService_.error(translate_.instant('error'), translate_.instant('history_failed'));
            deferredResponse.reject();
          });
        } else {
          deferredResponse.reject();
        }
      } else {
        deferredResponse.reject();
      }
    } else {
      deferredResponse.reject();
    }
    return deferredResponse.promise;
  }

  function getFirstParent(commit) {
    if (goog.isDefAndNotNull(commit.parents) && goog.isDefAndNotNull(commit.parents.id)) {
      if (goog.isArray(commit.parents.id)) {
        return commit.parents.id[0];
      } else {
        return commit.parents.id;
      }
    }
    return null;
  }

}());
