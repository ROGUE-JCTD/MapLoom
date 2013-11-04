(function() {
  var module = angular.module('loom_sync_service', []);

  // Private Variables
  var synchronizationLinks_ = [];
  var nextLinkId_ = 0;
  var service_, dialogService_, rootScope_ = null;
  module.provider('synchronizationService', function() {
    this.$get = function($rootScope, dialogService) {
      dialogService_ = dialogService;
      service_ = this;
      rootScope_ = $rootScope;
      $rootScope.$on('repoRemoved', function(event, repo) {
        goog.array.forEach(synchronizationLinks_, function(link) {
          if (link.getRepo().id === repo.id) {
            service_.removeLink(link.id);
          }
        });
      });
      return this;
    };

    this.getLinks = function() {
      return synchronizationLinks_;
    };

    this.loadLink = function(index) {
      rootScope_.$broadcast('loadLink', synchronizationLinks_[index]);
    };

    this.addLink = function(link) {
      for (var index = 0; index < synchronizationLinks_.length; index++) {
        if (synchronizationLinks_[index].equals(link)) {
          dialogService_.open('Add Sync', 'This link already exists', ['OK'], false);
          return;
        }
      }
      link.id = nextLinkId_;
      nextLinkId_++;
      synchronizationLinks_.push(link);
    };

    this.removeLink = function(id) {
      var index = -1, i;
      for (i = 0; i < synchronizationLinks_.length; i = i + 1) {
        if (synchronizationLinks_[i].id === id) {
          index = i;
        }
      }
      if (index > -1) {
        synchronizationLinks_.splice(index, 1);
      }
    };
  });

}());
