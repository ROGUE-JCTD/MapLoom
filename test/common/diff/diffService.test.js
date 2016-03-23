describe('DiffService', function(){
  beforeEach(module('MapLoom'));
  beforeEach(module('loom_diff_service'));

  beforeEach(inject(function(_diffService_, _mapService_){
    diffService = _diffService_;
    mapService = _mapService_;
    repoId = '9726b5d4-95de-43e3-ae9c-9ff59a43a737';

    mockLayer = {
      get: function(type){
        if (type === 'metadata'){
          return {
            nativeName: 'incidentes_od3',
            geogigStore: repoId
          }
        }
      }
    }

    modifiedChange = { 
      change: "MODIFIED",
      crs: "EPSG:4326",
      geometry: "POINT (-81.50724532541271 27.472059426243238)",
      id: "incidentes_od3/fid--4277d16a_14e8c4d9628_-7ffd"
    };

  }));

  it('addChangeFeatureToCorrectChangeArray should push modified change to modified array.', function(){
    var expectedResult;

    diffService.addChangeFeatureToCorrectChangeArray(modifiedChange, 'mockLayer');
    diffService.modifies.forEach(function(modifiedFeature) {
      if (modifiedFeature === 'mockLayer'){
        expectedResult = true;
      }
    });
    expect(expectedResult).toBe(true);
  })
  
  it('createOlFeatureBasedOnChange should return a valid OpenLayers feature object.', function(){
    var diffLayer = new ol.layer.Vector({
      source: new ol.source.Vector({
        parser: null
      })
    });
    var validationFeature;
    var olChangeFeature = diffService.createOlFeatureBasedOnChange(modifiedChange, repoId);
    diffLayer.getSource().addFeature(olChangeFeature);
    diffLayer.getSource().forEachFeature(function(iterFeature){
      if (iterFeature === olChangeFeature) {
        validationFeature = iterFeature;
      }
    })
    expect(olChangeFeature).toBe(validationFeature);
  })

  it('findChangeLayer should return the map layer to which the change object belongs.', function(){
    var testLayer = diffService.findChangeLayer(modifiedChange, repoId, [mockLayer]);
    expect(testLayer).toBe(mockLayer);
  })

});