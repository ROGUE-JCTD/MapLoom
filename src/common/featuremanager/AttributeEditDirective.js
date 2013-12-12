(function() {

  var module = angular.module('loom_attribute_edit_directive', []);

  module.directive('loomAttributeEdit',
      function(featureManagerService, dialogService) {
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
                scope.properties[index].valid = true;
              });
              if (geometry.type.toLowerCase() == 'point') {
                scope.coordinates = {coords: goog.array.clone(geometry.coordinates), valid: true};
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

            scope.validateInteger = function(form, index) {
              var nonNumbers = /^[-+]?[0-9]*$/;
              var valid = true;
              if (!nonNumbers.test(scope.properties[index][1])) {
                valid = false;
              }
              scope.properties[index].valid = valid;
            };

            scope.validateDouble = function(form, index) {
              var nonNumbers = /^[-+]?[0-9]*\.?[0-9]+$/;
              var valid = true;
              if (scope.properties[index][1] !== null && scope.properties[index][1] !== '' &&
                  !nonNumbers.test(scope.properties[index][1])) {
                valid = false;
              }
              scope.properties[index].valid = valid;
            };

            var parentModal = element.closest('.modal');
            var closeModal = function(event, element) {
              if (parentModal[0] === element[0]) {
                featureManagerService.endAttributeEditing(false, scope.inserting);
                reset();
              }
            };

            scope.save = function() {
              var numErrors = 0;
              if (goog.isDefAndNotNull(scope.coordinates) && !scope.coordinates.valid) {
                numErrors++;
              }
              for (var index = 0; index < scope.properties.length; index++) {
                if (!scope.properties[index].valid) {
                  numErrors++;
                }
              }
              if (numErrors > 0) {
                dialogService.warn('Save Attributes', 'There are ' + numErrors + ' invalid fields, you must fix these' +
                        ' problems before you can save.',
                    ['OK'], false);
                return;
              }
              featureManagerService.endAttributeEditing(true, scope.inserting, scope.properties, scope.coordinates);
              reset();
              $('#attribute-edit-dialog').modal('toggle');
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
