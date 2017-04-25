describe('SearchDirective', function() {
  var element, scope, compiledElement, configService, searchService;
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_search'));
  beforeEach(module('search/partial/search.tpl.html'));

  beforeEach(inject(function($rootScope, $compile, $templateCache, _configService_) {
    scope = $rootScope.$new();
    element = angular.element('<div loom-search></div>');
    compiledElement = $compile(element)(scope);
    scope.$digest();
    configService = _configService_;
  }));

  describe('isExpanded', function() {
    it('checks if a DOM element is expanded', function() {
      var mock_expanded = $("<div>", {"class": "in cool"});
      var mock_collapsed = $("<div>", {"class": "collapsed"});
      // Why does it think the scope is undefined?
      console.info(compiledElement.scope());
      expect(compiledElement.scope().isExpanded(mock_expanded)).toBe(true);
      expect(compiledElement.scope().isExpanded(mock_collapsed)).toBe(false);
    });
  });
});