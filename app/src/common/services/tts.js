/**
 * common.services.TTS Module
 *
 * Description
 */
angular.module('common.services.TTS', [])
  .service('TTS', [

    '$q',
    '$document',

    function($q, $document) {
      var TTS = function() {}
      var $el = $('<audio autoplay>');
      var el;
      TTS.init = function(){
        $($document.body).append($el);
        el = $el[0];
      };
      TTS.stop = function(){
        el.pause();
      }

      TTS.say = function(text){
        console.log('Common::TTS::say ' + text);
        var url = "https://foo.bar.baz:3001/tts/" + encodeURIComponent(text);
        el.src = url;
        el.play();
      };
      window.say = TTS.say;
      TTS.init();

      return TTS;
    }

  ]);