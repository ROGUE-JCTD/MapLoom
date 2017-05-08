(function() {
  var module = angular.module('loom_osh_service', []);

  //-- Private Variables
  var rootScope_ = null;
  var service_ = null;
  //var translate_ = null;
  var map_ = null;
  var osh_overlay_ = null;
  var selectInteraction_ = null;
  //var entities_ = [];
  var markerToEntityMap_ = {};
  var dataMappings_ = {};
  var currSelectedEntity_ = null;
  var prevVideoContainerHeight_ = 0;
  var prevVideoContainerWidth_ = 0;

  module.provider('oshService', function() {
    this.$get = function($rootScope, $translate, $q, $compile, $http, dialogService, configService) {
      console.log('---- oshService.get');
      rootScope_ = $rootScope;
      service_ = this;
      //translate_ = $translate;

      rootScope_.$on('layerRemoved', function(evt, layer) {
        if (goog.isDefAndNotNull(layer)) {
          service_.hideOverlay();
        }
      });

      rootScope_.$on('layerToggleVisibility', function(evt, layer) {
        if (!layer.get('visbile')) {
          service_.hideOverlay();
        }
      });

      return this;
    };

    this.setOverlay = function(overlay) {
      osh_overlay_ = overlay;
    };

    this.hideOverlay = function() {
      if (goog.isDefAndNotNull(osh_overlay_)) {
        osh_overlay_.setPosition(undefined);
        selectInteraction_.getFeatures().clear();
        currSelectedEntity_ = null;
      }
    };

    this.getMediaUrlDefault = function() {
      return '/static/maploom/assets/media-default.png';
    };

    this.handleEntityData = function(event) {
      console.log(event);
      if (goog.isDefAndNotNull(currSelectedEntity_) && typeof event.data.data != 'string') {
        for (var i = 0; i < currSelectedEntity_.dataSources.length; i++) {
          if (event.event_name.indexOf(currSelectedEntity_.dataSources[i].getId()) != -1) {
            dataMappings_[event.event_name] = event.data.data;
            rootScope_.$apply();
          }
        }
      }
    };

    this.init = function(map) {
      map_ = map;
      selectInteraction_ = new ol.interaction.Select({
        condition: ol.events.condition.click
      });

      selectInteraction_.on('select', function(e) {
        console.log(e);
        //if this is a view id then show the osh-pop-up manager
        //
        if (e.selected.length >= 1) {
          //the geometry will be automatically updated by OSH
          osh_overlay_.setPosition(e.selected[0].getGeometry().flatCoordinates);
          if (goog.isDefAndNotNull(markerToEntityMap_[e.selected[0].id_])) {
            currSelectedEntity_ = markerToEntityMap_[e.selected[0].id_];
            dataMappings_ = {};
            for (var i = 0; i < currSelectedEntity_.dataSources.length; i++) {
              OSH.EventManager.observe(OSH.EventManager.EVENT.DATA + '-' + currSelectedEntity_.dataSources[i].getId(), service_.handleEntityData);
            }

            rootScope_.$apply();
          }

        } else {
          osh_overlay_.setPosition(undefined);
          currSelectedEntity_ = null;
        }
        selectInteraction_.getFeatures().clear();
      });
      map_.addInteraction(selectInteraction_);
    };

    this.addEntity = function(markerId, ent) {
      markerToEntityMap_[markerId] = ent;

      if (goog.isDefAndNotNull(ent.dataSources[ent.getDataSourceIndex(ent.id + 'VideoMjpeg')])) {
        new OSH.UI.MjpegView(document.getElementById('osh-info-box-video-content'), {
          dataSourceId: ent.dataSources[ent.getDataSourceIndex(ent.id + 'VideoMjpeg')].getId(),
          entityId: ent.id,
          css: 'video',
          cssSelected: 'video-selected',
          useWorker: true
        });
      }

    };

    this.getCurrentSelectedEntity = function() {
      return currSelectedEntity_;
    };

    this.getData = function() {
      return dataMappings_;
    };

    this.expandVideo = function() {
      if ($('#pic-carousel-container').css('width') != prevVideoContainerWidth_ && prevVideoContainerWidth_ !== 0) {
        $('#pic-carousel-container').css('width', prevVideoContainerWidth_);
        $('#pic-carousel-container').css('height', prevVideoContainerHeight_);
      } else {
        prevVideoContainerHeight_ = $('#pic-carousel-container').css('height');
        prevVideoContainerWidth_ = $('#pic-carousel-container').css('width');
        $('#pic-carousel-container').css('width', 'auto');
        $('#pic-carousel-container').css('height', 'auto');
      }

    };

    this.getMediaUrlError = function() {
      return '/static/maploom/assets/media-error.png';
    };

    this.getSelectedItemProperties = function() {

    };

    //this method is intended for unit testing only
    this.setSelectedItemProperties = function(props) {

    };

    this.getSelectedLayer = function() {

    };

    this.getPosition = function() {

    };

    this.getEnabled = function() {

    };

    this.hide = function() {

    };

    this.show = function(item, position, forceUpdate) {

    };
  });
}());
