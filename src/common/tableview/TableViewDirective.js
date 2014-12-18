(function() {
  var module = angular.module('loom_table_view_directive', []);

  module.filter('table', function() {
    return function(input, filter) {
      var out = '';

      if (input) {
        //converting the input and filter strings to lower case for a case insensitive filtering
        var inputLower = input.toLowerCase(),
            filterLower = filter.toLowerCase();
        if (inputLower.indexOf(filterLower) !== -1) {
          out = input;
        }
      }
      return out;
    };
  });

  function clone(obj) {
    // Handle the 3 simple types, and null or undefined
    if (obj == null || typeof obj != 'object') {
      return obj;
    }

    var copy;

    // Handle Array
    if (obj instanceof Array) {
      copy = [];
      for (var i = 0, len = obj.length; i < len; i++) {
        copy[i] = clone(obj[i]);
      }
      return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
      copy = {};
      for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) {
          copy[attr] = clone(obj[attr]);
        }
      }
      return copy;
    }
  }

  // This controller is necessary to hide the tooltip when the button is clicked.  The mouse leave doesn't get
  // triggered due to the button getting disabled.  This causes the tooltip to get stuck on.
  module.controller('previous-tt-controller', function($scope) {
    $scope.onPrevious = function() {
      //hide the tooltip
      $scope.tt_isOpen = false;
      $scope.previousPage();
    };
  });

  module.controller('next-tt-controller', function($scope) {
    $scope.onNext = function() {
      //hide the tooltip
      $scope.tt_isOpen = false;
      $scope.nextPage();
    };
  });

  module.directive('loomTableView',
      function(tableFilter, mapService, $http, tableViewService, featureManagerService, dialogService, $translate,
               statisticsService, $rootScope) {
        return {
          restrict: 'C',
          templateUrl: 'tableview/partial/tableview.tpl.html',
          link: function(scope, element) {
            scope.isSaving = false;
            scope.isSortable = false;
            //these need to be kept in an object to avoid conflicts between the directive scope and ng-if scope
            scope.search = {isSearching: false, text: ''};
            scope.advFilters = false;

            function resizeModal() {
              var containerHeight = angular.element('#table-view-window .modal-content')[0].clientHeight;
              var headerHeight = angular.element('#table-view-window .modal-header')[0].clientHeight;

              var contentHeight = containerHeight - headerHeight;
              //if conatainerHeight is 0 then the modal is closed so we shouldn't bother resizing
              if (containerHeight === 0) {
                return;
              }

              element[0].parentElement.style.height = contentHeight + 'px';

              var bodyHeight = contentHeight;// - angular.element('#table-view-window .modal-footer')[0].clientHeight;
              angular.element('#table-view-window .modal-body')[0].style.height = bodyHeight + 'px';

              //resize the panel to account for the filter text box and padding
              angular.element('#table-view-window .panel')[0].style.height = bodyHeight - 125 + 'px';
            }

            angular.element('#table-view-window').on('shown.bs.modal', function() {
              resizeModal();
              if (scope.isSortable) {
                $.bootstrapSortable();
              }
            });

            $(window).resize(resizeModal);

            scope.toggleWordWrap = function() {
              var tableElement = angular.element('#table-view-window .table-hover')[0];

              if (tableElement.style.whiteSpace !== 'normal') {
                tableElement.style.whiteSpace = 'normal';
              } else {
                tableElement.style.whiteSpace = 'nowrap';
              }
            };

            scope.toggleAdvancedFilters = function() {
              scope.search.isSearching = false;
              scope.search.text = '';
              tableViewService.stopSearch();
              scope.clearFilters();
              scope.advFilters = !scope.advFilters;
            };

            scope.applyFilters = function() {
              scope.isSaving = true;
              tableViewService.selectedLayer.get('metadata').loadingTable = true;
              tableViewService.filter().then(function() {
                scope.isSaving = false;
                tableViewService.selectedLayer.get('metadata').loadingTable = false;
                scope.selectedRow = null;
                updateData();
              }, function(reject) {
                scope.isSaving = false;
                tableViewService.selectedLayer.get('metadata').loadingTable = false;
                scope.selectedRow = null;
              });
            };

            var wipeFilterFields = function() {
              for (var attrIndex in scope.attributes) {
                scope.attributes[attrIndex].filter.text = '';
                if (goog.isDef(scope.attributes[attrIndex].filter.start)) {
                  scope.attributes[attrIndex].filter.start = '';
                }
                if (goog.isDef(scope.attributes[attrIndex].filter.end)) {
                  scope.attributes[attrIndex].filter.end = '';
                }
                scope.attributes[attrIndex].filter.searchType = 'exactMatch';
              }
            };
            scope.clearFilters = function() {
              wipeFilterFields();
              scope.applyFilters();
            };

            var newTableSession = function() {
              scope.restrictions = tableViewService.restrictionList;
              scope.selectedRow = null;
              //scope.advFilters = false;
              scope.selectedAttribute = null;
              //wipeFilterFields();
            };

            var updateData = function() {
              scope.rows = clone(tableViewService.rows);
              scope.readOnly = tableViewService.readOnly;
              scope.attributes = tableViewService.attributeNameList;
              scope.currentPage = tableViewService.currentPage + 1;
              scope.totalPages = tableViewService.totalPages;
              scope.totalFeatures = tableViewService.totalFeatures;
            };

            var clearSession = function() {
              tableViewService.clear();
              scope.restrictions = {};

              scope.selectedRow = null;
              scope.rows = null;
            };

            scope.selectFeature = function(feature) {
              if (scope.selectedRow) {
                scope.selectedRow.selected = false;
              }
              if (feature) {
                feature.selected = true;
              }
              scope.selectedRow = feature;
            };

            scope.selectAttribute = function(attr) {
              if (scope.selectedAttribute) {
                scope.selectedAttribute.selected = false;
              }
              if (attr) {
                if (scope.selectedAttribute == attr) {
                  attr.selected = false;
                  scope.selectedAttribute = null;
                  return;
                }
                attr.selected = true;
              }
              scope.selectedAttribute = attr;
            };

            scope.goToMap = function() {
              var projectedgeom = transformGeometry(scope.selectedRow.feature.geometry,
                  tableViewService.selectedLayer.get('metadata').projection,
                  mapService.map.getView().getProjection());

              mapService.zoomToExtent(projectedgeom.getExtent());

              var item = {layer: tableViewService.selectedLayer, features: [scope.selectedRow.feature]};
              $('#table-view-window').modal('hide');
              featureManagerService.show(item);

            };

            scope.showHeatmap = function() {
              var meta = tableViewService.selectedLayer.get('metadata');
              var layer = mapService.showHeatmap(tableViewService.selectedLayer, meta.filters);
              scope.cancel();
              mapService.zoomToLayerFeatures(layer);
            };

            scope.isLoadingStatistics = function() {
              if (!goog.isDefAndNotNull(tableViewService.selectedLayer)) {
                return false;
              }

              var loading = tableViewService.selectedLayer.get('metadata').isLoadingStatistics;
              return goog.isDefAndNotNull(loading) && loading === true;
            };

            scope.showStatistics = function() {
              if (!goog.isDefAndNotNull(scope.selectedAttribute)) {
                return;
              }

              tableViewService.selectedLayer.get('metadata').isLoadingStatistics = true;
              var meta = tableViewService.selectedLayer.get('metadata');
              statisticsService.summarizeAttribute(tableViewService.selectedLayer,
                  meta.filters, scope.selectedAttribute.name).then(function(statistics) {
                tableViewService.selectedLayer.get('metadata').isLoadingStatistics = false;
                $('#statistics-view-window').modal('show');
                $rootScope.$broadcast('getStatistics', statistics);
              }, function(reject) {
                tableViewService.selectedLayer.get('metadata').isLoadingStatistics = false;
              });
            };

            scope.getPageText = function() {
              return $translate.instant('current_page', {currentPage: scope.currentPage, totalPages: scope.totalPages});
            };

            scope.previousPage = function() {
              scope.isSaving = true;
              tableViewService.selectedLayer.get('metadata').loadingTable = true;
              tableViewService.previousPage().then(function() {
                scope.isSaving = false;
                tableViewService.selectedLayer.get('metadata').loadingTable = false;
                updateData();
              }, function(reject) {
                scope.isSaving = false;
                tableViewService.selectedLayer.get('metadata').loadingTable = false;
              });
            };

            scope.nextPage = function() {
              scope.isSaving = true;
              tableViewService.selectedLayer.get('metadata').loadingTable = true;
              tableViewService.nextPage().then(function() {
                scope.isSaving = false;
                tableViewService.selectedLayer.get('metadata').loadingTable = false;
                updateData();
              }, function(reject) {
                scope.isSaving = false;
                tableViewService.selectedLayer.get('metadata').loadingTable = false;
              });
            };

            scope.cancel = function() {
              if (scope.isSaving) {
                return;
              }
              var doWork = function() {
                scope.tableviewform.$cancel();
                element.closest('.modal').modal('hide');
              };
              if (scope.tableviewform.$visible) {
                dialogService.warn($translate.instant('warning'), $translate.instant('sure_close_table'),
                    [$translate.instant('yes_btn'), $translate.instant('no_btn')], false).then(function(button) {
                  switch (button) {
                    case 0:
                      doWork();
                      break;
                  }
                });
              } else {
                doWork();
              }
            };

            $('#table-view-window').on('hidden.bs.modal', function(e) {
              if (scope.isSaving) {
                return;
              }
              clearSession();
            });
            $('#table-view-window').on('show.bs.modal', function(e) {
              newTableSession();
              updateData();
              for (var row in scope.rows) {
                if (scope.rows[row].selected === true) {
                  scope.selectedRow = scope.rows[row];
                }
              }

              featureManagerService.hide();
            });

            scope.selectValue = function(properties, name,  index) {
              if (index === null) {
                properties[name] = null;
              } else {
                properties[name] = scope.restrictions[name].type[index]._value;
              }
            };

            var featuresModified = 0;

            function hasValidationErrors() {
              var numErrors = 0;
              featuresModified = 0;
              for (var row in scope.rows) {
                var feature = scope.rows[row].feature;
                scope.rows[row].modified = false;
                for (var prop in feature.properties) {
                  if (prop === 'photos' || prop === 'fotos') {
                    continue;
                  }
                  if (feature.properties[prop] !== tableViewService.rows[row].feature.properties[prop]) {
                    scope.rows[row].modified = true;
                  }
                  if (feature.properties[prop] !== '' && feature.properties[prop] !== null) {
                    if (scope.restrictions[prop].type === 'int') {
                      if (!validateInteger(feature.properties[prop])) {
                        numErrors++;
                      }
                    } else if (scope.restrictions[prop].type === 'double') {
                      if (!validateDouble(feature.properties[prop])) {
                        numErrors++;
                      }
                    }
                  } else if (scope.restrictions[prop].nillable === 'false') {
                    numErrors++;
                  }
                }
                if (scope.rows[row].modified) {
                  featuresModified++;
                }
              }
              if (numErrors > 0) {
                dialogService.warn($translate.instant('save_attributes'), $translate.instant('invalid_fields',
                    {value: numErrors}),
                    [$translate.instant('btn_ok')], false);
                return true;
              } else {
                return false;
              }
            }

            function getWfsFeaturesXml() {
              var xml = '';
              for (var index in scope.rows) {
                if (!scope.rows[index].modified) {
                  continue;
                }
                var feature = scope.rows[index].feature;
                xml += '' +
                    '<wfs:Update' +
                    ' xmlns:feature="' + tableViewService.selectedLayer.get('metadata').workspaceURL + '" ' +
                    'typeName="' + tableViewService.selectedLayer.get('metadata').name + '">';
                for (var property in feature.properties) {
                  var value = feature.properties[property];
                  xml += '<wfs:Property>' +
                      '<wfs:Name>' + property + '</wfs:Name>';
                  if (goog.isDefAndNotNull(value)) {
                    xml += '<wfs:Value>' + value + '</wfs:Value>';
                  } else {
                    xml += '<wfs:Value></wfs:Value>';
                  }
                  xml += '</wfs:Property>';
                }
                xml += '' +
                    '<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">' +
                    '<ogc:FeatureId fid="' + feature.id + '" />' +
                    '</ogc:Filter>' +
                    '</wfs:Update>';
              }
              return xml;
            }

            function getWfsData() {
              var commitMessage = '';
              if (featuresModified === 1) {
                commitMessage = $translate.instant('modified_1_feature',
                    {'layer': tableViewService.selectedLayer.get('metadata').nativeName});
              } else {
                commitMessage = $translate.instant('modified_x_features',
                    {'num': featuresModified, 'layer': tableViewService.selectedLayer.get('metadata').nativeName});
              }
              console.log('commit message: ', commitMessage);
              var xml = '' +
                  '<?xml version="1.0" encoding="UTF-8"?>' +
                  '<wfs:Transaction xmlns:wfs="http://www.opengis.net/wfs"' +
                  ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
                  'service="WFS" version="1.0.0" handle="' + commitMessage + '">' +
                  getWfsFeaturesXml() +
                  '</wfs:Transaction>';

              return xml;
            }

            function postAllFeatures() {
              if (config.username && config.password && (typeof config.headerData === 'undefined')) {
                config.headerData = {
                  'Content-Type': 'text/xml;charset=utf-8'
                };
              }

              var xmlData = getWfsData();

              var url = tableViewService.selectedLayer.get('metadata').url + '/wfs/WfsDispatcher';
              $http.post(url, xmlData, {headers: {
                'Content-Type': 'text/xml;charset=utf-8'
              }})
                  .success(function() {
                    scope.applyFilters();

                    if (scope.isSortable) {
                      $.bootstrapSortable();
                    }

                    // refresh tiles
                    mapService.dumpTileCache(tableViewService.selectedLayer.get('metadata').uniqueID);
                  }).error(function() {
                    scope.isSaving = false;
                    dialogService.error($translate.instant('save_attributes'),
                        $translate.instant('failed_to_save_features'),
                        [$translate.instant('btn_ok')], false);
                    scope.tableviewform.$show();
                  });
            }

            scope.saveTable = function() {
              if (scope.isSaving) {
                return;
              }
              if (hasValidationErrors() === true) {
                //returning a string, even an empty one, will stop xeditable from closing the table form
                return 'Invalid fields detected';
              }

              if (featuresModified === 0) {
                return;
              }

              scope.isSaving = true;
              postAllFeatures();
            };

            scope.searchTable = function() {
              console.log('scope.searchTable', scope.search.isSearching, scope.search.text);
              scope.search.isSearching = !scope.search.isSearching;
              scope.isSaving = true;
              if (scope.search.isSearching) {
                tableViewService.search(scope.search.text);
                tableViewService.loadData().then(function() {
                  updateData();
                  scope.isSaving = false;
                });
              } else {
                tableViewService.stopSearch();
                scope.search.text = '';
                tableViewService.loadData().then(function() {
                  updateData();
                  scope.isSaving = false;
                });
              }
            };
          }
        };
      });
}());
