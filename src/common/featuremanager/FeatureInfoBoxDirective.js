
(function() {
  var module = angular.module('loom_feature_info_box_directive', []);

  module.directive('loomFeatureInfoBox',
      function($translate, featureManagerService, mapService, historyService, dialogService, tableViewService) {
        //console.log('---- loom_feature_info_box_directive');

        return {
          replace: false,
          restrict: 'A',
          templateUrl: 'featuremanager/partial/featureinfobox.tpl.html',
          link: function(scope) {
            scope.featureManagerService = featureManagerService;
            scope.mapService = mapService;
            scope.loadingHistory = false;
            scope.deletingFeature = false;

            scope.$on('feature-info-click', function() {
              scope.$apply(function() {
                scope.featureManagerService = featureManagerService;
              });
            });

            scope.isShowingAttributes = function() {
              var schema = featureManagerService.getSelectedLayer().get('metadata').schema;
              var properties = featureManagerService.getSelectedItemProperties();
              for (var index = 0; index < properties.length; index++) {
                if (schema[properties[index][0]].visible) {
                  return true;
                }
              }
              return false;
            };

            scope.showFeatureHistory = function() {
              if (!scope.loadingHistory) {
                var layer = featureManagerService.getSelectedLayer();
                if (goog.isDefAndNotNull(layer)) {
                  var metadata = layer.get('metadata');
                  if (goog.isDefAndNotNull(metadata)) {
                    if (goog.isDefAndNotNull(metadata.isGeoGit) && metadata.isGeoGit) {
                      var nativeLayer = metadata.nativeName;
                      var featureId = featureManagerService.getSelectedItem().id;
                      var fid = nativeLayer + '/' + featureId;
                      scope.loadingHistory = true;
                      historyService.setTitle($translate('history_for', {value: featureId}));
                      var promise = historyService.getHistory(layer, fid);
                      if (goog.isDefAndNotNull(promise)) {
                        promise.then(function() {
                          scope.loadingHistory = false;
                        }, function() {
                          scope.loadingHistory = false;
                        });
                      } else {
                        scope.loadingHistory = false;
                      }
                    }
                  }
                }
              }
            };

            scope.deleteFeature = function() {
              if (!scope.deletingFeature) {
                dialogService.warn($translate('delete_feature'), $translate('sure_delete_feature'),
                    [$translate('yes_btn'), $translate('no_btn')], false).then(function(button) {
                  switch (button) {
                    case 0:
                      scope.deletingFeature = true;
                      featureManagerService.deleteFeature().then(function(resolve) {
                        scope.deletingFeature = false;
                      }, function(reject) {
                        scope.deletingFeature = false;
                        dialogService.error($translate('error'),
                            $translate('unable_to_delete_feature', {value: reject}),
                            [$translate('btn_ok')], false);
                      });
                      break;
                    case 1:
                      break;
                  }
                });
              }
            };

            scope.showTable = function(layer) {
              layer.get('metadata').loadingTable = true;
              tableViewService.showTable(layer, featureManagerService.getSelectedItem()).then(function() {
                layer.get('metadata').loadingTable = false;
                featureManagerService.hide();
                $('#table-view-window').modal('show');
              }, function() {
                layer.get('metadata').loadingTable = false;
                dialogService.error($translate('show_table'), $translate('show_table_failed'));
              });
            };

            scope.isLoadingTable = function(layer) {
              var loadingTable = layer.get('metadata').loadingTable;
              return goog.isDefAndNotNull(loadingTable) && loadingTable === true;
            };
          }
        };
      }
  );
})();
