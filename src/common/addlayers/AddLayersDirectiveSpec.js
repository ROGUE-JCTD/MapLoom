describe('StoryLegendDirective', function() {
  var element, scope, compiledElement;
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_addlayers'));
  beforeEach(module('addlayers/partials/addlayers.tpl.html'));

  beforeEach(inject(function($rootScope, $compile, $templateCache) {
    scope = $rootScope.$new();
    element = angular.element('<div loom-addlayers></div>');
    compiledElement = $compile(element)(scope);
    scope.$digest();
  }));
  describe('default search', function() {
    it('changes the filterOptions', function() {
      compiledElement.find('ul.nav-tabs li:nth-child(2) a').click();
      compiledElement.find('ul.nav-tabs li:nth-child(1) a').click();
      expect(compiledElement.scope().filterOptions).toEqual(jasmine.objectContaining({
        owner: null
      }));
    });
  });
  describe('search users uploads', function() {
    it('changes the filterOptions', function() {
      compiledElement.find('ul.nav-tabs li:nth-child(2) a').click();
      expect(compiledElement.scope().filterOptions).toEqual(jasmine.objectContaining({
        owner: true
      }));
    });
  });
  describe('search users favorites', function() {
    it('changes the filterOptions', function() {
      compiledElement.find('ul.nav-tabs li:nth-child(3) a').click();
      expect(compiledElement.scope().filterOptions).toEqual(jasmine.objectContaining({
        favorites: null
      }));
    });
  });
  describe('#resetText', function() {
    it('restes text in the filterOptions', function() {
      compiledElement.scope().filterOptions.text = 'Ocean Beach';
      compiledElement.scope().resetText();
      expect(compiledElement.scope().filterOptions).toEqual(jasmine.objectContaining({
        text: null
      }));
    });
  });
  describe('#resetOwner', function() {
    it('restes text in the filterOptions', function() {
      compiledElement.scope().filterOptions.owner = 'Djikstra';
      compiledElement.scope().resetOwner();
      expect(compiledElement.scope().filterOptions).toEqual(jasmine.objectContaining({
        owner: null
      }));
    });
  });
});
