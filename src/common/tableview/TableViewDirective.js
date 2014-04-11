(function() {
  var module = angular.module('loom_table_view_directive', []);

  module.filter('table', function() {
    return function(input, filter) {
      var out = '';
      //converting the input and filter strings to lower case for a case insensitive filtering
      var inputLower = input.toLowerCase(),
          filterLower = filter.toLowerCase();
      if (inputLower.indexOf(filterLower) !== -1) {
        out = input;
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

  module.directive('loomTableView',
      function(tableFilter, mapService, $http, tableViewService, featureManagerService) {
        return {
          restrict: 'C',
          templateUrl: 'tableview/partial/tableview.tpl.html',
          link: function(scope, element) {

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
              angular.element('#table-view-window .panel')[0].style.height = bodyHeight - 132 + 'px';
            }

            angular.element('#table-view-window').on('shown.bs.modal', function() {
              resizeModal();
              $.bootstrapSortable();
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

            scope.featureList = tableViewService.featureList;
            scope.attributes = tableViewService.attributeNameList;

            scope.filterText = '';
            scope.filteringTable = false;

            scope.filterTable = function() {
              if (scope.filteringTable) {
                scope.filterText = '';
              }

              if (scope.filterText === '') {
                scope.clearFilter();
                return;
              }

              scope.filteringTable = true;
              for (var feat in scope.featureList) {
                scope.featureList[feat].visible = false;

                for (var prop in scope.featureList[feat].properties) {

                  if (tableFilter(scope.featureList[feat].properties[prop].value, scope.filterText) !== '') {
                    scope.featureList[feat].visible = true;
                    break;
                  }
                }
              }
            };

            scope.clearFilter = function() {
              for (var feat in scope.featureList) {
                scope.featureList[feat].visible = true;
              }

              scope.filteringTable = false;
            };

            $('#table-view-window').on('hidden.bs.modal', function(e) {
              tableViewService.featureList = [];
              tableViewService.attributeNameList = [];
            });
            $('#table-view-window').on('show.bs.modal', function(e) {
              scope.attributes = tableViewService.attributeNameList;

              //this needs to be deep copied so the original values will be available to pass to the feature manager
              scope.featureList = clone(tableViewService.featureList);
            });

            scope.saveTable = function() {
              for (var featureIndex = 0; featureIndex < scope.featureList.length; ++featureIndex) {
                var originalPropertyArray = [];
                var propertyArray = [];
                var originalFeature = tableViewService.featureList[featureIndex];
                var feature = scope.featureList[featureIndex];

                //propertyIndex starts at 1 rather than 0 because properties[0] is used to hold the featureID
                for (var propertyIndex = 1; propertyIndex < feature.properties.length; ++ propertyIndex) {
                  propertyArray.push({0: scope.attributes[propertyIndex - 1],
                    1: feature.properties[propertyIndex].value});
                  originalPropertyArray.push({0: scope.attributes[propertyIndex - 1],
                    1: originalFeature.properties[propertyIndex].value});
                }

                featureManagerService.setSelectedItem({type: 'feature', id: feature.properties[0].value,
                  properties: originalPropertyArray});
                featureManagerService.setSelectedItemProperties(originalPropertyArray);
                featureManagerService.setSelectedLayer(tableViewService.selectedLayer);
                featureManagerService.endAttributeEditing(true, false, propertyArray);
              }
              $.bootstrapSortable();
            };

          }
        };
      });
}());
