(function() {
  var module = angular.module('loom_exclusive_mode_service', []);

  var title_ = '';
  var buttons_ = [];
  var pulldownService_ = null;

  module.provider('exclusiveModeService', function() {
    this.$get = function(pulldownService) {
      pulldownService_ = pulldownService;
      return this;
    };

    this.button = function(title, callback) {
      return {title: title, callback: callback};
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
      pulldownService_.toggleEnabled = false;
      setTimeout(function() {
        angular.element('#exclusive-mode-container').collapse('show');
      }, 350);
    };

    this.endExclusiveMode = function() {
      angular.element('#exclusive-mode-container').collapse('hide');
      pulldownService_.toggleEnabled = true;
      setTimeout(function() {
        angular.element('#pulldown-menu').collapse('show');
        title_ = '';
        buttons_ = [];
      }, 350);
    };
  });
}());
