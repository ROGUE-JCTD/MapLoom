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
              var tempProperties = {};
              var attributeTypes = featureManagerService.getSelectedLayer().get('metadata').schema;
              if (goog.isDefAndNotNull(attributeTypes)) {
                goog.array.forEach(properties, function(property, index, arr) {
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
                    prop.nillable = attributeTypes[prop[0]]._nillable;
                    scope.validateField(prop, 1);
                    tempProperties[property[0]] = prop;
                  }
                });

                for (var propName in attributeTypes) {
                  if (tempProperties.hasOwnProperty(propName)) {
                    scope.properties.push(tempProperties[propName]);
                  }
                }
              }

              if (geometry.type.toLowerCase() == 'point') {
                if (projection === 'EPSG:4326') {
                  scope.coordDisplay = {value: coordinateDisplays.DMS};
                } else {
                  scope.coordDisplay = {value: projection};
                }
                scope.coordinates = {coords: goog.array.clone(geometry.coordinates), valid: true,
                  projection: projection};
              }
              scope.inserting = inserting;
              $('#attribute-edit-dialog').modal('toggle');
            });

            scope.translate = function(value) {
              return $translate.instant(value);
            };

            var reset = function() {
              scope.featureManagerService = null;
              scope.properties = null;
              scope.coordinates = null;
              scope.inserting = false;
            };

            scope.removePhoto = function(property, photo) {
              goog.array.remove(property[1], photo);
              if (property[1].length === 0) {
                property[1] = null;
              }
            };

            scope.validateField = function(property, key) {
              property.valid = true;
              if (property[key] !== '' && property[key] !== null) {
                switch (property.type) {
                  case 'xsd:int':
                    property.valid = validateInteger(property[key]);
                    break;
                  case 'xsd:integer':
                    property.valid = validateInteger(property[key]);
                    break;
                  case 'xsd:double':
                    property.valid = validateDouble(property[key]);
                    break;
                  case 'xsd:decimal':
                    property.valid = validateDouble(property[key]);
                    break;
                }
              } else if (property.nillable === 'false') {
                property.valid = false;
              }
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
                dialogService.warn($translate.instant('save_attributes'), $translate.instant('invalid_fields',
                    {value: numErrors}), [$translate.instant('btn_ok')], false);
                return;
              } else if (goog.isDefAndNotNull(scope.coordinates) && scope.coordinates.changed &&
                  scope.coordDisplay.value === coordinateDisplays.DMS &&
                  ol.coordinate.toStringHDMS(scope.coordinates.coords4326) !== scope.coordinates.originalText) {
                dialogService.open($translate.instant('location_lon_lat'), $translate.instant('latlon_confirm',
                    {value: ol.coordinate.toStringHDMS(scope.coordinates.coords4326)}), [$translate.instant('yes_btn'),
                      $translate.instant('no_btn')], false).then(function(button) {
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
                                     dialogService.error($translate.instant('error'), $translate.instant(message,
                                         {'value': reject}), [$translate.instant('btn_ok')], false);
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
                    dialogService.error($translate.instant('error'), $translate.instant(message, {'value': reject}),
                        [$translate.instant('btn_ok')], false);
                  });
            };

            scope.selectValue = function(property, index) {
              if (index === null) {
                property[1] = null;
              } else {
                property[1] = property.enum[index]._value;
              }
              scope.validateField(property, 1);
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
