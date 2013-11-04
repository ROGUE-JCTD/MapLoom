(function() {
  var module = angular.module('loom_feature_diff_service', []);

  // Private Variables
  var service_ = null;

  module.provider('featureDiffService', function() {
    this.title = 'Diffs';
    this.left = null;
    this.right = null;
    this.merged = null;
    this.change = null;
    this.ours = null;
    this.theirs = null;
    this.ancestor = null;
    this.repoId = null;
    this.leftMap = null;
    this.mergeMap = null;
    this.rightMap = null;

    this.$get = function(mapService) {
      service_ = this;
      this.leftMap = new ol.Map({
        renderer: ol.RendererHint.DOM,
        view: new ol.View2D({
          center: ol.proj.transform([-87.2011, 14.1], 'EPSG:4326', 'EPSG:3857'),
          zoom: 14
        })
      });
      this.leftMap.bindTo('layergroup', mapService.map);
      var controls = this.leftMap.getControls();
      controls.forEach(function(control) {
        if (control instanceof ol.control.Attribution) {
          service_.leftMap.removeControl(control);
        }
      });
      this.mergeMap = new ol.Map({
        renderer: ol.RendererHint.DOM,
        view: new ol.View2D({
          center: ol.proj.transform([-87.2011, 14.1], 'EPSG:4326', 'EPSG:3857'),
          zoom: 14
        })
      });
      this.mergeMap.bindTo('layergroup', mapService.map);
      this.mergeMap.bindTo('view', service_.leftMap);
      controls = this.mergeMap.getControls();
      controls.forEach(function(control) {
        if (control instanceof ol.control.Attribution) {
          service_.mergeMap.removeControl(control);
        }
      });

      this.rightMap = new ol.Map({
        renderer: ol.RendererHint.DOM,
        view: new ol.View2D({
          center: ol.proj.transform([-87.2011, 14.1], 'EPSG:4326', 'EPSG:3857'),
          zoom: 14
        })
      });
      this.rightMap.bindTo('layergroup', mapService.map);
      this.rightMap.bindTo('view', service_.leftMap);
      controls = this.rightMap.getControls();
      controls.forEach(function(control) {
        if (control instanceof ol.control.Attribution) {
          service_.rightMap.removeControl(control);
        }
      });
      return this;
    };

    this.setTitle = function(title) {
      service_.title = title;
    };

    this.setFeature = function(feature) {
      service_.title = feature.id;
      service_.change = feature.change;
      service_.left = null;
      service_.right = null;
      service_.merged = null;
      switch (feature.change) {
        case 'ADDED':
          service_.right = feature;
          break;
        case 'REMOVED':
          service_.right = feature;
          break;
        case 'MODIFIED':
          service_.left = feature;
          service_.right = feature;
          break;
        case 'CONFLICT':
          service_.left = feature;
          service_.right = feature;
          service_.merged = feature;
          break;
        case 'MERGED':
          service_.left = feature;
          service_.right = feature;
          service_.merged = feature;
          break;
      }
    };
  });

}());
