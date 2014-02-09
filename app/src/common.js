/**
* common Module
*
* VR / basic Wolfram API integration. Child module wrapper.
*/
angular.module('common', [
  'common.services.VoiceRecognition',
  'common.services.WolframAlpha'
]);