angular.module('app', [
  'app.templates',
  'ngRoute',
  'hal'
]).config([

  '$routeProvider',
  '$locationProvider',

  function($routeProvider, $locationProvider) {
    var route = $routeProvider;

    route.when('/hal', {
      controller: 'hal.controllers.main',
      templateUrl: 'hal/partials/views/main.html'
    });

    route.when('/', {
      redirectTo: '/hal'
    });

    route.otherwise('/');

    $locationProvider.html5Mode(false);

  }

]).controller('app.controllers.Application', [

  '$rootScope',

  function ($rootScope) {
    
  }

]);