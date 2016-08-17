(function() {
  var module = angular.module('loom_media_service', ['ngSanitize']);
  var service_ = null;
  var mediaHandlers_ = null;
  var q_ = null;
  var noembedProviders_ = null;


  //ALERT: ANGULARJS WHITELIST IS BULL****. The regex objects you provide get altered in various ways by angular upon
  //creation of the whitelist. 1st it adds start and end anchor tokens to the regex, and then it ignores and flags you
  //may have set for regex. This means all regex must be valid without use of case insensitivity flag (which sucks).
  module.config(function($sceDelegateProvider) {
    $sceDelegateProvider.resourceUrlWhitelist([
      // Allow same origin resource loads.
      'self',
      new RegExp(/https?:\/\/.*\.flickr\.com\/photos\/.*/),
      new RegExp(/https?:\/\/flic\.kr\/p\/.*/),
      new RegExp(/https?:\/\/instagram\.com\/p\/.*/),
      new RegExp(/https?:\/\/instagr\.am\/p\/.*/),
      new RegExp(/https?:\/\/vine\.co\/v\/.*/),
      new RegExp(/https?:\/\/(?:www\.)?vimeo\.com\/.+/),
      new RegExp(/https?:\/\/((?:www\.)|(?:pic\.)?)twitter\.com\/.*/),
      new RegExp(/https?:\/\/(?:w{3}\.)?(?:youtu\.be\/|youtube(?:-nocookie)?\.com).+/im),
      new RegExp(/https?:\/\/(w{3}\.)?soundcloud\.com\/.+/im),
      new RegExp(/https?:\/\/(?:((?:m)\.)|((?:www)\.)|((?:i)\.))?imgur\.com\/?.+/im)
    ]);

  });

  module.provider('mediaService', function() {

    this.$get = function($rootScope, $http, $translate, $q) {
      http_ = $http;
      translate_ = $translate;
      q_ = $q;
      service_ = this;

      http_.jsonp('https://noembed.com/providers?callback=JSON_CALLBACK', {
        headers: {
          'Content-Type': 'application/json'
        }
      }).success(function(result) {
        noembedProviders_ = result;
      });

      mediaHandlers_ = service_.configureDefaultHandlers();

      return service_;
    };

    this.isNOEmbedProvided = function(url) {
      for (var iProvider = 0; iProvider < noembedProviders_.length; iProvider += 1) {
        var provider = noembedProviders_[iProvider];
        for (var iUrlScheme = 0; iUrlScheme < provider.patterns.length; iUrlScheme += 1) {
          var regExp = new RegExp(provider.patterns[iUrlScheme], 'i');
          if (url.match(regExp) !== null) {
            return true;
          }
        }
      }
      return false;
    };

    this.configureDefaultHandlers = function() {

      var defaultHandlers = [
        //{name: 'youtube', regex: /https?:\/\/(?:[0-9A-Z-]+\.)?(?:youtu\.be\/|youtube(?:-nocookie)?\.com\S*?[^\w\s-])/i, callback: embed_youtube},
        {name: 'imgur', regex: /(https?:\/\/(\w+\.)?imgur\.com)/i, callback: embed_imgur}
      ];

      return defaultHandlers;
    };

    this.isUrl = function(str) {
      if (!/^(f|ht)tps?:\/\//i.test(str)) {
        return false;
      }
      return true;
    };

    this.getEmbedContent = function(url, embed_params) {

      var unsafeReturn = '<a href="' + url + '"> Unable to Embed Content </a>';

      //Check to see if we have a specialized handler first for this site
      for (var iHandler = 0; iHandler < mediaHandlers_.length; iHandler += 1) {
        var testHandler = mediaHandlers_[iHandler];
        if (testHandler.regex.test(url)) {
          return testHandler.callback(url, embed_params);
        }
      }

      //Check and see if the embed content is handled through the noembed service
      if (service_.isNOEmbedProvided(url) !== null) {
        return noembed_handler(url, embed_params);
      }

      //Unable to embed allowed content. Return a link to content.
      return unsafeReturn;
    };

    //Handler callbacks
    function getNOEmbedRequestUrl(url, params) {
      var api_url = 'https://noembed.com/embed?url=' + url + '&callback=JSON_CALLBACK',
          qs = '',
          i;

      for (i in params) {
        if (params[i] !== null) {
          qs += '&' + encodeURIComponent(i) + '=' + params[i];
        }
      }

      api_url += qs;

      return api_url;
    }

    function noembed_handler(url, embed_params) {

      var response = q_.defer();

      var request_url = getNOEmbedRequestUrl(url, embed_params);

      http_.jsonp(request_url, {
        headers: {
          'Content-Type': 'application/json'
        }
      }).success(function(result) {
        response.resolve(result.html);
      });

      return response.promise;

    }

    function embed_imgur(url, embed_params) {

      var response = q_.defer();

      var regex = /(https?:\/\/(\w+\.)?imgur\.com)/ig;

      var matches = url.match(regex);

      var embed = '';
      if (matches.length > 1) {
        //dealing with a basic image link from something like i.imgur.blah.png
        embed = '<iframe src="' + url + '" width="' + embed_params.maxwidth + '" height="' + embed_params.maxheight + '"></iframe>';
      } else {
        //dealing with link to post or album
        var id_regex = /https?:\/\/imgur\.com\/(?:\w+)\/?(.*?)(?:[#\/].*|$)/i;
        embed = url.replace(id_regex,
            '<blockquote class="imgur-embed-pub" lang="en" data-id="a/$1"></blockquote><script async src="//s.imgur.com/min/embed.js" charset="utf-8"></script>');
      }

      response.resolve(embed);
      return response.promise;

    }

  });

})();
