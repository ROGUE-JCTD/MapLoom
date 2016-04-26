(function() {
  angular.module('loom_map_preview', [])
  .directive('loomMappreview', loomMappreviewDirective);

  function loomMappreviewDirective() {
    return {
      scope: {},
      controller: loomMappreviewCtrl,
      template: '<div id="maapa"></div>'
    };
  }

  function loomMappreviewCtrl() {

    var map;

    $('#add-layer-dialog').on('shown.bs.modal', function() {
      if (map === undefined) {
        runMap();
      }
    });
    function runMap() {
      map = new ol.Map({
        target: 'maapa',
        layers: [
          new ol.layer.Tile({
            source: new ol.source.OSM()
          })
        ],
        view: new ol.View({
          center: [0, 0],
          zoom: 2
        })
      });
      map.on('dragend', function() {
      });
    }
  }

})();
