
(function() {
  var module = angular.module('loom_feature_info_box_directive', []);

  module.directive('loomFeatureInfoBox',
      function($translate, featureManagerService, mapService, historyService, dialogService) {
        //console.log('---- loom_feature_info_box_directive');

        return {
          replace: false,
          restrict: 'A',
          templateUrl: 'featuremanager/partial/featureinfobox.tpl.html',
          link: function(scope) {
            scope.featureManagerService = featureManagerService;
            scope.mapService = mapService;
            scope.loadingHistory = false;

            scope.$on('feature-info-click', function() {
              scope.$apply(function() {
                scope.featureManagerService = featureManagerService;
              });
            });

            scope.showFeatureHistory = function() {
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
            };

            scope.deleteFeature = function() {
              dialogService.warn($translate('delete_feature'), $translate('sure_delete_feature'),
                  [$translate('yes_btn'), $translate('no_btn')], false).then(function(button) {
                switch (button) {
                  case 0:
                    featureManagerService.deleteFeature();
                    break;
                  case 1:
                    break;
                }
              });
            };
          }
        };
      }
  );
})();
