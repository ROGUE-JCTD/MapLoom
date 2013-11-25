(function() {

  var module = angular.module('loom_attribute_edit_directive', []);

  module.directive('loomAttributeEdit',
      function(featureManagerService) {
        return {
          restrict: 'C',
          templateUrl: 'featuremanager/partial/attributeedit.tpl.html',
          link: function(scope, element) {
            scope.featureManagerService = featureManagerService;
            scope.coordDisplay = coordinateDisplays.DMS;
            scope.$on('startAttributeEdit', function(event, feature, properties) {

              scope.properties = new Array(properties.length);
              goog.array.forEach(properties, function(property, index, arr) {
                scope.properties[index] = goog.object.clone(property);
              });

              $('#attribute-edit-dialog').modal('toggle');
              scope.feature = feature;
            });

            var parentModal = element.closest('.modal');
            var closeModal = function(event, element) {
              if (parentModal[0] === element[0]) {
                scope.feature = null;
                scope.properties = null;
              }
            };

            scope.$on('modal-closed', closeModal);
          }
        };
      }
  );
})();
