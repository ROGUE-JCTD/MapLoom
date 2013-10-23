
(function() {
  var module = angular.module('loom_feature_info_box_directive', []);

  module.directive('loomFeatureInfoBox',
      function(featureInfoBoxService, mapService) {
        //console.log('---- loom_feature_info_box_directive');

        return {
          replace: false,
          restrict: 'A',
          templateUrl: 'featureinfobox/partial/featureinfobox.tpl.html',
          link: function(scope, element, attrs) {
            scope.featureInfoBoxService = featureInfoBoxService;

            scope.$watch('featureInfoBoxService.getMode()', function() {
              scope.featureInfoBoxService = featureInfoBoxService;
            });
          }
        };
      }
  );
})();

