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
    this.entriesPerPage = 10;
    this.layer = null;
    this.repoId = null;
    this.pathFilter = null;
    this.fetchingHistory = false;
    this.historyTransaction = 0;

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
      if (service_.fetchingHistory === false) {
        service_.historyTransaction++;
        service_.clearHistory();
        service_.fetchingHistory = true;
        service_.pathFilter = pathFilter;
        if (goog.isDefAndNotNull(layer)) {
          service_.layer = layer;
        }
        getHistoryInternal();
      }
    };

    this.getMoreHistory = function() {
      if (service_.fetchingHistory === false) {
        service_.fetchingHistory = true;
        service_.currentPage++;
        getHistoryInternal();
      }
    };

    this.clearHistory = function() {
      service_.fetchingHistory = false;
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
      logOptions.summarize = true;
      var thisTransaction = service_.historyTransaction;
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
            if (service_.fetchingHistory === false || thisTransaction != service_.historyTransaction) {
              // History was cleared, we don't want this data anymore
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
                commit.summary = {
                  added: {width: added / totalChanges * 100 + '%'},
                  modified: {width: modified / totalChanges * 100 + '%'},
                  removed: {width: removed / totalChanges * 100 + '%'}
                };
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
            service_.fetchingHistory = false;
          }, function(reject) {
            if (service_.fetchingHistory === false || thisTransaction != service_.historyTransaction) {
              // History was cleared, we don't want this data anymore
              return;
            }
            service_.fetchingHistory = false;
            console.log('History failed: ', reject);
            dialogService_.error(translate_('error'), translate_('history_failed'));
          });
        }
      }
    }
  }

}());
