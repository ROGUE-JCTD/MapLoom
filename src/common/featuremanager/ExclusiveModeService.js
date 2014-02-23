(function() {
  var module = angular.module('loom_exclusive_mode_service', []);

  var title_ = '';
  var buttons_ = [];
  var pulldownService_ = null;
  var enabled_ = false;
  var geometryType_ = null;
  var mapService_ = null;

  module.provider('exclusiveModeService', function() {
    this.$get = function(pulldownService, mapService) {
      pulldownService_ = pulldownService;
      mapService_ = mapService;
      this.addMode = false;
      return this;
    };

    this.button = function(title, callback) {
      return {title: title, callback: callback};
    };

    this.getTitle = function() {
      return title_;
    };

    this.getType = function() {
      return geometryType_;
    };

    this.getButtonOne = function() {
      return buttons_[0];
    };

    this.getButtonTwo = function() {
      return buttons_[1];
    };

    this.isEnabled = function() {
      return enabled_;
    };

    this.isMultiType = function() {
      if (goog.isDefAndNotNull(geometryType_)) {
        return geometryType_.search(/Multi/g) > -1 ? true : geometryType_.toLowerCase() == 'geometrycollection';
      }
      return false;
    };

    this.startExclusiveMode = function(title, buttonOne, buttonTwo, geometryType) {
      title_ = title;
      buttons_ = [buttonOne, buttonTwo];
      enabled_ = true;
      angular.element('#pulldown-menu').collapse('hide');
      pulldownService_.toggleEnabled = false;
      geometryType_ = geometryType;
      setTimeout(function() {
        angular.element('#exclusive-mode-container').collapse('show');
      }, 350);
    };

    this.endExclusiveMode = function() {
      angular.element('#exclusive-mode-container').collapse('hide');
      pulldownService_.toggleEnabled = true;
      enabled_ = false;
      setTimeout(function() {
        angular.element('#pulldown-menu').collapse('show');
        title_ = '';
        buttons_ = [];
      }, 350);
    };

    this.addToFeature = function() {
      if (!this.addMode) {
        mapService_.removeModify();
        mapService_.removeSelect();
        if (geometryType_.toLowerCase() == 'multigeometry' || geometryType_.toLowerCase() == 'geometrycollection') {
          $('#drawSelectDialog').modal('toggle');
        } else {
          mapService_.addDraw(geometryType_);
        }
        this.addMode = true;
      }
    };

    this.removeFromFeature = function() {
      if (mapService_.featureOverlay.getFeatures().getLength() > 0) {
        mapService_.editLayer.getSource().removeFeature(mapService_.featureOverlay.getFeatures().getAt(0));
        mapService_.featureOverlay.removeFeature(mapService_.featureOverlay.getFeatures().getAt(0));
      }
    };
  });
}());
