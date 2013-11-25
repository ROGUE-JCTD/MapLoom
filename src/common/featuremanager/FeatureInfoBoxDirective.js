
(function() {
  var module = angular.module('loom_feature_info_box_directive', []);

  module.directive('loomFeatureInfoBox',
      function(featureManagerService, mapService) {
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
          }
        };
      }
  );
})();
