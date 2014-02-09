/**
 * hal.controllers.main Module
 *
 * Description
 */
angular.module('hal.controllers.main', []).controller('hal.controllers.main', [

  '$scope',
  '$sce',
  'VoiceRecognition',
  'WolframAlpha',

  function($scope, $sce, VoiceRecognition, WolframAlpha) {
    $scope.results = [];
    $scope.message = 'Hello.'



    $scope.getSpeechResponse = function(text){
      if(text){
        var url = "http://tts-api.com/tts.mp3?q=" + encodeURIComponent(text);
        return $sce.trustAsResourceUrl(url);
      }
    }

    var addResult = function(result) {
      $scope.results.unshift(result);
    }

    var onResult = function(result) {
      console.log('Asking...', result);
      addResult('...');
      query(result)
    };

    var onError = function() {
      console.error(arguments);
    }

    VoiceRecognition.start($scope, onResult, onError);

    var query = function(query) {
      WolframAlpha.query(query)
        .then(function(answer) {
          console.log('Answer...', answer.result);
          addResult(answer.result);
        })
    }

  }

]);