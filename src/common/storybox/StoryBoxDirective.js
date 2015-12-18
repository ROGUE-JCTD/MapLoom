(function() {

  var module = angular.module('loom_storybox_directive', []);

  module.directive('loomStoryboxes',
      function($rootScope, mapService, boxService, tableViewService, dialogService, $translate) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'storybox/partials/storyboxes.tpl.html',
          link: function(scope) {
            scope.mapService = mapService;
            //scope.featureManagerService = featureManagerService;
            scope.tableViewService = tableViewService;
            scope.zooming = false;
            scope.boxService = boxService;
            scope.toggleVisibility = function(layer) {
              //layer.setVisible(!layer.get('visible'));
            };

            scope.toggleAttributeVisibility = function(attribute) {
              //attribute.visible = !attribute.visible;
            };

            scope.removeBox = function(box) {
              dialogService.warn($translate.instant('remove_box'), $translate.instant('sure_remove_box'),
                  [$translate.instant('yes_btn'), $translate.instant('no_btn')], false).then(function(button) {
                switch (button) {
                  case 0:
                    //mapService.map.removeLayer(box);
                    $rootScope.$broadcast('boxRemoved', box);
                    break;
                  case 1:
                    break;
                }
              });
            };

            scope.zoomToBox = function(box) {
              scope.zooming = true;
              mapService.zoomToAreaOfIntrestExtent(box.extent).then(function() {
                scope.zooming = false;
              });
            };

            scope.isLoadingTable = function(layer) {
              //var loadingTable = layer.get('metadata').loadingTable;
              //return goog.isDefAndNotNull(loadingTable) && loadingTable === true;
            };

            scope.showEditForm = function(box) {
              //layer.get('metadata').loadingTable = true;
              tableViewService.showTable(box).then(function() {
                //layer.get('metadata').loadingTable = false;
                $('#table-view-window').modal('show');
              }, function() {
                //layer.get('metadata').loadingTable = false;
                dialogService.error($translate.instant('show_table'), $translate.instant('show_table_failed'));
              });
            };

            scope.getAttrListd = function(box) {
              var attrList = [];

              $.each(box, function(key, value) {
                attrList.push('{key: ' + key + ', value: ' + value + '}');
              });

              return attrList;
            };

            scope.getBoxInfo = function(box) {
              $rootScope.$broadcast('getBoxInfo', box);
            };
          }
        };
      }
  );

  module.directive('loomStorybox',
      function($rootScope, boxService, mapService, geogigService, $translate, dialogService) {
        return {
          templateUrl: 'storybox/partials/addstorybox.tpl.html',
          link: function(scope, element) {
            scope.serverService = boxService;

            scope.addStoryBox = function(box) {
              // if the server is not a typical server and instead the hardcoded ones
              var cp_box = angular.copy(box);
              goog.object.extend(cp_box, {'id': new Date().getUTCMilliseconds() });
              goog.object.extend(cp_box, {'extent': mapService.map.getView().calculateExtent(mapService.map.getSize())});
              boxService.addBox(cp_box);
              scope.box = {};
              var layersConfig = [];

              var length = layersConfig.length;
              for (var index = 0; index < length; index += 1) {
                var config = layersConfig[index];
                if (config.add) {
                  // NOTE: minimal config is the absolute bare minimum info that will be send to webapp containing
                  //       maploom such as geonode. At this point, only source (server id), and name are used. If you
                  //       find the need to add more parameters here, you need to put them in MapService.addLayer
                  //       instead. that's because MapService.addLayer may be invoked from here, when a saved
                  //       map is opened, or when a map is created from a layer in which case the logic here will be
                  //       skipped! note, when MapService.addLayer is called, server's getcapabilities (if applicable)
                  //       has already been resolved so you can used that info to append values to the layer.
                  var minimalConfig = {
                    name: config.Name,
                    source: scope.currentServerId
                  };
                  console.log(minimalConfig);
                  //mapService.addLayer(minimalConfig);

                  config.add = false;
                }
              }
            };

            var parentModal = element.closest('.modal');
            var closeModal = function(event, element) {
              if (parentModal[0] === element[0]) {
                scope.filterLayers = null;
                scope.box = {};
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
