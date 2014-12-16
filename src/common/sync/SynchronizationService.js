(function() {
  var module = angular.module('loom_sync_service', []);

  // Private Variables
  var synchronizationLinks_ = [];
  var nextLinkId_ = 0;
  var service_ = null;
  var dialogService_ = null;
  var rootScope_ = null;
  var geogigService_ = null;
  var historyService_ = null;
  var q_ = null;
  var translate_ = null;
  var conflictService_ = null;
  var configService_ = null;
  var timeout_ = null;
  var syncing = false;
  var numSyncingLinks = 0;
  var syncTimeout = null;
  var statusCheckTimeout = null;
  var syncInterval = 30000; // In milliseconds

  var maxPullFails = 20;
  var numPullFails = 0;
  var errorMessageOn = false;

  var autoSync = function() {
    var time = new Date().getTime();
    var success = function(syncedLink) {
      syncedLink.timeStamp = new Date().getTime() + syncedLink.syncInterval;
      synchronizationLinks_.sort(function(a, b) {return a.timeStamp - b.timeStamp;});
      if (syncTimeout !== null) {
        syncTimeout = timeout_(autoSync, syncInterval);
      }
    };
    var error = function(error) {
      if (syncTimeout !== null && goog.isDefAndNotNull(error) && error !== false) {
        syncTimeout = timeout_(autoSync, syncInterval);
      }
    };
    for (var index = 0; index < synchronizationLinks_.length; index++) {
      var link = synchronizationLinks_[index];
      if (link.isSyncing && link.continuous) {
        if (!syncing) {
          if (link.timeStamp <= time) {
            service_.sync(link).then(success, error);
          } else {
            syncTimeout = timeout_(autoSync, syncInterval);
          }
        }
        break;
      }
    }
  };

  var checkStatus = function(link) {
    var remoteOptions = new GeoGigRemoteOptions();
    remoteOptions.remoteName = link.getRemote().name;
    remoteOptions.ping = true;
    geogigService_.command(link.getRepo().id, 'remote', remoteOptions).then(function(response) {
      link.getRemote().active = response.ping.success;
    }, function() {
      link.getRemote().active = false;
    });
  };

  var checkStatusAll = function() {
    // TODO: Fix the remote response from the web-api so we can check the manifest using the remote url instead fetch
    for (var index = 0; index < synchronizationLinks_.length; index++) {
      checkStatus(synchronizationLinks_[index]);
    }
    statusCheckTimeout = timeout_(checkStatusAll, 60000);
  };

  module.provider('synchronizationService', function() {
    this.$get = function($timeout, $rootScope, $q, $translate, dialogService, historyService,
                         geogigService, conflictService, configService) {
      dialogService_ = dialogService;
      service_ = this;
      rootScope_ = $rootScope;
      geogigService_ = geogigService;
      historyService_ = historyService;
      conflictService_ = conflictService;
      translate_ = $translate;
      configService_ = configService;
      timeout_ = $timeout;
      q_ = $q;
      $rootScope.$on('repoRemoved', function(event, repo) {
        var linksToRemove = [];
        if (repo.unique === true) {
          goog.array.forEach(synchronizationLinks_, function(link) {
            if (link.getRepo().uniqueId === repo.uniqueId) {
              linksToRemove.push(link.id);
            }
          });
          for (var index = 0; index < linksToRemove.length; index++) {
            service_.removeLink(linksToRemove[index]);
          }
        }
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
        if (synchronizationLinks_[index].equals(link) || link.name === synchronizationLinks_[index].name) {
          dialogService_.open(translate_.instant('add_sync'), translate_.instant('link_already_exists'),
              [translate_.instant('btn_ok')], false);
          return;
        }
      }
      link.id = nextLinkId_;
      nextLinkId_++;
      synchronizationLinks_.push(link);
      checkStatus(link);
      if (!statusCheckTimeout) {
        statusCheckTimeout = timeout_(checkStatusAll, 60000);
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

    this.remoteRemoved = function(repo, remote) {
      var linksToRemove = [];
      goog.array.forEach(synchronizationLinks_, function(link) {
        if (link.getRepo().id === repo.id && link.getRemote().name === remote.name) {
          linksToRemove.push(link.id);
        }
      });
      for (var index = 0; index < linksToRemove.length; index++) {
        service_.removeLink(linksToRemove[index]);
      }
    };

    this.getIsSyncing = function() {
      return syncing;
    };

    this.toggleAutoSync = function(link) {
      if (!link.singleSync) {
        link.isSyncing = !link.isSyncing;
        if (link.isSyncing) {
          link.continuous = true;
          numSyncingLinks++;
          if (!syncTimeout) {
            syncTimeout = timeout_(autoSync, syncInterval);
          }
        } else {
          link.continuous = false;
          numSyncingLinks--;
          if (numSyncingLinks <= 0) {
            clearTimeout(syncTimeout);
            syncTimeout = null;
          }
        }
      }
    };

    this.sync = function(link) {
      var result = q_.defer();
      syncing = true;
      geogigService_.beginTransaction(link.getRepo().id).then(function(transaction) {
        var pullOptions = new GeoGigPullOptions();
        pullOptions.ref = link.getRemoteBranch() + ':' + link.getLocalBranch();
        pullOptions.remoteName = link.getRemote().name;
        pullOptions.authorName = configService_.configuration.userprofilename;
        pullOptions.authorEmail = configService_.configuration.userprofileemail;
        transaction.command('pull', pullOptions).then(function(pullResult) {
          numPullFails = 0;
          var pushOptions = new GeoGigPushOptions();
          pushOptions.ref = link.getLocalBranch() + ':' + link.getRemoteBranch();
          pushOptions.remoteName = link.getRemote().name;
          console.log(pushOptions);
          transaction.command('push', pushOptions).then(function() {
            transaction.finalize().then(function() {
              syncing = false;
              historyService_.refreshHistory();
              result.resolve(link);
            }, function(endTransactionFailed) {
              // TODO: Check for endTransaction conflicts
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
          var showMessage = false;
          var message = '';
          if (goog.isObject(pullFailed) && pullFailed.status === 502) {
            if (link.continuous) {
              service_.toggleAutoSync(link);
              showMessage = true;
              message = 'pull_timeout_error';
            }
          }
          if (goog.isObject(pullFailed) && goog.isDefAndNotNull(pullFailed.conflicts)) {
            var branch = link.getRemote().name + '/' + link.getRemoteBranch();
            link.isSyncing = false;
            handleConflicts(pullFailed, transaction, link.getRepo().id, translate_.instant('local'),
                link.getRemote().name, branch);
            result.reject(false);
          } else {
            if (!errorMessageOn) {
              if (link.continuous) {
                numPullFails++;
                if (numPullFails >= maxPullFails) {
                  showMessage = true;
                  message = 'pull_multiple_error';
                }
              } else if (message === '') {
                showMessage = true;
                message = 'pull_unknown_error';
              }
            }
            if (showMessage) {
              errorMessageOn = true;
              dialogService_.error(translate_.instant('error'), translate_.instant(message),
                  [translate_.instant('btn_ok')], false).then(function(button) {
                switch (button) {
                  case 0:
                    errorMessageOn = false;
                    numPullFails = 0;
                }
              });
            }
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
    var myDialog = dialogService_.warn(translate_.instant('pull_conflicts'),
        translate_.instant('conflicts_encountered'),
        [translate_.instant('abort'), translate_.instant('resolve_conflicts')], false);

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
          syncing = false;
          break;
      }
    });
  }

}());
