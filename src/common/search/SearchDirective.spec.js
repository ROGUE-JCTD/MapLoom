describe('SearchDirective', function() {
  var element, scope, compiledElement, configService, searchService;
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_search'));
  beforeEach(module('search/partial/search.tpl.html'));

  beforeEach(inject(function($rootScope, $compile, _configService_) {
    scope = $rootScope.$new();
    element = angular.element('<div><div class="loom-search"></div></div>');
    compiledElement = $compile(element)(scope);
    scope.$digest();
    configService = _configService_;
  }));

  describe('isExpanded', function() {
    it('checks if this result should be expanded', function() {
      element.scope().searchResults[0] = {};
      // should still work if it doesn't have the member and return false
      expect(element.scope().isExpanded(element.scope().searchResults[0])).toBe(false);
      // member becomes false after first toggle
      element.scope().toggleOpen(element.scope().searchResults[0]);
      expect(element.scope().isExpanded(element.scope().searchResults[0])).toBe(false);
      // member becomes true after second toggle
      element.scope().toggleOpen(element.scope().searchResults[0]);
      expect(element.scope().isExpanded(element.scope().searchResults[0])).toBe(true);
    });
  });

  describe('searchExpand / collapse', function() {
    it('should modify div element to collapse or expand when searchExpanded is toggled', function() {
      // should default to false / collapsed
      expect(element.scope().searchExpanded).toBe(false);
      expect(element.scope().getClassSearchExpanded()).toBe('collapse');

      element.scope().searchExpanded = true;
      expect(element.scope().searchExpanded).toBe(true);
      expect(element.scope().getClassSearchExpanded()).toBe('in');

      element.scope().searchExpanded = false;
      expect(element.scope().searchExpanded).toBe(false);
      expect(element.scope().getClassSearchExpanded()).toBe('collapse');
    });
  });
});

