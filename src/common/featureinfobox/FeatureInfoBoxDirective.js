
(function() {
  var module = angular.module('loom_feature_info_box_directive', []);

  module.directive('loomFeatureInfoBox',
      function(featureInfoBoxService) {
        //console.log('---- loom_feature_info_box_directive');

        return {
          replace: false,
          restrict: 'A',
          templateUrl: 'featureinfobox/partial/featureinfobox.tpl.html',
          link: function(scope, element, attrs) {
            scope.featureInfoBoxService = featureInfoBoxService;

            scope.editFeature = function() {
              scope.$broadcast('editFeature', featureInfoBoxService.getSelectedItem(),
                  featureInfoBoxService.getSelectedItemProperties());
            };

            scope.$on('feature-info-click', function() {
              scope.$apply(function() {
                scope.featureInfoBoxService = featureInfoBoxService;
              });
            });
          }
        };
      }
  );
})();
