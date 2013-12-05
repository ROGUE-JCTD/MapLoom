(function() {
  var module = angular.module('loom_exclusive_mode_service', []);

  var title_ = '';
  var buttons_ = [];

  module.provider('exclusiveModeService', function() {
    this.$get = function() {
      return this;
    };

    this.getTitle = function() {
      return title_;
    };

    this.getButtonOne = function() {
      return buttons_[0];
    };

    this.getButtonTwo = function() {
      return buttons_[1];
    };

    this.startExclusiveMode = function(title, buttonOne, buttonTwo) {
      title_ = title;
      buttons_ = [buttonOne, buttonTwo];
      angular.element('#pulldown-menu').collapse('hide');
      angular.element('#exclusive-mode-container').collapse('show');
    };

    this.endExclusiveMode = function() {
      title_ = '';
      buttons_ = [];
      angular.element('#pulldown-menu').collapse('show');
      angular.element('#exclusive-mode-container').collapse('hide');
    };
  });
}());
