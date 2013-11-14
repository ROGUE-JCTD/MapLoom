(function() {
  var module = angular.module('loom_diff_service', []);

  // Private Variables
  var rootScope = null;
  var service_ = null;
  var difflayer_ = null;
  var mapService_ = null;

  module.provider('diffService', function() {
    this.adds = [];
    this.modifies = [];
    this.deletes = [];
    this.conflicts = [];
    this.merges = [];
    this.title = 'Diffs';
    this.clickCallback = null;
    this.oldName = null;
    this.newName = null;

    this.$get = function($rootScope, mapService) {
      rootScope = $rootScope;
      service_ = this;
      difflayer_ = new ol.layer.Vector({
        label: 'Differences',
        source: new ol.source.Vector({
          parser: null
        }),
        style: new ol.style.Style({rules: [
          new ol.style.Rule({
            filter: 'change == "ADDED"',
            symbolizers: [
              new ol.style.Fill({
                color: '#00FF00',
                opacity: 0.5
              }),
              new ol.style.Stroke({
                color: '#006600'
              })
            ]
          }),
          new ol.style.Rule({
            filter: 'change == "REMOVED"',
            symbolizers: [
              new ol.style.Fill({
                color: '#FF0000',
                opacity: 0.5
              }),
              new ol.style.Stroke({
                color: '#660000'
              })
            ]
          }),
          new ol.style.Rule({
            filter: 'change == "MODIFIED"',
            symbolizers: [
              new ol.style.Fill({
                color: '#FFFF00',
                opacity: 0.5
              }),
              new ol.style.Stroke({
                color: '#666600'
              })
            ]
          }),
          new ol.style.Rule({
            filter: 'change == "CONFLICT"',
            symbolizers: [
              new ol.style.Fill({
                color: '#F87531',
                opacity: 0.5
              }),
              new ol.style.Stroke({
                color: '#964514'
              })
            ]
          }),
          new ol.style.Rule({
            filter: 'change == "MERGED"',
            symbolizers: [
              new ol.style.Fill({
                color: '#0000FF',
                opacity: 0.5
              }),
              new ol.style.Stroke({
                color: '#000066'
              })
            ]
          })
        ]})
      });
      mapService_ = mapService;
      return this;
    };

    this.resolveFeature = function(_feature) {
      var splitFeature = _feature.id.split('/');
      for (var i = 0; i < service_.conflicts.length; i++) {
        var obj = service_.conflicts[i];
        if (obj.layer === splitFeature[0] && obj.feature === splitFeature[1]) {
          obj.resolved = _feature.resolved;
          obj.ours = _feature.ours;
        }
      }
    };

    this.populate = function(_changeList, _repo, oldName, newName) {
      service_.adds = [];
      service_.modifies = [];
      service_.deletes = [];
      service_.conflicts = [];
      service_.merges = [];
      service_.oldName = oldName;
      service_.newName = newName;
      difflayer_.clear();
      mapService_.map.removeLayer(difflayer_);
      mapService_.map.addLayer(difflayer_);
      if (goog.isDefAndNotNull(_changeList) && goog.isArray(_changeList)) {
        goog.array.forEach(_changeList, function(change) {
          var geom = ol.parser.WKT.read(change.geometry);
          var transform = ol.proj.getTransform('EPSG:4326', mapService_.map.getView().getView2D().getProjection());
          geom.transform(transform);
          var olFeature = new ol.Feature();
          olFeature.set('change', change.change);
          olFeature.setGeometry(geom);
          difflayer_.addFeatures([olFeature]);
          change.olFeature = olFeature;
          var splitFeature = change.id.split('/');
          var feature = {
            repo: _repo,
            layer: splitFeature[0],
            feature: splitFeature[1]
          };
          switch (change.change) {
            case 'ADDED':
              service_.adds.push(feature);
              break;
            case 'REMOVED':
              service_.deletes.push(feature);
              break;
            case 'MODIFIED':
              service_.modifies.push(feature);
              break;
            case 'CONFLICT':
              service_.conflicts.push(feature);
              break;
            case 'MERGED':
              service_.merges.push(feature);
              break;
          }
        });
      }
      rootScope.$broadcast('diff_performed', _repo);
    };

    this.performDiff = function(repo, from, to) {
      this.adds = [
        {repo: 'repo1', layer: 'layer1', feature: 'fid-34f32ac32'}
      ];
      this.modifies = [
        {repo: 'repo1', layer: 'layer1', feature: 'fid-ffc2380ba'},
        {repo: 'repo1', layer: 'layer2', feature: 'fid-87291defa'}
      ];
      this.deletes = [
        {repo: 'repo1', layer: 'layer2', feature: 'fid-23cdfa320'}
      ];
      this.merges = [
        {repo: 'repo1', layer: 'layer4', feature: 'fid-aa3426cda'}
      ];
      this.conflicts = [
        {repo: 'repo1', layer: 'layer1', feature: 'fid-3487badc0'}
      ];
      rootScope.$broadcast('diff_performed', repo, from, to);
    };

    this.clearDiff = function() {
      this.adds = [];
      this.modifies = [];
      this.deletes = [];
      this.conflicts = [];
      this.merges = [];
      mapService_.map.removeLayer(difflayer_);
      rootScope.$broadcast('diff_cleared');
    };

    this.hasDifferences = function() {
      return (this.adds.length + this.modifies.length + this.deletes.length + this.conflicts.length !== 0);
    };

    this.setTitle = function(title) {
      this.title = title;
    };
  });

}());
