
(function() {
  var module = angular.module('loom_feature_info_box_directive', []);

  module.directive('loomFeatureInfoBox',
      function(featureManagerService, mapService, historyService, dialogService) {
        //console.log('---- loom_feature_info_box_directive');

        return {
          replace: false,
          restrict: 'A',
          templateUrl: 'featuremanager/partial/featureinfobox.tpl.html',
          link: function(scope) {
            scope.featureManagerService = featureManagerService;
            scope.mapService = mapService;

            scope.$on('feature-info-click', function() {
              scope.$apply(function() {
                scope.featureManagerService = featureManagerService;
              });
            });

            scope.showFeatureHistory = function() {
              var layer = featureManagerService.getSelectedItemLayer();
              if (goog.isDefAndNotNull(layer.layer)) {
                layer = layer.layer;
                var metadata = layer.get('metadata');
                if (goog.isDefAndNotNull(metadata)) {
                  if (goog.isDefAndNotNull(metadata.isGeoGit) && metadata.isGeoGit) {
                    var nativeLayer = metadata.nativeName;
                    var featureId = featureManagerService.getSelectedItem().id;
                    var fid = nativeLayer + '/' + featureId;
                    historyService.setTitle('History for ' + featureId);
                    historyService.getHistory(layer, fid);
                  }
                }
              }
            };

            scope.deleteFeature = function() {
              dialogService.warn('Delete Feature', 'Are you sure you want to delete this feature?',
                  ['Yes', 'No'], false).then(function(button) {
                switch (button) {
                  case 'Yes':
                    featureManagerService.deleteFeature();
                    break;
                  case 'No':
                    break;
                }
              });
            };
          }
        };
      }
  );
})();
