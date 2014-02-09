/**
 * hal.controllers.main Module
 *
 * Description
 */
angular.module('hal.controllers.main', []).controller('hal.controllers.main', [

  '$scope',
  '$timeout',
  'VoiceRecognition',
  'WolframAlpha',
  'TTS',

  function($scope, $timeout, VoiceRecognition, WolframAlpha, TTS) {
    $scope.message = 'Hello.'
    $scope.isTalking = false;


    var updateMessage = function(message){
      $scope.message = message;
    }

    var mapVoiceCommands = function(result){

      // check if the comman is intentional
      var commandPattern = /^(okay|ok|tell\sme)\s/gi
      result = result.trim().toLowerCase();

      if ( result.match(commandPattern) ) {
        result = result.replace(commandPattern, '').trim();
      }else{
        $scope.isTalking = false;
        return;
      }

      console.log('Main::accepted', result);



      if (result.split(' ')[0].toLowerCase().trim() === 'say') {
        TTS.say(
            result.split(' ')
            .splice(1)
            .join(' ')
          );
        $scope.isTalking = false;
      }else if(result.toLowerCase() === 'who is moses'){
        TTS.say('Mose Adan is an Afro Viking with very weird sense of humour. Please don\'t tell him that I said that.' );
        $scope.isTalking = false;
      }else{
        askWolframAlpha(result)
      }
    };

    // TTS.say('Hello, how can I help you?');

    var addVoiceAnswer = function(result) {
      $scope.isTalking = false;
      TTS.say(result);
      updateMessage(result);
    }

    var onWolframAnswerReceived = function(answer){
      console.log('Answer... ' + answer.result, answer.meta);
      var answerText = 'This is what I\'ve got.';
      if (answer.meta && answer.meta._error === 'false' && answer.meta._success === 'true') {
        _.map(answer.meta.pod, function(pod){
            answerText += pod.subpod.plaintext + '. '
        }).join(' ');
        addVoiceAnswer(answerText);
      }else{
        addVoiceAnswer('I\'m sorry Dave. I\'m afraid I can\'t do that.');
      }
    }

    var onVoiceRecognitionResult = function(result) {
      console.log('Recognized speech...', result);
      updateMessage(result);
      mapVoiceCommands(result);
    };

    var onVoiceRecognitionProgress = function(result) {
      $scope.isTalking = true;
      updateMessage('Listening...');
      console.log('Recognized speech (on progress)...', result);
    };

    var onVoiceRecognitionError = function() {
      $scope.isTalking = false;
      console.error(arguments);
    }

    VoiceRecognition.start($scope, onVoiceRecognitionResult, onVoiceRecognitionProgress, onVoiceRecognitionError);

    var askWolframAlpha = function(query) {
      WolframAlpha
        .query(query)
        .then(onWolframAnswerReceived)
    }

  }

]);