(function() {
  var module = angular.module('loom_history_service', []);

  // Private Variables
  var rootScope_ = null;
  var service_ = null;
  var geogitService_ = null;
  var pulldownService_ = null;
  var dialogService_ = null;
  var translate_ = null;

  module.provider('historyService', function() {
    this.log = [];
    this.title = 'History';
    this.currentPage = 0;
    this.nextPage = false;
    this.entriesPerPage = 30;
    this.layer = null;
    this.repoId = null;
    this.pathFilter = null;

    this.$get = function($rootScope, $translate, geogitService, pulldownService, dialogService) {
      rootScope_ = $rootScope;
      service_ = this;
      geogitService_ = geogitService;
      pulldownService_ = pulldownService;
      dialogService_ = dialogService;
      translate_ = $translate;
      return this;
    };

    this.getHistory = function(layer, pathFilter) {
      service_.clearHistory();
      service_.pathFilter = pathFilter;
      if (goog.isDefAndNotNull(layer)) {
        service_.layer = layer;
      }
      getHistoryInternal();
    };

    this.getMoreHistory = function() {
      service_.currentPage++;
      getHistoryInternal();
    };

    this.clearHistory = function() {
      service_.log = [];
      service_.currentPage = 0;
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

  function getHistoryInternal() {
    if (goog.isDefAndNotNull(service_.layer)) {
      var logOptions = new GeoGitLogOptions();
      logOptions.show = service_.entriesPerPage;
      logOptions.page = service_.currentPage;
      logOptions.firstParentOnly = 'true';
      var metadata = service_.layer.get('metadata');
      if (goog.isDefAndNotNull(metadata)) {
        if (goog.isDefAndNotNull(metadata.branchName)) {
          logOptions.until = metadata.branchName;
        }
        if (goog.isDefAndNotNull(metadata.repoId) && goog.isDefAndNotNull(metadata.nativeName)) {
          service_.repoId = metadata.repoId;
          if (!goog.isDefAndNotNull(service_.pathFilter)) {
            service_.pathFilter = metadata.nativeName;
          }
          logOptions.path = service_.pathFilter;
          geogitService_.command(metadata.repoId, 'log', logOptions).then(function(response) {
            if (goog.isDefAndNotNull(response.commit)) {
              forEachArrayish(response.commit, function(commit) {
                var json = null;
                try {
                  var message = commit.message.replace(/&quot;/g, '"');
                  json = JSON.parse(message);
                  var added = json[metadata.nativeName]['added'];
                  var removed = json[metadata.nativeName]['removed'];
                  var modified = json[metadata.nativeName]['modified'];
                  if (!goog.isDefAndNotNull(added)) {
                    added = 0;
                  }
                  if (!goog.isDefAndNotNull(removed)) {
                    removed = 0;
                  }
                  if (!goog.isDefAndNotNull(modified)) {
                    modified = 0;
                  }
                  var totalChanges = added + removed + modified;
                  commit.summary = {
                    added: {width: added / totalChanges * 100 + '%'},
                    modified: {width: modified / totalChanges * 100 + '%'},
                    removed: {width: removed / totalChanges * 100 + '%'}
                  };

                } catch (e) {
                  // Generate random summaries for commits that don't have one. (Debug purposes)
                  /*var max = 5;
                  var min = 0;
                  var added = Math.floor(Math.random() * (max - min + 1)) + min;
                  var modified = Math.floor(Math.random() * (max - min + 1)) + min;
                  var removed = Math.floor(Math.random() * (max - min + 1)) + min;
                  var totalChanges = added + removed + modified;
                  commit.summary = {
                    added: {width: added / totalChanges * 100 + '%'},
                    modified: {width: modified / totalChanges * 100 + '%'},
                    removed: {width: removed / totalChanges * 100 + '%'}
                  };*/
                }
              });
              if (goog.isArray(response.commit)) {
                service_.log = service_.log.concat(response.commit);
              } else {
                service_.log.push(response.commit);
              }
              pulldownService_.showHistoryPanel();
              rootScope_.$broadcast('history_fetched');
            }
            if (goog.isDefAndNotNull(response.nextPage)) {
              service_.nextPage = response.nextPage;
            } else {
              service_.nextPage = false;
            }
          }, function(reject) {
            console.log('History failed: ', reject);
            dialogService_.error(translate_('error'), translate_('history_failed'));
          });
        }
      }
    }
  }

}());
