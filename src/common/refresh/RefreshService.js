(function() {
  var module = angular.module('loom_refresh_service', []);

  var mapService_ = null;
  var dialogService_ = null;
  var translate_ = null;
  var notificationService_ = null;
  var geogitService_ = null;
  var featureDiffService_ = null;
  var service_ = null;

  module.provider('refreshService', function() {
    this.$get = function(mapService, $translate, notificationService, geogitService,
        dialogService, featureDiffService) {
      mapService_ = mapService;
      notificationService_ = notificationService;
      geogitService_ = geogitService;
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
        mapService.dumpTileCache();
        var layers = mapService.getFeatureLayers();
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
                  var fidlist = [];

                  forEachArrayish(diffResponse.Feature, function(feature) {
                    //check if the feature is in this layer, if not then skip it
                    if (feature.id.split('/')[0] === layer.get('metadata').label) {
                      if (goog.array.contains(fidlist, feature.id)) {
                        console.log('Duplicate features detected: ', options, diffResponse);
                      } else {
                        fidlist.push(feature.id);
                      }

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
                    notificationText += ' ' + translate_('in_lower_case') + ' ' + layer.get('metadata').label;

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
                        featureDiffService_.leftName = 'old';
                        featureDiffService_.rightName = 'new';
                        featureDiffService_.setFeature(
                            feature.original, oldCommitId,
                            idResponse, oldCommitId,
                            null, layer.get('metadata').repoId);
                        $('#feature-diff-dialog').modal('show');
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
