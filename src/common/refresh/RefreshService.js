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
        var layers = mapService.getLayers();
        forEachArrayish(layers, function(layer) {
          if (goog.isDefAndNotNull(layer.get('metadata').isGeoGit)) {
            if (layer.get('metadata').isGeoGit === true) {
              geogitService_.getCommitId(layer).then(function(idResponse) {
                if (idResponse === layer.get('metadata').repoCommitId) {
                  return;
                }
                var options = new GeoGitDiffOptions();
                options.oldRefSpec = layer.get('metadata').repoCommitId;
                options.newRefSpec = idResponse;
                options.showGeometryChanges = true;
                options.show = 1000;
                geogitService_.command(layer.get('metadata').repoId, 'diff', options).then(function(diffResponse) {
                  //this needs to be stored in a seperate var here so it doesn't get overwriten before it is needed
                  var oldCommitId = layer.get('metadata').repoCommitId;
                  layer.get('metadata').repoCommitId = idResponse;
                  if (!goog.isDefAndNotNull(diffResponse.Feature)) {
                    return;
                  }
                  if (goog.isDef(diffResponse.nextPage)) {
                    dialogService_.warn(translate_('warning'), translate_('too_many_changes_refresh', {value: 1000}));
                  }

                  //calculate how many were added, modded, or deleted
                  var added = 0, modified = 0, removed = 0;
                  var featureList = [];

                  forEachArrayish(diffResponse.Feature, function(feature) {
                    //check if the feature is in this layer, if not then skip it
                    if (feature.id.split('/')[0] === layer.get('metadata').nativeName) {
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
                    }
                  });

                  //if no features changed on this layer then we won't bother with a diff or notification
                  if (featureList.length !== 0) {
                    //formulate notification string
                    var notificationText = '';
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
                    notificationText += ' ' + translate_('in_lower_case') + ' ' + layer.get('metadata').title;

                    mapService.dumpTileCache(layer.get('metadata').uniqueID);
                    historyService_.refreshHistory(layer.get('metadata').uniqueID);

                    notificationService_.addNotification({
                      text: notificationText,
                      read: false,
                      type: 'loom-update-notification',
                      repos: [
                        {
                          name: layer.get('metadata').geogitStore,
                          features: featureList
                        }
                      ],
                      callback: function(feature) {
                        // check to see if there is a newer version of this feature
                        var logOptions = new GeoGitLogOptions();
                        logOptions.firstParentOnly = true;
                        logOptions.path = feature.original.id;
                        logOptions.show = 1;
                        logOptions.until = layer.get('metadata').branchName;
                        logOptions.since = idResponse;
                        var doFeatureDiff = function(commitId) {
                          featureDiffService_.undoable = true;
                          featureDiffService_.leftName = 'old';
                          featureDiffService_.rightName = 'new';
                          featureDiffService_.setFeature(
                              feature.original, oldCommitId,
                              commitId, oldCommitId,
                              null, layer.get('metadata').repoId);
                          $('#feature-diff-dialog').modal('show');
                        };
                        geogitService_.command(layer.get('metadata').repoId, 'log', logOptions)
                            .then(function(response) {
                              if (goog.isDefAndNotNull(response.commit)) {
                                dialogService_.warn(translate_('warning'), translate_('newer_feature_version'),
                                    [translate_('yes_btn'), translate_('no_btn')], false).then(function(button) {
                                  switch (button) {
                                    case 0:
                                      doFeatureDiff(response.commit.id);
                                      break;
                                    case 1:
                                      doFeatureDiff(idResponse);
                                      break;
                                  }
                                });
                              } else {
                                doFeatureDiff(idResponse);
                              }
                            }, function(reject) {
                            });
                      }
                    });
                  }
                });
              });
            }
          }
        });

        setTimeout(function() {
          refresh(mapService);
        }, 60000);
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
