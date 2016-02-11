(function() {

  var module = angular.module('loom_storybox_directive', []);

  module.directive('loomStoryboxes',
      function($rootScope, mapService, boxService, dialogService, $translate) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'storybox/partials/storyboxes.tpl.html',
          link: function(scope) {
            scope.mapService = mapService;
            scope.zooming = false;
            scope.boxService = boxService;

            scope.removeBox = function(box) {
              dialogService.warn($translate.instant('remove_box'), $translate.instant('sure_remove_box'),
                  [$translate.instant('yes_btn'), $translate.instant('no_btn')], false).then(function(button) {
                switch (button) {
                  case 0:
                    boxService.removeBox(box);
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

            scope.isLoadingTable = function(box) {

            };

            scope.showEditForm = function(box) {

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
              var clone = angular.copy(box);
              goog.object.extend(clone, {'id': new Date().getUTCMilliseconds() });
              goog.object.extend(clone, {'extent': mapService.map.getView().calculateExtent(mapService.map.getSize())});
              boxService.addBox(clone);
              scope.box = {};
            };

            var parentModal = element.closest('.modal');
            var closeModal = function(event, element) {
              if (parentModal[0] === element[0]) {
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
