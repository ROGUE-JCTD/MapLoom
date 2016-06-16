(function() {

  var module = angular.module('loom_attribute_edit_directive', []);

  module.directive('loomAttributeEdit',
      function($translate, featureManagerService, dialogService, configService, fileUpload) {
        return {
          restrict: 'C',
          templateUrl: 'featuremanager/partial/attributeedit.tpl.html',
          link: function(scope, element) {
            scope.featureManagerService = featureManagerService;
            scope.$on('startAttributeEdit', function(event, geometry, projection, properties, inserting) {
              scope.properties = [];
              scope.isSaving = false;
              scope.isLoading = false;
              scope.isRemoving = false;
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

              var modal = $('#attribute-edit-dialog').modal('toggle');
              modal.on('shown.bs.modal', function() {
                $(':file').filestyle({
                  input: false,
                  iconName: 'glyphicon glyphicon-upload',
                  buttonText: '',
                  size: 'sm',
                  badge: false
                });

                $('.bootstrap-filestyle').tooltip({
                  title: 'Upload Media',
                  placement: 'left',
                  trigger: 'focus'
                });
              });
            });

            scope.translate = function(value) {
              return $translate.instant(value);
            };

            var reset = function() {
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

            scope.fileInputChanged = function(event) {
              var files = event.target.files;
              var propName = event.target.attributes['media-prop-name'].value;
              scope.uploadMedia(propName, files, event.target);
            };

            scope.uploadMedia = function(propName, files, element) {
              if (goog.isDefAndNotNull(files)) {
                scope.isLoading = true;
                var icon = $(element).parent().find('.bootstrap-filestyle .icon-span-filestyle');
                icon.removeClass('glyphicon-upload');
                icon.addClass('glyphicon-transfer');

                var completed = 0;
                var checkCompleted = function() {
                  completed++;
                  if (completed === files.length) {
                    scope.isLoading = false;
                    icon.removeClass('glyphicon-transfer');
                    icon.addClass('glyphicon-upload');
                  }
                };

                var onSuccess = function(response) {
                  for (var i = 0; i < scope.properties.length; i++) {
                    if (scope.properties[i][0] === propName) {
                      scope.properties[i][1].push(response.name);
                    }
                  }
                  checkCompleted();
                };

                var onReject = function(reject) {
                  completed++;
                  window.alert(reject);
                  checkCompleted();
                };

                for (var i = 0; i < files.length; i++) {
                  var file = files[i];
                  if (goog.isDefAndNotNull(file)) {
                    fileUpload.uploadFileToUrl(file, configService.configuration.fileserviceUploadUrl,
                        configService.csrfToken).then(onSuccess, onReject);
                  }
                }
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

            var shortXYValue = function(coords) {
              shortXY = '(' + String(parseFloat(coords[0].toFixed(3))) + ', ' + String(parseFloat(coords[1].toFixed(3))) + ')';
              return shortXY;
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
                    {value: shortXYValue(scope.coordinates.coords)}), [$translate.instant('yes_btn'),
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
              } else if (goog.isDefAndNotNull(scope.coordinates) && scope.coordinates.changed &&
                  scope.coordDisplay.value === coordinateDisplays.MGRS &&
                  xyToMGRSFormat(scope.coordinates.coords4326) !== scope.coordinates.originalText) {
                dialogService.open($translate.instant('location_lon_lat'), $translate.instant('latlon_confirm',
                    {value: shortXYValue(scope.coordinates.coords)}), [$translate.instant('yes_btn'),
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
