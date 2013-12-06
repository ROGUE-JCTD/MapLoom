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
            scope.$on('startAttributeEdit', function(event, geometry, properties, inserting) {
              scope.properties = new Array(properties.length);
              var attributeTypes = featureManagerService.getSelectedLayer().get('metadata').schema;
              goog.array.forEach(properties, function(property, index, arr) {
                scope.properties[index] = goog.object.clone(property);
                if (goog.isDefAndNotNull(attributeTypes)) {
                  scope.properties[index].type = attributeTypes[scope.properties[index][0]]._type;
                  if (scope.properties[index].type === 'simpleType') {
                    scope.properties[index].enum =
                        attributeTypes[scope.properties[index][0]].simpleType.restriction.enumeration;
                  }
                }
              });
              if (geometry.type.toLowerCase() == 'point') {
                scope.coordinates = goog.array.clone(geometry.coordinates);
              }
              scope.inserting = inserting;
              $('#attribute-edit-dialog').modal('toggle');
            });

            var reset = function() {
              scope.featureManagerService = null;
              scope.properties = null;
              scope.coordinates = null;
              scope.inserting = false;
            };

            var parentModal = element.closest('.modal');
            var closeModal = function(event, element) {
              if (parentModal[0] === element[0]) {
                featureManagerService.endAttributeEditing(false, scope.inserting);
                reset();
              }
            };

            scope.save = function() {
              featureManagerService.endAttributeEditing(true, scope.inserting, scope.properties, scope.coordinates);
              reset();
            };

            scope.selectValue = function(property, index) {
              property[1] = property.enum[index]._value;
            };

            scope.$on('modal-closed', closeModal);
          }
        };
      }
  );
})();
