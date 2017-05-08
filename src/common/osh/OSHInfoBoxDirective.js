(function() {
  var module = angular.module('loom_osh_info_box_directive', []);

  module.directive('loomOshInfoBox',
      function($translate, mapService, dialogService, oshService) {
        console.log('---- loom_osh_info_box_directive');

        return {
          replace: false,
          restrict: 'A',
          templateUrl: 'osh/partial/oshinfobox.tpl.html',
          link: function(scope, element) {
            scope.oshInfoBox = {
              visible: true,
              oshService: oshService
            };

            //convert this element to an overlay so it stays where it should on the map
            osh_overlay = new ol.Overlay({
              insertFirst: false,
              element: document.getElementById('osh-info-box')
            });
            osh_overlay.setPosition(undefined);
            mapService.map.addOverlay(osh_overlay);

            //assign the overlay to the oshService variable
            oshService.setOverlay(osh_overlay);
            //dialogService.error($translate.instant('error'), $translate.instant('unable_to_delete_feature', {value: 'yolo'}), [$translate.instant('btn_ok')], false);
          }
        };
      }
  );
})();
