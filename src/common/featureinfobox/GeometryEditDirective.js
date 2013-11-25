(function() {

  var module = angular.module('loom_geometry_edit_directive', []);

  module.directive('loomGeometryEdit',
      function(mapService, featureInfoBoxService) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'featureinfobox/partial/geometryedit.tpl.html',
          link: function(scope) {
            scope.mapService = mapService;
            scope.featureInfoBoxService = featureInfoBoxService;
            scope.panelOpen = false;
            var expandPanel = function() {
              if (scope.panelOpen === false) {
                scope.panelOpen = true;
                angular.element('#geometry-edit-container').collapse('show');
              } else {
                angular.element('#geometry-edit-container').collapse('hide');
                scope.panelOpen = false;
              }
            };
            scope.$on('startGeometryEdit', expandPanel);
            scope.$on('endGeometryEdit', expandPanel);
          }
        };
      }
  );
})();
