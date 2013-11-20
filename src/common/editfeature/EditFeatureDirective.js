(function() {

  var module = angular.module('loom_edit_feature_directive', []);

  module.directive('loomEditfeature',
      function() {
        return {
          restrict: 'C',
          templateUrl: 'editfeature/partials/editfeature.tpl.html',
          link: function(scope, element) {
            scope.coordDisplay = settings.coordinateDisplay;
            scope.$on('editFeature', function(event, feature, properties) {
              $('#edit-feature-dialog').modal('toggle');
              scope.feature = feature;
              scope.properties = properties;
            });

            var parentModal = element.closest('.modal');
            var closeModal = function(event, element) {
              if (parentModal[0] === element[0]) {
                scope.feature = null;
                scope.properties = null;
              }
            };

            scope.$on('modal-closed', closeModal);

            scope.saveEdits = function() {
              scope.feature = null;
              scope.properties = null;
            };
          }
        };
      }
  );
})();
