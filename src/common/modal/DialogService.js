(function() {
  var module = angular.module('loom_dialog_service', []);

  var rootScope_;
  var modal_;
  var q_;
  var numModals = 0;

  module.provider('dialogService', function() {
    this.$get = function($rootScope, $modal, $q) {
      rootScope_ = $rootScope;
      modal_ = $modal;
      q_ = $q;
      $(document).keydown(function(objEvent) {
        if (objEvent.keyCode == 9 && numModals > 0) {  //tab pressed
          objEvent.preventDefault(); // stops its action
        }
      });
      return this;
    };

    this.open = function(title, message, buttons, closeButton, type) {
      if (!goog.isDefAndNotNull(type)) {
        type = 'dialog-default';
      }
      if (!goog.isDefAndNotNull(closeButton)) {
        closeButton = true;
      }
      if (!goog.isDefAndNotNull(buttons)) {
        buttons = [];
        if (closeButton === false) {
          closeButton = true;
          console.warn('Tried to make unclosable dialog! No buttons and hidden close button.', title, message);
        }
      }
      var clickedButton = null;
      var deferredPromise = q_.defer();
      var modalScope = rootScope_.$new();
      modalScope.dialogTitle = title;
      modalScope.dialogContent = message;
      modalScope.modalOffset = numModals * 20;
      modalScope.type = type;
      modalScope.buttons = buttons;
      modalScope.closeButton = closeButton;
      modalScope.buttonClick = function(button) {
        clickedButton = button;
        modalInstance.close(clickedButton);
      };

      var modalInstance = modal_.open({
        template: '<div loom-dialog></div>',
        scope: modalScope,
        backdrop: 'static',
        keyboard: false
      });

      numModals = numModals + 1;

      modalInstance.result.then(function() {
        numModals -= 1;
        deferredPromise.resolve(clickedButton);
      }, function(reject) {
        deferredPromise.reject(reject);
      });

      return deferredPromise.promise;
    };

    this.warn = function(title, message, buttons, closeButton) {
      return this.open(title, message, buttons, closeButton, 'dialog-warning');
    };

    this.error = function(title, message, buttons, closeButton) {
      return this.open(title, message, buttons, closeButton, 'dialog-error');
    };
  });

}());
