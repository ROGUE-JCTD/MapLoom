(function() {
  var module = angular.module('loom_sync_service', []);

  // Private Variables
  var synchronizationLinks_ = [];
  var nextLinkId_ = 0;
  var service_ = null;
  var dialogService_ = null;
  var rootScope_ = null;
  var geogitService_ = null;
  var q_ = null;
  var translate_ = null;
  var conflictService_ = null;
  var configService_ = null;
  var syncing = false;
  var numSyncingLinks = 0;
  var syncTimeout = null;
  var statusCheckTimeout = null;
  var syncInterval = 15000; // In milliseconds

  var autoSync = function() {
    var time = new Date().getTime();
    var success = function(syncedLink) {
      syncedLink.timeStamp = new Date().getTime() + syncedLink.syncInterval;
      synchronizationLinks_.sort(function(a, b) {return a.timeStamp - b.timeStamp;});
      if (syncTimeout !== null) {
        syncTimeout = setTimeout(autoSync, syncInterval);
      }
    };
    var error = function(error) {
      if (syncTimeout !== null) {
        syncTimeout = setTimeout(autoSync, syncInterval);
      }
    };
    for (var index = 0; index < synchronizationLinks_.length; index++) {
      var link = synchronizationLinks_[index];
      if (link.isSyncing && link.continuous) {
        if (!syncing) {
          if (link.timeStamp <= time) {
            service_.sync(link).then(success, error);
          } else {
            syncTimeout = setTimeout(autoSync, syncInterval);
          }
        }
        break;
      }
    }
  };

  var checkStatus = function(link) {
    geogitService_.beginTransaction(link.getRepo().id).then(function(transaction) {
      var fetchOptions = new GeoGitFetchOptions();
      fetchOptions.remote = link.getRemote().name;
      transaction.command('fetch', fetchOptions).then(function() {
        link.getRemote().active = true;
        transaction.abort();
      }, function() {
        link.getRemote().active = false;
        transaction.abort();
      });
    });
  };

  var checkStatusAll = function() {
    // TODO: Fix the remote response from the web-api so we can check the manifest using the remote url instead fetch
    for (var index = 0; index < synchronizationLinks_.length; index++) {
      checkStatus(synchronizationLinks_[index]);
    }
    statusCheckTimeout = setTimeout(checkStatusAll, 60000);
  };

  module.provider('synchronizationService', function() {
    this.$get = function($rootScope, $q, $translate, dialogService, geogitService, conflictService, configService) {
      dialogService_ = dialogService;
      service_ = this;
      rootScope_ = $rootScope;
      geogitService_ = geogitService;
      conflictService_ = conflictService;
      translate_ = $translate;
      configService_ = configService;
      q_ = $q;
      $rootScope.$on('repoRemoved', function(event, repo) {
        goog.array.forEach(synchronizationLinks_, function(link) {
          if (link.getRepo().id === repo.id) {
            service_.removeLink(link.id);
          }
        });
      });
      return this;
    };

    this.getLinks = function() {
      return synchronizationLinks_;
    };

    this.loadLink = function(index) {
      rootScope_.$broadcast('loadLink', synchronizationLinks_[index]);
    };

    this.addLink = function(link) {
      for (var index = 0; index < synchronizationLinks_.length; index++) {
        if (synchronizationLinks_[index].equals(link)) {
          dialogService_.open(translate_('add_sync'), translate_('link_already_exists'), [translate_('btn_ok')], false);
          return;
        }
      }
      link.id = nextLinkId_;
      nextLinkId_++;
      synchronizationLinks_.push(link);
      if (!statusCheckTimeout) {
        statusCheckTimeout = setTimeout(checkStatusAll, 60000);
      }
    };

    this.removeLink = function(id) {
      var index = -1, i;
      for (i = 0; i < synchronizationLinks_.length; i = i + 1) {
        if (synchronizationLinks_[i].id === id) {
          index = i;
        }
      }
      if (index > -1) {
        synchronizationLinks_.splice(index, 1);
        if (synchronizationLinks_.length <= 0) {
          clearTimeout(statusCheckTimeout);
          statusCheckTimeout = null;
        }
      }
    };

    this.getIsSyncing = function() {
      return syncing;
    };

    this.toggleAutoSync = function(link) {
      link.isSyncing = !link.isSyncing;
      if (link.isSyncing) {
        numSyncingLinks++;
        if (!syncTimeout) {
          syncTimeout = setTimeout(autoSync, syncInterval);
        }
      } else {
        numSyncingLinks--;
        if (numSyncingLinks <= 0) {
          clearTimeout(syncTimeout);
          syncTimeout = null;
        }
      }
    };

    this.sync = function(link) {
      var result = q_.defer();
      syncing = true;
      geogitService_.beginTransaction(link.getRepo().id).then(function(transaction) {
        var pullOptions = new GeoGitPullOptions();
        pullOptions.ref = link.getRemoteBranch() + ':' + link.getLocalBranch();
        pullOptions.remoteName = link.getRemote().name;
        pullOptions.authorName = configService_.configuration.userprofilename;
        pullOptions.authorEmail = configService_.configuration.userprofileemail;
        transaction.command('pull', pullOptions).then(function(pullResult) {
          var pushOptions = new GeoGitPushOptions();
          pushOptions.ref = link.getLocalBranch() + ':' + link.getRemoteBranch();
          pushOptions.remoteName = link.getRemote().name;
          console.log(pushOptions);
          transaction.command('push', pushOptions).then(function() {
            transaction.finalize().then(function() {
              syncing = false;
              result.resolve(link);
            }, function(endTransactionFailed) {
              syncing = false;
              result.reject(endTransactionFailed);
              transaction.abort();
            });
          }, function(pushFailed) {
            syncing = false;
            result.reject(pushFailed);
            transaction.abort();
          });
        }, function(pullFailed) {
          if (goog.isObject(pullFailed) && goog.isDefAndNotNull(pullFailed.conflicts)) {
            var branch = link.getRemote().name + '/' + link.getRemoteBranch();
            handleConflicts(pullFailed, transaction, link.getRepo().id, translate_('local'),
                link.getRemote().name, branch);
          } else {
            dialogService_.error(translate_('error'), translate_('pull_unknown_error'));
            syncing = false;
            result.reject(pullFailed);
            transaction.abort();
            console.log('ERROR: Pull failure: ', pullOptions, pullFailed);
          }
        });
      }, function(beginTransactionFailed) {
        syncing = false;
        result.reject(beginTransactionFailed);
      });
      return result.promise;
    };
  });

  function handleConflicts(mergeFailure, transaction, repoId, ourName, theirName, mergeBranch) {
    var myDialog = dialogService_.warn(translate_('pull_conflicts'), translate_('conflicts_encountered'),
        [translate_('abort'), translate_('resolve_conflicts')], false);

    myDialog.then(function(button) {
      switch (button) {
        case 0:
          syncing = false;
          transaction.abort();
          break;
        case 1:
          conflictService_.ourName = ourName;
          conflictService_.theirName = theirName;
          conflictService_.ours = mergeFailure.ours;
          conflictService_.theirs = mergeFailure.theirs;
          conflictService_.ancestor = mergeFailure.ancestor;
          conflictService_.features = mergeFailure.Feature;
          conflictService_.repoId = repoId;
          conflictService_.transaction = transaction;
          conflictService_.mergeBranch = mergeBranch;
          conflictService_.beginResolution();
          break;
      }
    });
  }

}());
