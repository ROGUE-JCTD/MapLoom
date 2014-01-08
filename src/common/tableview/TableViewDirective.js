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

  module.directive('loomTableView',
      function(tableFilter, mapService, $http, tableViewService, $translate) {
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

              var bodyHeight = contentHeight - angular.element('#table-view-window .modal-footer')[0].clientHeight;
              angular.element('#table-view-window .modal-body')[0].style.height = bodyHeight + 'px';

              //resize the panel to account for the filter text box and padding
              angular.element('#table-view-window .panel')[0].style.height = bodyHeight - 82 + 'px';
            }

            angular.element('#table-view-window').on('shown.bs.modal', function() {
              resizeModal();
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

            scope.filterTable = function() {
              var filterText = angular.element('#filter-text')[0].value;

              for (var feat in scope.featureList) {
                scope.featureList[feat].visible = false;

                for (var prop in scope.featureList[feat].properties) {

                  if (tableFilter(scope.featureList[feat].properties[prop], filterText) !== '') {
                    scope.featureList[feat].visible = true;
                    break;
                  }
                }
              }
            };

            scope.clearFilter = function() {
              angular.element('#filter-text')[0].value = '';
              for (var feat in scope.featureList) {
                scope.featureList[feat].visible = true;
              }
            };

            $('#table-view-window').on('hidden.bs.modal', function(e) {
              tableViewService.featureList = [];
              tableViewService.attributeNameList = [];
            });
            $('#table-view-window').on('show.bs.modal', function(e) {
              scope.featureList = tableViewService.featureList;
              scope.attributes = tableViewService.attributeNameList;
            });
            $('#table-view-window').on('shown.bs.modal', function(e) {
              $.bootstrapSortable(false);
            });

            scope.saveTable = function() {
              //todo: save the table
            };

          }
        };
      });
}());
