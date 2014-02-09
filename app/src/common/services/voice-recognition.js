/**
 * common.services.VoiceRecognition Module
 *
 * Description
 */
angular.module('common.services.VoiceRecognition', [])
  .service('VoiceRecognition', [

    '$q',

    function($q) {
      var VoiceRecognition = function() {}

      var SpeechRecognition = webkitSpeechRecognition;

      var recognition = new SpeechRecognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en";



      VoiceRecognition.start = function(scope, onResult, onProgress, onError) {

        recognition.onresult = function(e) {
          for (var i = e.resultIndex; i < e.results.length; ++i) {
            if (e.results[i].isFinal) {
              scope.$apply(function() {
                onResult(e.results[i][0].transcript);
              });
            }else{
              scope.$apply(function() {
                onProgress(e.results[i][0].transcript);
              });
            }
          }
        };

        recognition.onend = recognition.start;

        recognition.onerror = function() {
          scope.$apply(function() {
            onError();
          });
        };
        recognition.start();
      };

      VoiceRecognition.stop = function() {
        recognition.stop();
      };



      return VoiceRecognition;
    }

  ]);