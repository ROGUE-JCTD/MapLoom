(function() {
  var module = angular.module('loom_remote_service', []);

  var q_;
  var translate_;
  var rootScope_;
  var http_;
  var service_;
  var dialogService_;
  var geogigService_;
  var synchronizationService_;

  module.provider('remoteService', function() {

    this.remoteName = null;
    this.remoteURL = null;
    this.remoteUsername = '';
    this.remotePassword = '';
    this.selectedRepo = null;
    this.selectedRemote = null;
    this.selectedText = '';
    this.editing = false;
    this.verificationResult = null;
    this.selectedRepoInitialCommit = null;

    this.$get = function($rootScope, $http, $q, $translate, dialogService, geogigService, synchronizationService) {
      q_ = $q;
      rootScope_ = $rootScope;
      translate_ = $translate;
      http_ = $http;
      service_ = this;
      dialogService_ = dialogService;
      geogigService_ = geogigService;
      synchronizationService_ = synchronizationService;

      service_.selectedText = '*' + $translate.instant('new_remote');

      return this;
    };

    var resetForm = function() {
      service_.remoteName = null;
      service_.remoteURL = null;
      service_.remoteUsername = '';
      service_.remotePassword = '';
      if (goog.isDefAndNotNull(service_.selectedRemote)) {
        service_.remoteName = service_.selectedRemote.name;
        service_.remoteURL = service_.selectedRemote.url;
        if (goog.isDefAndNotNull(service_.selectedRemote.username)) {
          service_.remoteUsername = service_.selectedRemote.username;
          service_.remotePassword = '********';
        }
      }
    };

    var checkCompatiblity = function(url, result) {
      var config = {headers: {}};
      if (goog.isDefAndNotNull(service_.remoteUsername)) {
        config.headers['Authorization'] = 'Basic ' +
            $.base64.encode(service_.remoteUsername + ':' + service_.remotePassword);
      }
      http_.get(url + '/log?returnRange=true&output_format=JSON', config).then(function(logInfo) {
        if (logInfo.data.response.success === true) {
          if (logInfo.data.response.sinceCommit.id == service_.selectedRepoInitialCommit) {
            result.resolve(url);
          } else {
            result.reject(translate_.instant('repo_not_compatible'));
          }
        } else {
          result.reject(logInfo.data.response.error);
        }
      }, function(reject) {
        result.reject(translate_.instant('not_a_repo'));
      });
    };

    this.reset = function() {
      this.selectedRepo = null;
      this.selectedRepoInitialCommit = null;
      this.selectedRemote = null;
      this.selectedText = '*' + translate_.instant('new_remote');
      this.editing = false;
      resetForm();
    };

    this.selectRemote = function(remote) {
      if (remote === null) {
        this.selectedText = '*' + translate_.instant('new_remote');
      } else {
        this.selectedText = remote.name;
      }
      this.selectedRemote = remote;
      resetForm();
    };

    this.removeRemote = function() {
      dialogService_.warn(translate_.instant('remote'), translate_.instant('remote_remove'),
          [translate_.instant('yes_btn'), translate_.instant('no_btn')], false).then(function(button) {
        switch (button) {
          case 0:
            var options = new GeoGigRemoteOptions();
            options.remoteName = service_.selectedRemote.name;
            options.remove = true;
            var result = q_.defer();
            geogigService_.command(service_.selectedRepo.id, 'remote', options).then(function() {
              geogigService_.loadRemotesAndBranches(service_.selectedRepo, result);
              synchronizationService_.remoteRemoved(service_.selectedRepo, service_.selectedRemote);
              service_.selectRemote(null);
            });
            break;
        }
      });
    };

    this.addRemote = function(url, options, result) {
      if (!goog.isDefAndNotNull(options.remoteName)) {
        options.remoteName = service_.remoteName;
      }
      options.remoteURL = url;
      if (service_.remoteUsername !== '') {
        options.username = service_.remoteUsername;
      }
      if (service_.remotePassword !== '') {
        options.password = service_.remotePassword;
      }
      var remoteResult = q_.defer();
      geogigService_.command(service_.selectedRepo.id, 'remote', options).then(function(response) {
        var fetchOptions = new GeoGigFetchOptions();
        fetchOptions.remote = service_.remoteName;
        var successMessage = translate_.instant('remote_add_success', {value: service_.remoteName});
        if (service_.editing) {
          service_.selectedText = service_.remoteName;
          service_.remoteURL = url;
          successMessage = translate_.instant('remote_edit_success', {value: service_.remoteName});
        }
        geogigService_.command(service_.selectedRepo.id, 'fetch', fetchOptions).then(function() {
          geogigService_.loadRemotesAndBranches(service_.selectedRepo, remoteResult);
          remoteResult.promise.then(function(repo) {
            for (var index = 0; index < repo.remotes.length; index++) {
              if (repo.remotes[index].name === service_.remoteName) {
                repo.remotes[index].active = true;
                rootScope_.$broadcast('remoteAdded', repo, service_.remoteName);
              }
            }
            dialogService_.open(translate_.instant('remote'), successMessage, [translate_.instant('btn_ok')], false);
            result.resolve();
            if (!service_.editing) {
              resetForm();
            } else {
              service_.selectedRemote.name = service_.remoteName;
              service_.selectedRemote.url = service_.remoteURL;
              service_.selectedRemote.username = service_.remoteUsername;
              service_.selectedRemote.password = service_.remotePassword;
            }
          });
        }, function(error) {
          geogigService_.loadRemotesAndBranches(service_.selectedRepo, remoteResult);
          result.resolve();
          var message = translate_.instant('fetch_error');
          if (error.status == '408' || error.status == '504') {
            message = translate_.instant('fetch_timeout');
          }
          dialogService_.error(translate_.instant('fetch'), message,
              [translate_.instant('btn_ok')], false);
          resetForm();
        });
      }, function(error) {
        if (error === 'REMOTE_ALREADY_EXISTS') {
          error = translate_.instant('remote_already_exists');
        } else if (service_.editing) {
          error = translate_.instant('remote_edit_error');
        } else {
          error = translate_.instant('remote_add_error');
        }
        dialogService_.error(translate_.instant('remote'), error,
            [translate_.instant('btn_ok')], false);
        result.resolve();
        resetForm();
      });
    };

    this.startEditing = function() {
      this.editing = true;
      this.remotePassword = '';
    };

    this.finishRemoteOperation = function(save, result) {
      if (save) {
        var options = new GeoGigRemoteOptions();
        if (service_.editing) {
          options.update = true;
          options.newName = service_.remoteName;
          options.remoteName = service_.selectedRemote.name;
        }
        var url = urlRemoveTrailingSlash(service_.remoteURL);
        service_.verificationResult = q_.defer();
        var config = {headers: {'Accept': 'text/json'}};
        if (goog.isDefAndNotNull(service_.remoteUsername)) {
          config.headers['Authorization'] = 'Basic ' +
              $.base64.encode(service_.remoteUsername + ':' + service_.remotePassword);
        }
        http_.get(url + '.json', config).then(function(response) {
          if (!goog.isDefAndNotNull(response.data.repository)) {
            checkCompatiblity(url, service_.verificationResult);
          } else {
            var compatibilityResult = q_.defer();
            checkCompatiblity(url, compatibilityResult);
            compatibilityResult.promise.then(function(url) {
              service_.verificationResult.resolve(url);
            }, function() {
              service_.verificationResult.reject(translate_.instant('no_compatible_repos'));
            });
          }
        }, function(error) {
          // There was a problem connecting to the endpoint
          if (error.status == '406' || error.status == '404') {
            checkCompatiblity(url, service_.verificationResult);
          } else {
            service_.verificationResult.reject(translate_.instant('could_not_connect'));
          }
        });

        service_.verificationResult.promise.then(function(url) {
          service_.addRemote(url, options, result);
          service_.verificationResult = null;
        }, function(error) {
          service_.verificationResult = null;
          dialogService_.error(translate_.instant('remote'), error, [translate_.instant('btn_ok')], false);
          result.resolve();
          service_.editing = false;
        });
      } else {
        resetForm();
        service_.editing = false;
      }
    };
  });
}());
