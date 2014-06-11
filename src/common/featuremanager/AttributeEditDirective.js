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
              scope.isSaving = false;
              var attributeTypes = featureManagerService.getSelectedLayer().get('metadata').schema;
              goog.array.forEach(properties, function(property, index, arr) {
                if (goog.isDefAndNotNull(attributeTypes)) {
                  var prop;
                  if (goog.isDefAndNotNull(attributeTypes[property[0]]) &&
                      attributeTypes[property[0]]._type.search('gml:') === -1) {
                    prop = goog.object.clone(property);
                    prop.type = attributeTypes[prop[0]]._type;
                    if (prop.type === 'simpleType') {
                      prop.enum =
                          attributeTypes[prop[0]].simpleType.restriction.enumeration;
                    } else if (prop.type === 'xsd:boolean') {
                      prop.enum = [
                        {_value: 'true'},
                        {_value: 'false'}
                      ];
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

            scope.translate = function(value) {
              return $translate(value);
            };

            var reset = function() {
              scope.featureManagerService = null;
              scope.properties = null;
              scope.coordinates = null;
              scope.inserting = false;
            };

            scope.removePhoto = function(property, photo) {
              goog.array.remove(property[1], photo);
            };

            scope.validateInteger = function(property, key) {
              property.valid = validateInteger(property[key]);
            };

            scope.validateDouble = function(property, key) {
              property.valid = validateDouble(property[key]);
            };

            var parentModal = element.closest('.modal');
            var closeModal = function(event, element) {
              if (parentModal[0] === element[0]) {
                featureManagerService.endAttributeEditing(false, scope.inserting);
                reset();
              }
            };

            scope.save = function() {
              if (scope.isSaving) {
                return;
              }
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
                      scope.isSaving = true;
                      featureManagerService.endAttributeEditing(true, scope.inserting, scope.properties,
                          scope.coordinates.coords).then(function(resolve) {
                                     reset();
                                     $('#attribute-edit-dialog').modal('toggle');
                                     scope.isSaving = false;
                                   }, function(reject) {
                                     scope.isSaving = false;
                                     var message = scope.inserting ?
                                'unable_to_save_feature' : 'unable_to_save_attributes';
                                     dialogService.error($translate('error'), $translate(message, {'value': reject}),
                                     [$translate('btn_ok')], false);
                                   });
                    }
                  }
                });
                return;
              }
              scope.isSaving = true;
              featureManagerService.endAttributeEditing(true, scope.inserting, scope.properties,
                  goog.isDefAndNotNull(scope.coordinates) ? scope.coordinates.coords : scope.coordinates)
                  .then(function(resolve) {
                    reset();
                    $('#attribute-edit-dialog').modal('toggle');
                    scope.isSaving = false;
                  }, function(reject) {
                    scope.isSaving = false;
                    var message = scope.inserting ?
                        'unable_to_save_feature' : 'unable_to_save_attributes';
                    dialogService.error($translate('error'), $translate(message, {'value': reject}),
                        [$translate('btn_ok')], false);
                  });
            };

            scope.selectValue = function(property, index) {
              if (index === null) {
                property[1] = null;
              } else {
                property[1] = property.enum[index]._value;
              }
            };

            scope.$on('modal-closed', closeModal);

            function onResize() {
              var height = $(window).height();
              element.children('.modal-body').css('max-height', (height - 200).toString() + 'px');
            }

            onResize();

            $(window).resize(onResize);
          }
        };
      }
  );
})();
