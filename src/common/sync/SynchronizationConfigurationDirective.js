(function() {

  var module = angular.module('loom_syncconfig_directive', []);

  module.directive('loomSyncconfig',
      function($q, geogitService, $translate) {
        return {
          templateUrl: 'sync/partials/syncconfig.tpl.html',
          link: function(scope) {
            scope.geogitService = geogitService;

            angular.element('#remote-name')[0].attributes.placeholder.value = $translate('repo_name');
            angular.element('#remoteUsername')[0].attributes.placeholder.value = $translate('repo_username');
            angular.element('#remotePassword')[0].attributes.placeholder.value = $translate('repo_password');

            var reset = function() {
              scope.selectedRepo = null;
              scope.selectedRemote = null;
              scope.selectedText = '*New Remote';
              scope.remoteName = null;
              scope.remoteURL = null;
              scope.remoteUsername = '';
              scope.remotePassword = '';
            };
            reset();
            scope.selectRemote = function(remote) {
              if (remote === null) {
                scope.selectedText = '*New Remote';
              } else {
                scope.selectedText = remote.name;
              }
              scope.selectedRemote = remote;
            };
            scope.addRemote = function(name, url, username, password) {
              var index = url.lastIndexOf('/') + 1;
              var info = url.slice(index);
              var splitinfo = info.split(':');
              var temp = encodeURIComponent(encodeURIComponent(splitinfo[0])) + ':' +
                  encodeURIComponent(encodeURIComponent(splitinfo[1]));
              url = url.replace(info, temp);
              var options = new GeoGitRemoteOptions();
              options.remoteName = name;
              options.remoteURL = url;
              if (username !== '') {
                options.username = username;
              }
              if (password !== '') {
                options.password = password;
              }
              var result = $q.defer();
              geogitService.command(scope.selectedRepo.id, 'remote', options).then(function() {
                var fetchOptions = new GeoGitFetchOptions();
                fetchOptions.remote = name;
                geogitService.command(scope.selectedRepo.id, 'fetch', fetchOptions).then(function() {
                  geogitService.loadRemotesAndBranches(scope.selectedRepo, result);
                  result.promise.then(function(repo) {
                    for (var index = 0; index < repo.remotes.length; index++) {
                      if (repo.remotes[index].name === name) {
                        repo.remotes[index].active = true;
                        scope.$broadcast('remoteAdded', repo);
                      }
                    }
                  });
                }, function() {
                  geogitService.loadRemotesAndBranches(scope.selectedRepo, result);
                });
              });
            };
            scope.removeRemote = function(remote) {
              var options = new GeoGitRemoteOptions();
              options.remoteName = remote.name;
              options.remove = true;
              var result = $q.defer();
              geogitService.command(scope.selectedRepo.id, 'remote', options).then(function() {
                geogitService.loadRemotesAndBranches(scope.selectedRepo, result);
                scope.selectedRemote = null;
                scope.selectedText = '*New Remote';
              });
            };

            scope.$on('repoRemoved', reset);
          }
        };
      }
  );
})();
