(function() {

  var module = angular.module('loom_edit_feature_directive', []);

  var propertiesOriginal_ = null;

  module.directive('loomEditfeature',
      function($http) {
        return {
          restrict: 'C',
          templateUrl: 'editfeature/partials/editfeature.tpl.html',
          link: function(scope, element) {
            scope.coordDisplay = settings.coordinateDisplay;
            scope.$on('editFeature', function(event, feature, properties) {

              propertiesOriginal_ = new Array(properties.length);
              goog.array.forEach(properties, function(property, index, arr) {
                propertiesOriginal_[index] = goog.object.clone(property);
              });

              console.log('---- propertiesOriginal_: ', propertiesOriginal_);

              $('#edit-feature-dialog').modal('toggle');
              scope.feature = feature;
              scope.properties = properties;
            });

            var parentModal = element.closest('.modal');
            var closeModal = function(event, element) {
              if (parentModal[0] === element[0]) {
                scope.feature = null;
                scope.properties = null;
                propertiesOriginal_ = null;
              }
            };

            scope.$on('modal-closed', closeModal);

            scope.saveEdits = function(feature, properties) {
              //console.log('---- editFeatureDirective.saveEdits. feature: ', feature);

              var propertyXmlPartial = '';
              goog.array.forEach(properties, function(property, index) {
                if (properties[index][1] !== propertiesOriginal_[index][1]) {
                  console.log('-- property ' + property[0] + ' changed. new: ' , property[1], ', old: ',
                      propertiesOriginal_[index][1]);
                  propertyXmlPartial += '<wfs:Property><wfs:Name>' + property[0] +
                      '</wfs:Name><wfs:Value>' + property[1] + '</wfs:Value></wfs:Property>';
                }
              });

              //TODO: feature type is hardcoded to "feature:incidentes_copeco" below.
              //      once add layer adds it,
              if (propertyXmlPartial !== '') {
                var wfsRequestData = '<?xml version="1.0" encoding="UTF-8"?> ' +
                    '<wfs:Transaction xmlns:wfs="http://www.opengis.net/wfs" ' +
                    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
                    'service="WFS" version="1.1.0" ' +
                    'xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.1.0/wfs.xsd"> ' +
                    '<wfs:Update xmlns:feature="http://www.geonode.org/" typeName="feature:incidentes_copeco">' +
                    propertyXmlPartial +
                    '<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">' +
                    '<ogc:FeatureId fid="' + feature.id + '" />' +
                    '</ogc:Filter>' +
                    '</wfs:Update>' +
                    '</wfs:Transaction>';

                //console.log('---- about to post: ', wfsRequestData);

                $http({
                  url: '/geoserver/wfs/WfsDispatcher',
                  method: 'POST',
                  data: wfsRequestData
                }).success(function(data, status, headers, config) {
                  //console.log('====[ great success. ', data, status, headers, config);
                }).error(function(data, status, headers, config) {
                  console.log('----[ ERROR: wfs-t post failed! ', data, status, headers, config);
                });
              }

              scope.feature = null;
              scope.properties = null;
              propertiesOriginal_ = null;
            };
          }
        };
      }
  );
})();

/*

POST create feature example:
<?xml version="1.0" encoding="UTF-8"?>
<wfs:Transaction xmlns:wfs="http://www.opengis.net/wfs" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" service=
"WFS" version="1.1.0" xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.1.0/wfs.xsd">
  <wfs:Insert>
    <feature:incidentes_copeco xmlns:feature="http://www.geonode.org/">
      <feature:geom>
        <gml:Point xmlns:gml="http://www.opengis.net/gml" srsName="EPSG:900913">
          <gml:pos>-9707843.1544706 1585252.9161019</gml:pos>
        </gml:Point>
      </feature:geom>
      <feature:fecha_hora>2013-11-19T20:39:42.030Z</feature:fecha_hora>
      <feature:comentarios>syrus test remove me</feature:comentarios>
    </feature:incidentes_copeco>
  </wfs:Insert>
</wfs:Transaction>


RESPONSE:
<?xml version="1.0" encoding="UTF-8"?>
  <wfs:TransactionResponse xmlns:wfs="http://www.opengis.net/wfs" xmlns:geonode="http://www.geonode.org/" xmlns:gml=
  "http://www.opengis.net/gml" xmlns:it.geosolutions="http://www.geo-solutions.it" xmlns:ogc=
  "http://www.opengis.net/ogc" xmlns:ows="http://www.opengis.net/ows" xmlns:syrus="com.lmnsolutions.syrus" xmlns:topp=
  "http://www.openplans.org/topp" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi=
  "http://www.w3.org/2001/XMLSchema-instance" version="1.1.0" xsi:schemaLocation=
  "http://www.opengis.net/wfs http://geoserver.rogue.lmnsolutions.com/geoserver/schemas/wfs/1.1.0/wfs.xsd">
    <wfs:TransactionSummary>
      <wfs:totalInserted>1</wfs:totalInserted>
      <wfs:totalUpdated>0</wfs:totalUpdated>
      <wfs:totalDeleted>0</wfs:totalDeleted>
    </wfs:TransactionSummary>
    <wfs:TransactionResults />
    <wfs:InsertResults>
      <wfs:Feature>
        <ogc:FeatureId fid="fid--3c49047d_142671194d2_-7fec" />
      </wfs:Feature>
    </wfs:InsertResults>
  </wfs:TransactionResponse>

  ---------------------------------------

update post:
    <?xml version="1.0" encoding="UTF-8"?>
      <wfs:Transaction xmlns:wfs="http://www.opengis.net/wfs" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       service="WFS" version="1.1.0" xsi:schemaLocation=
       "http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.1.0/wfs.xsd">
        <wfs:Update xmlns:feature="http://www.geonode.org/" typeName="feature:incidentes_copeco">
          <wfs:Property>
            <wfs:Name>comentarios</wfs:Name>
            <wfs:Value>syrus test remove me. updating attribute</wfs:Value>
          </wfs:Property>
          <ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">
            <ogc:FeatureId fid="fid--3c49047d_142671194d2_-7fec" />
          </ogc:Filter>
        </wfs:Update>
      </wfs:Transaction>

update response:
    <?xml version="1.0" encoding="UTF-8"?>
      <wfs:TransactionResponse xmlns:wfs="http://www.opengis.net/wfs" xmlns:geonode=
      "http://www.geonode.org/" xmlns:gml="http://www.opengis.net/gml" xmlns:it.geosolutions=
      "http://www.geo-solutions.it" xmlns:ogc="http://www.opengis.net/ogc" xmlns:ows=
      "http://www.opengis.net/ows" xmlns:syrus="com.lmnsolutions.syrus" xmlns:topp=
      "http://www.openplans.org/topp" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi=
      "http://www.w3.org/2001/XMLSchema-instance" version="1.1.0" xsi:schemaLocation=
      "http://www.opengis.net/wfs http://geoserver.rogue.lmnsolutions.com/geoserver/schemas/wfs/1.1.0/wfs.xsd">
        <wfs:TransactionSummary>
          <wfs:totalInserted>0</wfs:totalInserted>
          <wfs:totalUpdated>1</wfs:totalUpdated>
          <wfs:totalDeleted>0</wfs:totalDeleted>
        </wfs:TransactionSummary>
        <wfs:TransactionResults />
        <wfs:InsertResults>
          <wfs:Feature>
            <ogc:FeatureId fid="none" />
          </wfs:Feature>
        </wfs:InsertResults>
      </wfs:TransactionResponse>
*/
