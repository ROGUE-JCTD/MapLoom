
(function() {
  var module = angular.module('loom_feature_info_box_directive', []);

  module.directive('loomFeatureInfoBox',
      function($translate, featureManagerService, mapService, historyService, dialogService, tableViewService, $rootScope) {

        return {
          replace: false,
          restrict: 'A',
          templateUrl: 'featuremanager/partial/featureinfobox.tpl.html',
          link: function(scope) {
            scope.featureManagerService = featureManagerService;
            scope.mapService = mapService;
            scope.loadingHistory = false;
            scope.deletingFeature = false;

            scope.$on('feature-info-click', function() {
              scope.$apply(function() {
                scope.featureManagerService = featureManagerService;
              });
            });

            scope.isUrl = function(str) {
              if (!/^(f|ht)tps?:\/\//i.test(str)) {
                return false;
              }
              return true;
            };

            scope.isShowingAttributes = function() {
              var schema = featureManagerService.getSelectedLayer().get('metadata').schema;

              // if there is no schema, do not hide attributes
              if (!goog.isDefAndNotNull(schema)) {
                return true;
              }

              var properties = featureManagerService.getSelectedItemProperties();
              for (var index = 0; index < properties.length; index++) {
                if (goog.isDefAndNotNull(schema[properties[index][0]]) && schema[properties[index][0]].visible) {
                  return true;
                }
              }
              return false;
            };

            scope.isAttributeVisible = function(property) {
              var schema = featureManagerService.getSelectedLayer().get('metadata').schema;

              // if there is no schema, show the attribute. only filter out if there is schema and attr is set to hidden
              if (!goog.isDefAndNotNull(schema) || !schema.hasOwnProperty(property)) {
                return true;
              }

              return schema[property].visible;
            };

            scope.getAttributeLabel = function(property) {
              var exchangeMetadataAttribute = getExchangeMetadataAttribute(property);

              if (goog.isDefAndNotNull(exchangeMetadataAttribute) &&
                  goog.isDefAndNotNull(exchangeMetadataAttribute.attribute_label) &&
                  exchangeMetadataAttribute.attribute_label.length > 0) {
                return exchangeMetadataAttribute.attribute_label;
              }

              return property;
            };

            function getExchangeMetadataAttribute(property) {
              var exchangeMetadata = featureManagerService.getSelectedLayer().get('exchangeMetadata');

              if (goog.isDefAndNotNull(exchangeMetadata) && goog.isDefAndNotNull(exchangeMetadata.attributes)) {
                for (var index in exchangeMetadata.attributes) {
                  if (goog.isDefAndNotNull(exchangeMetadata.attributes[index]) &&
                      exchangeMetadata.attributes[index].attribute === property) {
                    return exchangeMetadata.attributes[index];
                  }
                }
              }

              return null;
            }

            scope.getAttributeValue = function(property, value) {
              var exchangeMetadataAttribute = getExchangeMetadataAttribute(property);

              if (!_.isNil(exchangeMetadataAttribute) &&
                  !_.isNil(exchangeMetadataAttribute.options) &&
                  !_.isEmpty(exchangeMetadataAttribute.options)) {
                var option = _.find(exchangeMetadataAttribute.options, { value: value });
                if (option && option.label) {
                  return option.value + ' - ' + option.label;
                }
              }

              return value;
            };

            scope.showFeatureHistory = function() {
              if (!scope.loadingHistory) {
                var layer = featureManagerService.getSelectedLayer();
                if (goog.isDefAndNotNull(layer)) {
                  var metadata = layer.get('metadata');
                  if (goog.isDefAndNotNull(metadata)) {
                    if (goog.isDefAndNotNull(metadata.isGeoGig) && metadata.isGeoGig) {
                      var nativeLayer = metadata.nativeName;
                      var featureId = featureManagerService.getSelectedItem().id;
                      var fid = nativeLayer + '/' + featureId;
                      scope.loadingHistory = true;
                      historyService.setTitle($translate.instant('history_for', {value: featureId}));
                      var promise = historyService.getHistory(layer, fid);
                      if (goog.isDefAndNotNull(promise)) {
                        promise.then(function() {
                          scope.loadingHistory = false;
                        }, function() {
                          scope.loadingHistory = false;
                        });
                      } else {
                        scope.loadingHistory = false;
                      }
                    }
                  }
                }
              }
            };

            scope.deleteFeature = function() {
              if (!scope.deletingFeature) {
                dialogService.warn($translate.instant('delete_feature'), $translate.instant('sure_delete_feature'),
                    [$translate.instant('yes_btn'), $translate.instant('no_btn')], false).then(function(button) {
                  switch (button) {
                    case 0:
                      scope.deletingFeature = true;
                      featureManagerService.deleteFeature().then(function(resolve) {
                        scope.deletingFeature = false;
                      }, function(reject) {
                        scope.deletingFeature = false;
                        dialogService.error($translate.instant('error'),
                            $translate.instant('unable_to_delete_feature', {value: reject}),
                            [$translate.instant('btn_ok')], false);
                      });
                      break;
                    case 1:
                      break;
                  }
                });
              }
            };

            scope.showTable = function(layer) {
              layer.get('metadata').loadingTable = true;
              tableViewService.showTable(layer, featureManagerService.getSelectedItem()).then(function() {
                layer.get('metadata').loadingTable = false;
                featureManagerService.hide();
                $('#table-view-window').modal('show');
              }, function() {
                layer.get('metadata').loadingTable = false;
                dialogService.error($translate.instant('show_table'), $translate.instant('show_table_failed'));
              });
            };

            scope.isLoadingTable = function(layer) {
              var loadingTable = layer.get('metadata').loadingTable;
              return goog.isDefAndNotNull(loadingTable) && loadingTable === true;
            };

            scope.setAsSpatialFilter = function() {
              var feature = mapService.editLayer.getSource().getFeatures()[0];
              feature.setId(featureManagerService.getSelectedItem().id);

              if (feature.getGeometry().getType() === 'Point') {
                $rootScope.$broadcast('enterSpatialFilterRadius', feature);
              } else {
                mapService.addToSpatialFilterLayer(feature);
                featureManagerService.hide();
              }
            };

            scope.pinFeature = function() {
              var searchResults;
              mapService.map.getLayers().forEach(function(layer) {
                if (layer.get('metadata').searchResults) {
                  searchResults = layer;
                }
              });
              // create pinned features layer if it does not exist yet
              if (!goog.isDefAndNotNull(searchResults)) {
                searchResults = new ol.layer.Vector({
                  metadata: {
                    title: $translate.instant('pinned_search'),
                    internalLayer: true,
                    searchResults: true
                  },
                  source: new ol.source.Vector({
                    parser: null
                  }),
                  style: function(feature, resolution) {
                    return [new ol.style.Style({
                      image: new ol.style.Circle({
                        radius: 8,
                        fill: new ol.style.Fill({
                          color: '#FF0000'
                        }),
                        stroke: new ol.style.Stroke({
                          color: '#000000'
                        })
                      })
                    })];
                  }
                });
                // add the search results to the map
                mapService.map.addLayer(searchResults);
              }
              // add a clone of the selected feature to the pinned search result
              var olFeature =
                  featureManagerService.getSelectedLayer().getSource().getFeatureById(
                      featureManagerService.getSelectedItem().getId()
                  );
              var searchFeature = olFeature.clone();
              // copy the properties and id manually, not captured in a clone
              searchFeature.setId('P_' + olFeature.getId());
              searchFeature.properties = olFeature.properties;

              searchResults.getSource().addFeature(searchFeature);
            };

            scope.unpinFeature = function() {
              var searchResults;
              mapService.map.getLayers().forEach(function(layer) {
                if (layer.get('metadata').searchResults) {
                  searchResults = layer;
                }
              });
              // sanity check
              if (!goog.isDefAndNotNull(searchResults)) {
                return;
              }
              // remove the selected feature to the pinned search result
              var olFeature =
                  featureManagerService.getSelectedLayer().getSource().getFeatureById(
                      featureManagerService.getSelectedItem().getId()
                  );
              searchResults.getSource().removeFeature(olFeature);
            };
          }
        };
      }
  );
})();
