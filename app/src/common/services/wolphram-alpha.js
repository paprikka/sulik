/**
* common.services.WolframAlpha Module
*
* Description
*/
angular.module('common.services.WolframAlpha', []).service('WolframAlpha', [


  '$http',
  '$q',


  function ( $http, $q ) {

    var xmlParser = new X2JS();

    var getQueryURL = function(query){
      var queryStr = 
        "//api.wolframalpha.com/v2/query?appid=__WOLFRAM_API_KEY__&input="
          + encodeURIComponent(query)
          + "&format=plaintext";

      return queryStr;
    };

    var WolframAlpha = function(){};

    WolframAlpha.query = function( query ){
      var deferred = $q.defer();

      $http.get( getQueryURL(query) )
        .success(function(res){
          var json = xmlParser.xml_str2json(res);
          var answer = {};

          _.each(json.queryresult.pod, function(pod){
            if (pod._id === 'Result') {
              answer.result = pod.subpod.plaintext;
            };
            if (pod._id.split(':')[0] === 'BasicInformation') {
              answer.basicInformation = pod.subpod.plaintext;
            };
          });

          deferred.resolve(answer);
        }).error(function(err, status){
          deferred.reject(err);
        });

      return deferred.promise;
    }

    return WolframAlpha;
  }

]); 

