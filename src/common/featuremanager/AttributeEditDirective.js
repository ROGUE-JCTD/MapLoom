(function() {

  var module = angular.module('loom_attribute_edit_directive', []);

  module.directive('loomAttributeEdit',
      function($translate, featureManagerService, dialogService) {
        return {
          restrict: 'C',
          templateUrl: 'featuremanager/partial/attributeedit.tpl.html',
          link: function(scope, element) {
            scope.featureManagerService = featureManagerService;
            scope.$on('startAttributeEdit', function(event, geometry, projection, properties, inserting) {
              scope.properties = [];
              var attributeTypes = featureManagerService.getSelectedLayer().get('metadata').schema;
              goog.array.forEach(properties, function(property, index, arr) {
                if (goog.isDefAndNotNull(attributeTypes)) {
                  if (attributeTypes[property[0]]._type.search('gml:') === -1) {
                    var prop = goog.object.clone(property);
                    prop.type = attributeTypes[prop[0]]._type;
                    if (prop.type === 'simpleType') {
                      prop.enum =
                          attributeTypes[prop[0]].simpleType.restriction.enumeration;
                    } else if (prop.type === 'xsd:boolean') {
                      prop.enum = [{_value: 'true'}, {_value: 'false'}];
                    }
                    prop.valid = true;
                    scope.properties.push(prop);
                  }
                }
              });
              if (geometry.type.toLowerCase() == 'point') {
                if (projection === 'EPSG:4326') {
                  scope.coordDisplay = {value: coordinateDisplays.DMS};
                } else {
                  scope.coordDisplay = {value: coordinateDisplays.Other};
                }
                scope.coordinates = {coords: goog.array.clone(geometry.coordinates), valid: true,
                  projection: projection};
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

            scope.validateInteger = validateInteger;

            scope.validateDouble = validateDouble;

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
                dialogService.warn($translate('save_attributes'), $translate('invalid_fields', {value: numErrors}),
                    [$translate('btn_ok')], false);
                return;
              } else if (goog.isDefAndNotNull(scope.coordinates) && scope.coordinates.changed &&
                  scope.coordDisplay.value === coordinateDisplays.DMS &&
                  ol.coordinate.toStringHDMS(scope.coordinates.coords) !== scope.coordinates.originalText) {
                dialogService.open($translate('location_lon_lat'), $translate('latlon_confirm',
                    {value: ol.coordinate.toStringHDMS(scope.coordinates.coords)}), [$translate('yes_btn'),
                      $translate('no_btn')], false).then(function(button) {
                  switch (button) {
                    case 0: {
                      featureManagerService.endAttributeEditing(true, scope.inserting, scope.properties,
                          scope.coordinates.coords);
                      reset();
                      $('#attribute-edit-dialog').modal('toggle');
                    }
                  }
                });
                return;
              }
              featureManagerService.endAttributeEditing(true, scope.inserting, scope.properties,
                  goog.isDefAndNotNull(scope.coordinates) ? scope.coordinates.coords : scope.coordinates);
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
