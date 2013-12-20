(function() {
  var module = angular.module('loom_table_view_directive', []);

  module.filter('table', function() {
    return function(input, filter) {
      var out = '';
      //converting the input and filter strings to lower case for a case insensitive filtering
      var inputLower = input.toLowerCase(),
          filterLower = filter.toLowerCase();
      console.log('lower case business', inputLower, filterLower);
      if (inputLower.indexOf(filterLower) !== -1) {
        out = input;
      }
      console.log('table filter out', out);
      return out;
    };
  });

  module.directive('loomTableView',
      function(tableFilter, mapService) {
        return {
          restrict: 'C',
          templateUrl: 'tableview/partial/tableview.tpl.html',
          link: function(scope, element) {

            function resizeModal() {
              var containerHeight = angular.element('#table-view-window .modal-content')[0].clientHeight;
              var headerHeight = angular.element('#table-view-window .modal-header')[0].clientHeight;

              var contentHeight = containerHeight - headerHeight;
              //if conatainerHeight is 0 then the modal is closed so we shouldn't resize
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

            //placeholder data for testing
            var feature1 = {
              visible: true,
              properties: [
                {value: 'lark'},
                {value: '2'},
                {value: 'Austin'},
                {value: 'velociraptor escape'},
                {value: 'nivel_de_prioridad'},
                {value: 'situacion_actual'},
                {value: '1'},
                {value: 'fecha_hora'},
                {value: 'lugar'},
                {value: 'evento'},
                {value: 'nivel_de_prioridad'},
                {value: 'situacion_actual'},
                {value: 'FID'},
                {value: 'fecha_hora'},
                {value: 'lugar'},
                {value: 'evento'},
                {value: 'nivel_de_prioridad'},
                {value: 'situacion_actual'}
              ]
            };
            var feature2 = {
              visible: true,
              properties: [
                {value: 'albatross'},
                {value: '3'},
                {value: 'London'},
                {value: 'zombie outbreak'},
                {value: 'nivel_de_prioridad'},
                {value: 'situacion_actual'},
                {value: '2'},
                {value: 'fecha_hora'},
                {value: 'lugar'},
                {value: 'evento'},
                {value: 'nivel_de_prioridad'},
                {value: 'situacion_actual'},
                {value: 'FID'},
                {value: 'fecha_hora'},
                {value: 'lugar'},
                {value: 'evento'},
                {value: 'nivel_de_prioridad'},
                {value: 'situacion_actual'}
              ]
            };
            var feature3 = {
              visible: true,
              properties: [
                {value: 'gull'},
                {value: '7'},
                {value: 'San Fransisco'},
                {value: 'meteor impact'},
                {value: 'nivel_de_prioridad'},
                {value: 'situacion_actual'},
                {value: '3'},
                {value: 'fecha_hora'},
                {value: 'lugar'},
                {value: 'evento'},
                {value: 'nivel_de_prioridad'},
                {value: 'situacion_actual'},
                {value: 'FID'},
                {value: 'fecha_hora'},
                {value: 'lugar'},
                {value: 'evento'},
                {value: 'nivel_de_prioridad'},
                {value: 'situacion_actual'}
              ]
            };
            var feature4 = {
              visible: true,
              properties: [
                {value: 'sparrow'},
                {value: '29'},
                {value: 'Buenos Aires'},
                {value: ''},
                {value: 'How good is the PlayStation 4? Ask me in five years. Ask me after Naughty Dogs next couple ' +
                      'of games, after I figure out whether God of War is headed in the right direction'},
                {value: 'situacion_actual'},
                {value: '4'},
                {value: 'fecha_hora'},
                {value: 'lugar'},
                {value: 'evento'},
                {value: 'nivel_de_prioridad'},
                {value: 'situacion_actual'},
                {value: 'FID'},
                {value: 'fecha_hora'},
                {value: 'lugar'},
                {value: 'evento'},
                {value: 'nivel_de_prioridad'},
                {value: 'situacion_actual'}
              ]
            };
            var feature5 = {
              visible: true,
              properties: [
                {value: 'frigate'},
                {value: '4'},
                {value: 'Johannesburg'},
                {value: 'kaiju attack'},
                {value: 'nivel_de_prioridad'},
                {value: 'situacion_actual'},
                {value: '5'},
                {value: 'fecha_hora'},
                {value: 'lugar'},
                {value: 'evento'},
                {value: 'nivel_de_prioridad'},
                {value: 'situacion_actual'},
                {value: 'FID'},
                {value: 'fecha_hora'},
                {value: 'lugar'},
                {value: 'evento'},
                {value: 'How good is the PlayStation 4? Ask me in five years. Ask me after Naughty Dogs next couple ' +
                      'of games, after I figure out whether God of War is headed in the right direction, after I ' +
                      'learn whether it has become unfathomable to play a console game without livestreaming it.'},
                {value: 'situacion_actual'}
              ]
            };
            var layer = {
              features: [feature1, feature2, feature3, feature4, feature5]
            };

            scope.filterTable = function() {
              var filterText = angular.element('#filter-text')[0].value;

              for (var feat in layer.features) {
                layer.features[feat].visible = false;

                for (var prop in layer.features[feat].properties) {

                  if (tableFilter(layer.features[feat].properties[prop].value, filterText) !== '') {
                    layer.features[feat].visible = true;
                    break;
                  }
                }
              }
            };

            scope.clearFilter = function() {
              angular.element('#filter-text')[0].value = '';
              for (var feat in layer.features) {
                layer.features[feat].visible = true;
              }
              //scope.layer = jQuery.extend(true, {}, layer);
            };

            scope.layer = layer;

            scope.saveTable = function() {
              console.log('todo: save table', mapService.map.getLayers());
              console.log('todo: save table', mapService.map.getFeatures);

              //mapService.map.getFeatures({layers: mapService.getFeatureLayers()});
            };
          }
        };
      });
}());
