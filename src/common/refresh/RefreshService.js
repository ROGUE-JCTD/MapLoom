(function() {
  var module = angular.module('loom_refresh_service', []);

  var mapService_ = null;
  var dialogService_ = null;
  var historyService_ = null;
  var translate_ = null;
  var notificationService_ = null;
  var geogitService_ = null;
  var featureDiffService_ = null;
  var service_ = null;

  module.provider('refreshService', function() {
    this.$get = function(mapService, $translate, notificationService, geogitService, historyService,
        dialogService, featureDiffService) {
      mapService_ = mapService;
      notificationService_ = notificationService;
      geogitService_ = geogitService;
      historyService_ = historyService;
      dialogService_ = dialogService;
      translate_ = $translate;
      featureDiffService_ = featureDiffService;

      service_ = this;

      //this is called here to turn refresh on by default
      this.refreshLayers();

      return this;
    };

    this.autoRefresh = false;

    //recursive helper function for refreshLayers
    function refresh(mapService) {
      if (service_.autoRefresh) {
        var refreshed = {};
        var notRefreshed = {};
        var layers = mapService.getLayers();
        var refreshTimeout = 60000;

        if (!goog.isDefAndNotNull(layers)) {
          setTimeout(function() {
            refresh(mapService);
          }, refreshTimeout);
          return;
        }
        if (!goog.isArray(layers)) {
          layers = [layers];
        }
        if (layers.length < 1) {
          setTimeout(function() {
            refresh(mapService);
          }, refreshTimeout);
          return;
        }

        var doDiff = function(repoChange, metadata) {
          var options = new GeoGitDiffOptions();
          options.oldRefSpec = repoChange.oldId;
          options.newRefSpec = repoChange.newId;
          options.showGeometryChanges = true;
          options.show = 50;
          options.pathFilter = metadata.nativeName;
          geogitService_.command(repoChange.repoid, 'diff', options).then(function(diffResponse) {
            if (!goog.isDefAndNotNull(diffResponse.Feature)) {
              return;
            }
            var notificationText = '';
            var featureList = null;
            if (goog.isDef(diffResponse.nextPage)) {
              notificationText = metadata.title;
            } else {
              //calculate how many were added, modded, or deleted
              var added = 0, modified = 0, removed = 0;
              featureList = [];

              forEachArrayish(diffResponse.Feature, function(feature) {
                //check if the feature is in this layer, if not then skip it
                featureList.push(feature);

                switch (feature.change) {
                  case 'ADDED':
                    added++;
                    break;
                  case 'MODIFIED':
                    modified++;
                    break;
                  case 'REMOVED':
                    removed++;
                    break;
                }
              });

              //if no features changed on this layer then we won't bother with a diff or notification
              if (featureList.length !== 0) {
                //formulate notification string
                notificationText = '';
                if (added > 0) {
                  notificationText += added + ' ' + translate_('added');

                  if (modified > 0 || removed > 0) {
                    notificationText += ', ';
                  }
                }
                if (modified > 0) {
                  notificationText += modified + ' ' + translate_('modified');

                  if (removed > 0) {
                    notificationText += ', ';
                  }
                }
                if (removed > 0) {
                  notificationText += removed + ' ' + translate_('removed');
                }
                notificationText += ' ' + translate_('in_lower_case') + ' ' + metadata.title;
              } else {
                featureList = null;
              }
            }

            mapService.dumpTileCache(metadata.uniqueID);
            historyService_.refreshHistory(metadata.uniqueID);

            notificationService_.addNotification({
              text: notificationText,
              read: false,
              type: 'loom-update-notification',
              emptyMessage: translate_('too_many_changes_refresh', {value: 50}),
              repos: [
                {
                  name: metadata.geogitStore,
                  features: featureList
                }
              ],
              callback: function(feature) {
                // check to see if there is a newer version of this feature
                var logOptions = new GeoGitLogOptions();
                logOptions.firstParentOnly = true;
                logOptions.path = feature.original.id;
                logOptions.show = 1;
                logOptions.until = metadata.branchName;
                logOptions.since = repoChange.newId;
                var doFeatureDiff = function(commitId) {
                  featureDiffService_.undoable = true;
                  featureDiffService_.leftName = 'old';
                  featureDiffService_.rightName = 'new';
                  featureDiffService_.setFeature(
                      feature.original, repoChange.oldId,
                      commitId, repoChange.oldId,
                      null, repoChange.repoid);
                  $('#feature-diff-dialog').modal('show');
                };
                geogitService_.command(metadata.repoId, 'log', logOptions)
                    .then(function(response) {
                      if (goog.isDefAndNotNull(response.commit)) {
                        dialogService_.warn(translate_('warning'), translate_('newer_feature_version'),
                            [translate_('yes_btn'), translate_('no_btn')], false).then(function(button) {
                          switch (button) {
                            case 0:
                              doFeatureDiff(response.commit.id);
                              break;
                            case 1:
                              doFeatureDiff(repoChange.newId);
                              break;
                          }
                        });
                      } else {
                        doFeatureDiff(repoChange.newId);
                      }
                    }, function(reject) {
                    });
              }
            });
          });
        };

        var processLayer = function(layer, nextIndex) {
          var nextLayer = function(idx) {
            if (layers.length > idx) {
              processLayer(layers[idx], idx + 1);
            } else {
              setTimeout(function() {
                refresh(mapService);
              }, refreshTimeout);
            }
          };
          var metadata = layer.get('metadata');
          if (goog.isDefAndNotNull(metadata.isGeoGit) && metadata.isGeoGit === true) {
            if (goog.isDefAndNotNull(refreshed[metadata.repoId])) {
              doDiff(refreshed[metadata.repoId], metadata);
              nextLayer(nextIndex);
            } else if (!goog.isDefAndNotNull(notRefreshed[metadata.repoId])) {
              geogitService_.commitChanged(metadata.repoId).then(function(response) {
                if (response.changed === true) {
                  refreshed[metadata.repoId] = response;
                  doDiff(response, metadata);
                } else {
                  notRefreshed[metadata.repoId] = response;
                }
                nextLayer(nextIndex);
              }, function() {
                nextLayer(nextIndex);
              });
            } else {
              nextLayer(nextIndex);
            }
          }
        };
        processLayer(layers[0], 1);
      }
    }

    this.refreshLayers = function() {
      this.autoRefresh = !this.autoRefresh;

      if (this.autoRefresh) {
        refresh(mapService_);
      }
    };
  });
}());
